// API: GET /api/students - List all students with status, filtering, enrichment
// API: PATCH /api/students - Bulk enable/disable
import { NextRequest, NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph-client";
import { auth } from "@/lib/auth";
import { getActiveSuspensions } from "@/lib/suspension-store";
import { getPolicies } from "@/lib/policy-store";
import { logStudentAction } from "@/lib/audit-store";
import type { StudentUser, ApiResponse } from "@/types";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await getGraphClient();
    const groupId = process.env.STUDENT_GROUP_ID;
    const { searchParams } = new URL(request.url);

    // Filter params
    const filterGroupId = searchParams.get("groupId");
    const filterStatus = searchParams.get("status"); // enabled | disabled | suspended
    const filterPolicyId = searchParams.get("policyId");
    const filterSearch = searchParams.get("search");

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: "STUDENT_GROUP_ID not configured" },
        { status: 500 }
      );
    }

    // Determine which group to query — if filtering by group, use that group
    const queryGroupId = filterGroupId || groupId;

    // Get group members
    const members = await client
      .api(`/groups/${queryGroupId}/members`)
      .select("id,displayName,userPrincipalName,accountEnabled,mail,jobTitle,department")
      .top(999)
      .get();

    // Load suspensions and policies for enrichment
    const [suspensions, policies] = await Promise.all([
      getActiveSuspensions(),
      getPolicies().catch(() => []),
    ]);

    const suspensionMap = new Map(suspensions.map((s) => [s.studentId, s]));
    // Build a map: groupId → policy name
    const groupPolicyMap = new Map<string, string>();
    for (const p of policies) {
      if (p.isActive) {
        for (const gid of p.assignedGroupIds) {
          groupPolicyMap.set(gid, p.name);
        }
      }
    }

    let students: StudentUser[] = (members.value || []).map((m: Record<string, unknown>) => {
      const sid = m.id as string;
      const suspension = suspensionMap.get(sid) ?? null;
      return {
        id: sid,
        displayName: m.displayName as string,
        userPrincipalName: m.userPrincipalName as string,
        accountEnabled: m.accountEnabled as boolean,
        mail: m.mail as string | undefined,
        jobTitle: m.jobTitle as string | undefined,
        department: m.department as string | undefined,
        suspension,
        appliedPolicy: groupPolicyMap.get(queryGroupId) || undefined,
      };
    });

    // Apply server-side filters
    if (filterStatus === "enabled") {
      students = students.filter((s) => s.accountEnabled && !s.suspension);
    } else if (filterStatus === "disabled") {
      students = students.filter((s) => !s.accountEnabled && !s.suspension);
    } else if (filterStatus === "suspended") {
      students = students.filter((s) => !!s.suspension);
    }

    if (filterPolicyId) {
      const policy = policies.find((p) => p.id === filterPolicyId);
      if (policy) {
        // Only show students in groups assigned to this policy
        // (already filtered if filterGroupId matches, otherwise this is a broader filter)
        const policyGroupIds = new Set(policy.assignedGroupIds);
        if (!filterGroupId) {
          // Need to check each student's group membership — query group members per policy group
          const policyStudentIds = new Set<string>();
          for (const pgId of policyGroupIds) {
            try {
              const pgMembers = await client
                .api(`/groups/${pgId}/members`)
                .select("id")
                .top(999)
                .get();
              for (const m of pgMembers.value || []) {
                policyStudentIds.add(m.id as string);
              }
            } catch {
              // Group may not exist
            }
          }
          students = students.filter((s) => policyStudentIds.has(s.id));
        }
      }
    }

    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      students = students.filter(
        (s) =>
          s.displayName.toLowerCase().includes(q) ||
          s.userPrincipalName.toLowerCase().includes(q)
      );
    }

    const response: ApiResponse<StudentUser[]> = { success: true, data: students };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Bulk enable/disable students
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, studentIds } = await request.json();

    if (!action || !["enable", "disable"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Use 'enable' or 'disable'" },
        { status: 400 }
      );
    }

    const client = await getGraphClient();
    const accountEnabled = action === "enable";
    const results: { id: string; success: boolean; error?: string }[] = [];

    // If no specific IDs, apply to whole group
    const ids = studentIds || [];

    if (ids.length === 0) {
      const groupId = process.env.STUDENT_GROUP_ID!;
      const members = await client
        .api(`/groups/${groupId}/members`)
        .select("id")
        .top(999)
        .get();
      ids.push(...(members.value || []).map((m: Record<string, unknown>) => m.id));
    }

    for (const id of ids) {
      try {
        await client.api(`/users/${id}`).update({ accountEnabled });
        results.push({ id, success: true });
      } catch (err) {
        results.push({
          id,
          success: false,
          error: err instanceof Error ? err.message : "Failed",
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    // Audit log
    const performedBy = session.user?.email || session.user?.name || "Unknown";
    await logStudentAction(
      action === "enable" ? "enable" : "disable",
      performedBy,
      `${succeeded} student(s)`,
      `Bulk ${action}: ${succeeded} succeeded, ${failed} failed out of ${results.length}`,
    );

    return NextResponse.json({
      success: true,
      data: {
        action,
        total: results.length,
        succeeded,
        failed,
        results,
      },
    });
  } catch (error) {
    console.error("Error in bulk operation:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
