// API: GET /api/staff — List all staff users (non-student users)
// API: PATCH /api/staff — Bulk operations
import { NextRequest, NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph-client";
import { auth } from "@/lib/auth";
import type { StaffUser, ApiResponse } from "@/types";

// Friendly names for common M365 Education SKUs
const LICENSE_NAMES: Record<string, string> = {
  "94763226-9b3c-4e75-a931-5c89701abe66": "Microsoft 365 A1 for Faculty",
  "78e66a63-337a-4a9a-8959-41c6654dfb56": "Microsoft 365 A3 for Faculty",
  "e97c048c-37a4-45fb-ab50-922fbf07a370": "Microsoft 365 A5 for Faculty",
  "314c4481-f395-4525-be8b-2ec4bb1e9d91": "Microsoft 365 A1 for Students",
  "18250162-5d87-4436-a834-d795c15c80f3": "Microsoft 365 A3 for Students",
  "46c119d4-0379-4a9d-85e4-97c66d3f909e": "Microsoft 365 A5 for Students",
  "dcb1a3ae-b33f-4487-846a-a640262fadf4": "Microsoft 365 Business Basic",
  "05e9a617-0261-4cee-bb44-138d3ef5d965": "Microsoft 365 E3",
  "06ebc4ee-1bb5-47dd-8120-11324bc54e06": "Microsoft 365 E5",
  "4b585984-651b-448a-9e53-3b10f069cf7f": "Office 365 F3",
  "6fd2c87f-b296-42f0-b197-1e91e994b900": "Office 365 E3",
  "c7df2760-2c81-4ef7-b578-5b5392b571df": "Office 365 E5",
  "3b555118-da6a-4418-894f-7df1e2096870": "Microsoft 365 Business Standard",
  "cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46": "Microsoft 365 Business Premium",
  "1f2f344a-700d-42c9-9427-5cea45d4a4d2": "Microsoft Stream",
  "a403ebcc-fae0-4ca2-8c8c-7a907fd6c235": "Power BI (free)",
  "f8a1db68-be16-40ed-86d5-cb42ce701560": "Power BI Pro",
  "061f9ace-7d42-4136-88ac-31dc755f143f": "Intune",
  "efccb6f7-5641-4e0e-bd10-b4976e1bf68e": "Enterprise Mobility + Security E3",
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await getGraphClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const role = searchParams.get("role"); // Teacher, IT-Staff, etc.
    const status = searchParams.get("status"); // enabled, disabled

    const prefix = process.env.GROUP_NAME_PREFIX;
    const studentGroupId = process.env.STUDENT_GROUP_ID;
    const userFields =
      "id,displayName,userPrincipalName,mail,accountEnabled,jobTitle,department,officeLocation,mobilePhone,assignedLicenses,createdDateTime";

    // ── Collect users from managed groups only ──────────────────────
    // If GROUP_NAME_PREFIX is set, only show users who are members or
    // owners of groups matching the prefix. This excludes unrelated
    // tenant accounts (device accounts, shared mailboxes, etc.).

    let graphFilter = "securityEnabled eq true";
    if (prefix) {
      graphFilter += ` and startsWith(displayName,'${prefix}')`;
    }

    const groupsResult = await client
      .api("/groups")
      .header("ConsistencyLevel", "eventual")
      .filter(graphFilter)
      .select("id,displayName")
      .top(200)
      .get();

    const managedGroups: { id: string; displayName: string }[] =
      groupsResult.value || [];

    // Collect unique users from members + owners of each managed group
    const userMap = new Map<string, Record<string, unknown>>();

    for (const group of managedGroups) {
      // Members
      try {
        const members = await client
          .api(`/groups/${group.id}/members`)
          .select(userFields)
          .top(999)
          .get();
        for (const m of members.value || []) {
          if (
            m["@odata.type"] === "#microsoft.graph.user" &&
            !userMap.has(m.id)
          ) {
            userMap.set(m.id, m);
          }
        }
      } catch {
        /* skip unreadable groups */
      }

      // Owners (teachers / admins who manage the group)
      try {
        const owners = await client
          .api(`/groups/${group.id}/owners`)
          .select(userFields)
          .top(200)
          .get();
        for (const o of owners.value || []) {
          if (
            o["@odata.type"] === "#microsoft.graph.user" &&
            !userMap.has(o.id)
          ) {
            userMap.set(o.id, o);
          }
        }
      } catch {
        /* skip */
      }
    }

    // ── Exclude students ────────────────────────────────────────────
    let studentIds = new Set<string>();
    if (studentGroupId) {
      try {
        const students = await client
          .api(`/groups/${studentGroupId}/members`)
          .select("id")
          .top(999)
          .get();
        studentIds = new Set(
          (students.value || []).map((s: { id: string }) => s.id)
        );
      } catch {
        // Group may not exist — proceed without excluding
      }
    }

    // ── Filter & map ────────────────────────────────────────────────
    const staffUsers: StaffUser[] = Array.from(userMap.values())
      .filter((u) => {
        if (studentIds.has(u.id as string)) return false;
        if (search) {
          const q = search.toLowerCase();
          if (
            !(u.displayName as string || "").toLowerCase().includes(q) &&
            !(u.userPrincipalName as string || "").toLowerCase().includes(q)
          )
            return false;
        }
        if (status === "enabled" && u.accountEnabled !== true) return false;
        if (status === "disabled" && u.accountEnabled !== false) return false;
        if (role && u.jobTitle !== role) return false;
        return true;
      })
      .map((u) => ({
        id: u.id as string,
        displayName: u.displayName as string,
        userPrincipalName: u.userPrincipalName as string,
        mail: u.mail as string | undefined,
        accountEnabled: u.accountEnabled as boolean,
        jobTitle: u.jobTitle as string | undefined,
        department: u.department as string | undefined,
        officeLocation: u.officeLocation as string | undefined,
        mobilePhone: u.mobilePhone as string | undefined,
        assignedLicenses: (
          (u.assignedLicenses as Array<{
            skuId: string;
            disabledPlans: string[];
          }>) || []
        ).map((l) => ({
          skuId: l.skuId,
          displayName: LICENSE_NAMES[l.skuId] || l.skuId,
          disabledPlans: l.disabledPlans,
        })),
        createdDateTime: u.createdDateTime as string | undefined,
      }));

    return NextResponse.json({
      success: true,
      data: staffUsers,
    } as ApiResponse<StaffUser[]>);
  } catch (error) {
    console.error("Error fetching staff:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
