// API: /api/students/[id]/groups — Manage a student's group memberships
import { NextResponse } from "next/server";
import { addPendingChange } from "@/lib/group-store";

// POST — Add student to a group (queues as pending change for automation)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    const body = await request.json();
    const { groupId, groupName, reason, requestedBy, studentName } = body;

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: "groupId is required" },
        { status: 400 }
      );
    }

    const change = await addPendingChange({
      studentId,
      studentName: studentName || "Unknown",
      action: "add",
      groupId,
      groupName: groupName || "Unknown",
      reason: reason || "special_group",
      requestedBy: requestedBy || "portal",
    });

    return NextResponse.json({
      success: true,
      data: { message: `Queued: add to ${groupName || groupId}`, change },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

// DELETE — Remove student from a group (queues as pending change)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    const body = await request.json();
    const { groupId, groupName, reason, requestedBy, studentName } = body;

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: "groupId is required" },
        { status: 400 }
      );
    }

    const change = await addPendingChange({
      studentId,
      studentName: studentName || "Unknown",
      action: "remove",
      groupId,
      groupName: groupName || "Unknown",
      reason: reason || "manual",
      requestedBy: requestedBy || "portal",
    });

    return NextResponse.json({
      success: true,
      data: { message: `Queued: remove from ${groupName || groupId}`, change },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
