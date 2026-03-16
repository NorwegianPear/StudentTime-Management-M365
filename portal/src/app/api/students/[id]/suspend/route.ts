// API: POST /api/students/[id]/suspend — Suspend a student with end date
// API: DELETE /api/students/[id]/suspend — Lift suspension early
//
// Suspensions are written to TWO stores:
//   1. Local suspension-store (portal UI, fast reads)
//   2. Azure Automation Variable "SuspendedStudents" (fallback for runbooks)
// This means Enable-StudentAccess.ps1 and Process-Suspensions.ps1 will honour
// portal-initiated suspensions even if the portal is offline.
import { NextRequest, NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph-client";
import { auth } from "@/lib/auth";
import { createSuspension, liftSuspension, getActiveSuspension } from "@/lib/suspension-store";
import { syncSuspensionCreate, syncSuspensionLift } from "@/lib/automation-client";
import { logStudentAction } from "@/lib/audit-store";
import { canWrite, getUserRole } from "@/lib/roles";
import type { ApiResponse, Suspension, SuspendRequest } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!canWrite(getUserRole(session.user?.email))) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
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

    // Record suspension in local store (portal reads)
    const suspension = await createSuspension({
      studentId: id,
      studentName: user.displayName,
      studentUPN: user.userPrincipalName,
      reason: body.reason,
      startDate: new Date().toISOString(),
      endDate: body.endDate,
      createdBy: session.user?.email || "unknown",
    });

    // Sync to Automation Variable — runbooks use this as fallback even if
    // the portal is offline. Non-fatal: portal state is authoritative.
    const performedBy = session.user?.email || session.user?.name || "unknown";
    try {
      await syncSuspensionCreate({
        studentId:   id,
        studentName: user.displayName,
        endDate:     body.endDate,
        reason:      body.reason,
        suspendedBy: performedBy,
      });
    } catch (syncErr) {
      console.warn("[suspend] Automation Variable sync failed (non-fatal):", syncErr);
    }

    // Audit log
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
  if (!canWrite(getUserRole(session.user?.email))) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
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

    // Lift suspension in local store
    await liftSuspension(id);

    // Sync lift to Automation Variable — runbooks will stop skipping this student
    const performedBy = session.user?.email || session.user?.name || "unknown";
    try {
      await syncSuspensionLift(id);
    } catch (syncErr) {
      console.warn("[suspend] Automation Variable sync (lift) failed (non-fatal):", syncErr);
    }

    // Audit log
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
