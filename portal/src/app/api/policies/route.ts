// API: GET /api/policies — List all policies (auto-cleans stale non-managed groups)
// API: POST /api/policies — Create a new policy
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPolicies, savePolicies, createPolicy } from "@/lib/policy-store";
import { getGraphClient } from "@/lib/graph-client";
import { logPolicyAction } from "@/lib/audit-store";
import { canWrite, getUserRole } from "@/lib/roles";
import type { ApiResponse, SchedulePolicy, CreatePolicyRequest } from "@/types";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const policies = await getPolicies();

    // Auto-cleanup: strip stale group IDs that no longer match managed groups
    const prefix = process.env.GROUP_NAME_PREFIX;
    if (prefix) {
      let dirty = false;
      try {
        const client = await getGraphClient();
        const graphFilter = `securityEnabled eq true and startsWith(displayName,'${prefix}')`;
        const groupsResult = await client
          .api("/groups")
          .header("ConsistencyLevel", "eventual")
          .filter(graphFilter)
          .select("id,displayName")
          .top(200)
          .get();
        const managedIds = new Set<string>(
          (groupsResult.value || []).map((g: { id: string }) => g.id)
        );

        for (const policy of policies) {
          const cleanIds = policy.assignedGroupIds.filter((id) => managedIds.has(id));
          if (cleanIds.length !== policy.assignedGroupIds.length) {
            const managedNameMap = new Map<string, string>(
              (groupsResult.value || []).map((g: { id: string; displayName: string }) => [g.id, g.displayName])
            );
            policy.assignedGroupIds = cleanIds;
            policy.assignedGroupNames = cleanIds.map((id) => managedNameMap.get(id) || id);
            dirty = true;
          }
        }
        if (dirty) {
          await savePolicies(policies);
        }
      } catch {
        // If Graph is unreachable, return policies as-is
      }
    }

    const response: ApiResponse<SchedulePolicy[]> = { success: true, data: policies };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching policies:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const performedBy = session.user?.email || session.user?.name || "unknown";
  if (!canWrite(getUserRole(session.user?.email))) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body: CreatePolicyRequest = await request.json();

    // Validation
    if (!body.name || !body.enableTime || !body.disableTime || !body.daysOfWeek?.length) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: name, enableTime, disableTime, daysOfWeek" },
        { status: 400 }
      );
    }

    // Validate time format
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(body.enableTime) || !timeRegex.test(body.disableTime)) {
      return NextResponse.json(
        { success: false, error: "Invalid time format. Use HH:mm (e.g. 07:55)" },
        { status: 400 }
      );
    }

    const policy = await createPolicy({
      name: body.name,
      description: body.description || "",
      enableTime: body.enableTime,
      disableTime: body.disableTime,
      daysOfWeek: body.daysOfWeek,
      timezone: body.timezone || "W. Europe Standard Time",
      isActive: false,
      createdBy: performedBy,
    });

    // Audit log
    await logPolicyAction(
      "policy_created",
      performedBy,
      `Created policy "${policy.name}" (${policy.enableTime}-${policy.disableTime}, ${policy.daysOfWeek.join(", ")})`
    );

    const response: ApiResponse<SchedulePolicy> = { success: true, data: policy };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating policy:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
