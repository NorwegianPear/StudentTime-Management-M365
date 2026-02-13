// API: GET /api/dashboard - Dashboard stats
import { NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph-client";
import { auth } from "@/lib/auth";
import { getPolicies } from "@/lib/policy-store";
import type { DashboardStats, ApiResponse } from "@/types";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await getGraphClient();
    const groupId = process.env.STUDENT_GROUP_ID;

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: "STUDENT_GROUP_ID not configured" },
        { status: 500 }
      );
    }

    // Get all students in group
    const members = await client
      .api(`/groups/${groupId}/members`)
      .select("id,displayName,accountEnabled")
      .top(999)
      .get();

    const students = members.value || [];
    const enabledCount = students.filter((s: Record<string, unknown>) => s.accountEnabled === true).length;
    const disabledCount = students.filter((s: Record<string, unknown>) => s.accountEnabled === false).length;

    // Get group info
    const group = await client
      .api(`/groups/${groupId}`)
      .select("id,displayName,description")
      .get();

    // Get active policies count
    let activePoliciesCount = 0;
    try {
      const policies = await getPolicies();
      activePoliciesCount = policies.filter((p) => p.isActive).length;
    } catch {
      // Policy store may not exist yet — ignore
    }

    const stats: DashboardStats = {
      totalStudents: students.length,
      enabledStudents: enabledCount,
      disabledStudents: disabledCount,
      activePolicies: activePoliciesCount,
      groups: [
        {
          id: group.id,
          displayName: group.displayName,
          description: group.description,
          memberCount: students.length,
        },
      ],
    };

    const response: ApiResponse<DashboardStats> = { success: true, data: stats };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
