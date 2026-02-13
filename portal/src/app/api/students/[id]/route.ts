// API: PATCH /api/students/[id] - Toggle individual student access
// API: DELETE /api/students/[id] - Disable and remove student from group
import { NextRequest, NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph-client";
import { auth } from "@/lib/auth";
import { logStudentAction } from "@/lib/audit-store";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { accountEnabled } = await request.json();

    if (typeof accountEnabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "accountEnabled must be a boolean" },
        { status: 400 }
      );
    }

    const client = await getGraphClient();

    // Update user account status
    await client.api(`/users/${id}`).update({ accountEnabled });

    // Fetch updated user
    const user = await client
      .api(`/users/${id}`)
      .select("id,displayName,userPrincipalName,accountEnabled")
      .get();

    // Audit log
    const performedBy = session.user?.email || session.user?.name || "Unknown";
    await logStudentAction(
      "manual_toggle",
      performedBy,
      `${user.displayName} (${user.userPrincipalName})`,
      `Account ${accountEnabled ? "enabled" : "disabled"} manually`
    );

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error toggling student:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET individual student details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const client = await getGraphClient();

    const user = await client
      .api(`/users/${id}`)
      .select("id,displayName,userPrincipalName,accountEnabled,mail,jobTitle,department")
      .get();

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Error fetching student:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE: Disable student account and remove from student group
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const client = await getGraphClient();
    const groupId = process.env.STUDENT_GROUP_ID;

    // Get user info for audit
    const user = await client
      .api(`/users/${id}`)
      .select("displayName,userPrincipalName")
      .get();

    // Disable the account first
    await client.api(`/users/${id}`).update({ accountEnabled: false });

    // Remove from student group if configured
    if (groupId) {
      try {
        await client.api(`/groups/${groupId}/members/${id}/$ref`).delete();
      } catch {
        // May not be a member — that's fine
      }
    }

    // Audit log
    const performedBy = session.user?.email || session.user?.name || "Unknown";
    await logStudentAction(
      "student_removed",
      performedBy,
      `${user.displayName} (${user.userPrincipalName})`,
      "Disabled and removed from student group"
    );

    return NextResponse.json({
      success: true,
      data: { id, disabled: true, removedFromGroup: !!groupId },
    });
  } catch (error) {
    console.error("Error deleting student:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
