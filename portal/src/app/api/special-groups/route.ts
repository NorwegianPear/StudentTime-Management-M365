// API: /api/special-groups — CRUD for special/override groups
import { NextResponse } from "next/server";
import {
  getSpecialGroups,
  createSpecialGroup,
} from "@/lib/group-store";
import { getPolicies } from "@/lib/policy-store";
import { logPolicyAction } from "@/lib/audit-store";
import type { SpecialGroup } from "@/types";

// GET — list all special groups with enriched policy names
export async function GET() {
  try {
    const [groups, policies] = await Promise.all([
      getSpecialGroups(),
      getPolicies(),
    ]);

    // Enrich with policy name
    const enriched: SpecialGroup[] = groups.map((g) => {
      const policy = policies.find((p) => p.id === g.policyId);
      return { ...g, policyName: policy?.name ?? "Unknown" };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

// POST — create a new special group
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { groupId, groupName, description, policyId, priority, createdBy } = body;

    if (!groupId || !policyId) {
      return NextResponse.json(
        { success: false, error: "groupId and policyId are required" },
        { status: 400 }
      );
    }

    // Look up policy name
    const policies = await getPolicies();
    const policy = policies.find((p) => p.id === policyId);

    const group = await createSpecialGroup({
      groupId,
      groupName: groupName || "Unnamed Group",
      description: description || "",
      policyId,
      policyName: policy?.name ?? "Unknown",
      priority: priority ?? 10,
      createdBy: createdBy || "portal",
    });

    // Audit log
    await logPolicyAction(
      "special_group_added",
      createdBy || "portal",
      `Special group "${groupName}" created with policy "${policy?.name ?? policyId}"`,
      groupName
    );

    return NextResponse.json({ success: true, data: group });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
