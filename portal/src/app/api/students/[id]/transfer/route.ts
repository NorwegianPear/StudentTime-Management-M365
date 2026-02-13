// API: POST /api/students/[id]/transfer — Move student between class groups
import { NextRequest, NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph-client";
import { auth } from "@/lib/auth";
import { logStudentAction } from "@/lib/audit-store";
import type { ApiResponse, TransferRequest } from "@/types";

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
    const body = (await request.json()) as TransferRequest;
    if (!body.fromGroupId || !body.toGroupId) {
      return NextResponse.json(
        { success: false, error: "fromGroupId and toGroupId are required" },
        { status: 400 }
      );
    }

    if (body.fromGroupId === body.toGroupId) {
      return NextResponse.json(
        { success: false, error: "Source and destination groups are the same" },
        { status: 400 }
      );
    }

    const client = await getGraphClient();

    // Get student info for response
    const user = await client
      .api(`/users/${id}`)
      .select("id,displayName,userPrincipalName")
      .get();

    // Get group names for logging
    const [fromGroup, toGroup] = await Promise.all([
      client.api(`/groups/${body.fromGroupId}`).select("displayName").get(),
      client.api(`/groups/${body.toGroupId}`).select("displayName").get(),
    ]);

    // Remove from old group
    await client.api(`/groups/${body.fromGroupId}/members/${id}/$ref`).delete();

    // Add to new group
    await client.api(`/groups/${body.toGroupId}/members/$ref`).post({
      "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${id}`,
    });

    // Audit log
    const performedBy = session.user?.email || session.user?.name || "Unknown";
    await logStudentAction(
      "student_transferred",
      performedBy,
      `${user.displayName} (${user.userPrincipalName})`,
      `Transferred from ${fromGroup.displayName} to ${toGroup.displayName}`,
      toGroup.displayName
    );

    return NextResponse.json({
      success: true,
      data: {
        studentId: id,
        studentName: user.displayName,
        fromGroup: fromGroup.displayName,
        toGroup: toGroup.displayName,
        message: `${user.displayName} transferred from ${fromGroup.displayName} to ${toGroup.displayName}`,
      },
    } as ApiResponse<Record<string, string>>);
  } catch (error) {
    console.error("Error transferring student:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
