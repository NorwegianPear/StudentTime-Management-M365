// API: GET /api/groups - List all groups with policy info
import { NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph-client";
import { auth } from "@/lib/auth";
import { getPolicies } from "@/lib/policy-store";
import type { GroupInfo, ApiResponse } from "@/types";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await getGraphClient();

    // Load policies to map group → policy
    const policies = await getPolicies().catch(() => []);
    const groupPolicyMap = new Map<string, { id: string; name: string }>();
    for (const p of policies) {
      if (p.isActive) {
        for (let i = 0; i < p.assignedGroupIds.length; i++) {
          groupPolicyMap.set(p.assignedGroupIds[i], { id: p.id, name: p.name });
        }
      }
    }

    // Get security groups (filter for student-related groups)
    const groups = await client
      .api("/groups")
      .filter("securityEnabled eq true")
      .select("id,displayName,description")
      .top(100)
      .get();

    // Get member counts for each group
    const groupsWithCounts: GroupInfo[] = await Promise.all(
      (groups.value || []).map(async (g: Record<string, unknown>) => {
        const gid = g.id as string;
        const policy = groupPolicyMap.get(gid);
        try {
          const members = await client
            .api(`/groups/${gid}/members/$count`)
            .header("ConsistencyLevel", "eventual")
            .get();
          return {
            id: gid,
            displayName: g.displayName as string,
            description: g.description as string | undefined,
            memberCount: typeof members === "number" ? members : 0,
            policyId: policy?.id,
            policyName: policy?.name,
          };
        } catch {
          return {
            id: gid,
            displayName: g.displayName as string,
            description: g.description as string | undefined,
            memberCount: 0,
            policyId: policy?.id,
            policyName: policy?.name,
          };
        }
      })
    );

    const response: ApiResponse<GroupInfo[]> = { success: true, data: groupsWithCounts };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
