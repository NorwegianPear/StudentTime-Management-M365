// API: /api/pending-changes — View and create pending group membership changes
import { NextResponse } from "next/server";
import { getPendingChanges, addPendingChange } from "@/lib/group-store";

// GET — list all pending changes (recent first)
export async function GET() {
  try {
    const changes = await getPendingChanges();
    const sorted = changes.sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
    return NextResponse.json({ success: true, data: sorted });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

// POST — queue a new group change
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, studentName, action, groupId, groupName, reason, requestedBy } = body;

    if (!studentId || !action || !groupId) {
      return NextResponse.json(
        { success: false, error: "studentId, action, and groupId are required" },
        { status: 400 }
      );
    }

    if (!["add", "remove"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "action must be 'add' or 'remove'" },
        { status: 400 }
      );
    }

    const change = await addPendingChange({
      studentId,
      studentName: studentName || "Unknown",
      action,
      groupId,
      groupName: groupName || "Unknown",
      reason: reason || "manual",
      requestedBy: requestedBy || "portal",
    });

    return NextResponse.json({ success: true, data: change });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
