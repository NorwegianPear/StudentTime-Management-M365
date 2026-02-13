// API: POST /api/students/[id]/suspend — Suspend a student with end date
// API: DELETE /api/students/[id]/suspend — Lift suspension early
import { NextRequest, NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph-client";
import { auth } from "@/lib/auth";
import { createSuspension, liftSuspension, getActiveSuspension } from "@/lib/suspension-store";
import { logStudentAction } from "@/lib/audit-store";
import type { ApiResponse, Suspension, SuspendRequest } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = (await request.json()) as SuspendRequest;
    if (!body.reason || !body.endDate) {
      return NextResponse.json(
        { success: false, error: "reason and endDate are required" },
        { status: 400 }
      );
    }

    const endDate = new Date(body.endDate);
    if (endDate <= new Date()) {
      return NextResponse.json(
        { success: false, error: "endDate must be in the future" },
        { status: 400 }
      );
    }

    // Get student info
    const client = await getGraphClient();
    const user = await client
      .api(`/users/${id}`)
      .select("id,displayName,userPrincipalName,accountEnabled")
      .get();

    // Disable the account
    await client.api(`/users/${id}`).update({ accountEnabled: false });

    // Record suspension
    const suspension = await createSuspension({
      studentId: id,
      studentName: user.displayName,
      studentUPN: user.userPrincipalName,
      reason: body.reason,
      startDate: new Date().toISOString(),
      endDate: body.endDate,
      createdBy: session.user?.email || "unknown",
    });

    // Audit log
    const performedBy = session.user?.email || session.user?.name || "unknown";
    await logStudentAction(
      "student_suspended",
      performedBy,
      `${user.displayName} (${user.userPrincipalName})`,
      `Suspended until ${body.endDate}: ${body.reason}`
    );

    const response: ApiResponse<Suspension> = { success: true, data: suspension };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error suspending student:", error);
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
    const client = await getGraphClient();

    // Check there's an active suspension
    const suspension = await getActiveSuspension(id);
    if (!suspension) {
      return NextResponse.json(
        { success: false, error: "No active suspension found for this student" },
        { status: 404 }
      );
    }

    // Re-enable account
    await client.api(`/users/${id}`).update({ accountEnabled: true });

    // Lift suspension record
    await liftSuspension(id);

    // Audit log
    const performedBy = session.user?.email || session.user?.name || "unknown";
    await logStudentAction(
      "student_unsuspended",
      performedBy,
      `${suspension.studentName} (${suspension.studentUPN})`,
      "Suspension lifted early, account re-enabled"
    );

    return NextResponse.json({ success: true, data: { message: "Suspension lifted, account re-enabled" } });
  } catch (error) {
    console.error("Error lifting suspension:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const suspension = await getActiveSuspension(id);
  return NextResponse.json({ success: true, data: suspension });
}
