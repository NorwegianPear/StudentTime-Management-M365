// API: GET /api/policies/[id] — Get single policy
// API: PATCH /api/policies/[id] — Update policy (name, times, active, assign groups)
// API: DELETE /api/policies/[id] — Delete policy
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPolicy, updatePolicy, deletePolicy } from "@/lib/policy-store";
import { getGraphClient } from "@/lib/graph-client";
import type { ApiResponse, SchedulePolicy } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const policy = await getPolicy(id);
    if (!policy) {
      return NextResponse.json({ success: false, error: "Policy not found" }, { status: 404 });
    }
    const response: ApiResponse<SchedulePolicy> = { success: true, data: policy };
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();

    // If assigning groups, resolve their display names
    if (body.assignedGroupIds && Array.isArray(body.assignedGroupIds)) {
      try {
        const client = await getGraphClient();
        const names: string[] = [];
        for (const groupId of body.assignedGroupIds) {
          const group = await client.api(`/groups/${groupId}`).select("displayName").get();
          names.push(group.displayName);
        }
        body.assignedGroupNames = names;
      } catch {
        // If Graph fails, keep IDs only
        body.assignedGroupNames = body.assignedGroupIds;
      }
    }

    const updated = await updatePolicy(id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Policy not found" }, { status: 404 });
    }

    // If policy is being activated with assigned groups, apply it now
    if (body.isActive === true && updated.assignedGroupIds.length > 0) {
      await applyPolicy(updated);
    }

    const response: ApiResponse<SchedulePolicy> = { success: true, data: updated };
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const deleted = await deletePolicy(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Policy not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Apply a policy: enable/disable students in assigned groups based on current time
async function applyPolicy(policy: SchedulePolicy) {
  if (!policy.assignedGroupIds.length) return;

  const client = await getGraphClient();
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const currentTime = `${hours}:${minutes}`;

  // Determine if students should be enabled or disabled right now
  const shouldEnable = currentTime >= policy.enableTime && currentTime < policy.disableTime;

  for (const groupId of policy.assignedGroupIds) {
    try {
      const members = await client
        .api(`/groups/${groupId}/members`)
        .select("id")
        .top(999)
        .get();

      for (const member of members.value || []) {
        try {
          await client.api(`/users/${member.id}`).update({ accountEnabled: shouldEnable });
        } catch {
          // skip individual failures
        }
      }
    } catch {
      console.error(`Failed to apply policy to group ${groupId}`);
    }
  }
}
