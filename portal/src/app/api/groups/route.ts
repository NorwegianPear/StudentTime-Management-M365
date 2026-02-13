// API: GET /api/groups - List managed groups with policy info
// Filters to only show relevant groups via GROUP_NAME_PREFIX env var
// and groups referenced in policies/special-groups
import { NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph-client";
import { auth } from "@/lib/auth";
import { getPolicies } from "@/lib/policy-store";
import { getSpecialGroups } from "@/lib/group-store";
import type { GroupInfo, ApiResponse } from "@/types";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await getGraphClient();
    const prefix = process.env.GROUP_NAME_PREFIX; // e.g. "Demo-"
    const studentGroupId = process.env.STUDENT_GROUP_ID;

    // Load policies + special groups to know which group IDs are managed
    const [policies, specialGroups] = await Promise.all([
      getPolicies().catch(() => []),
      getSpecialGroups().catch(() => []),
    ]);

    // Build policy map: groupId → policy info
    const groupPolicyMap = new Map<string, { id: string; name: string }>();
    const policyGroupIds = new Set<string>();
    for (const p of policies) {
      for (const gid of p.assignedGroupIds) {
        policyGroupIds.add(gid);
        if (p.isActive) {
          groupPolicyMap.set(gid, { id: p.id, name: p.name });
        }
      }
    }

    // Collect special group IDs
    const specialGroupIds = new Set(specialGroups.map((sg) => sg.groupId));

    // Also include the main student group itself
    const knownGroupIds = new Set([
      ...policyGroupIds,
      ...specialGroupIds,
      ...(studentGroupId ? [studentGroupId] : []),
    ]);

    // Build Graph API filter — prefer prefix-based filtering on the server side
    let graphFilter = "securityEnabled eq true";
    if (prefix) {
      graphFilter += ` and startsWith(displayName,'${prefix}')`;
    }

    const groups = await client
      .api("/groups")
      .header("ConsistencyLevel", "eventual")
      .filter(graphFilter)
      .select("id,displayName,description")
      .top(200)
      .get();

    const allGroups: Record<string, unknown>[] = groups.value || [];

    // If no prefix set, filter client-side to only show known (managed) groups
    // This prevents showing irrelevant tenant groups like system/sync groups
    let relevantGroups = allGroups;
    if (!prefix) {
      relevantGroups = allGroups.filter(
        (g) => knownGroupIds.has(g.id as string)
      );
    }

    // Get member counts for each group
    const groupsWithCounts: GroupInfo[] = await Promise.all(
      relevantGroups.map(async (g) => {
        const gid = g.id as string;
        const policy = groupPolicyMap.get(gid);
        const isSpecial = specialGroupIds.has(gid);
        try {
          const members = await client
            .api(`/groups/${gid}/members/$count`)
            .header("ConsistencyLevel", "eventual")
            .get();
          return {
            id: gid,
            displayName: g.displayName as string,
            description: (g.description as string | undefined) || (isSpecial ? "Special/override group" : undefined),
            memberCount: typeof members === "number" ? members : 0,
            policyId: policy?.id,
            policyName: policy?.name,
          };
        } catch {
          return {
            id: gid,
            displayName: g.displayName as string,
            description: (g.description as string | undefined) || undefined,
            memberCount: 0,
            policyId: policy?.id,
            policyName: policy?.name,
          };
        }
      })
    );

    // Sort: groups with policies first, then alphabetically
    groupsWithCounts.sort((a, b) => {
      if (a.policyName && !b.policyName) return -1;
      if (!a.policyName && b.policyName) return 1;
      return a.displayName.localeCompare(b.displayName);
    });

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
