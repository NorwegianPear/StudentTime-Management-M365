// API: GET /api/suspensions — List all active suspensions
// API: POST /api/suspensions/process — Process expired suspensions (re-enable students)
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveSuspensions, getExpiredSuspensions, liftSuspension } from "@/lib/suspension-store";
import { getGraphClient } from "@/lib/graph-client";
import type { ApiResponse, Suspension } from "@/types";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const suspensions = await getActiveSuspensions();
  const response: ApiResponse<Suspension[]> = { success: true, data: suspensions };
  return NextResponse.json(response);
}

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const expired = await getExpiredSuspensions();
    if (expired.length === 0) {
      return NextResponse.json({
        success: true,
        data: { processed: 0, message: "No expired suspensions to process" },
      });
    }

    const client = await getGraphClient();
    const results: { studentName: string; status: string }[] = [];

    for (const suspension of expired) {
      try {
        // Re-enable the account
        await client.api(`/users/${suspension.studentId}`).update({ accountEnabled: true });
        await liftSuspension(suspension.studentId);
        results.push({ studentName: suspension.studentName, status: "re-enabled" });
      } catch (err) {
        results.push({
          studentName: suspension.studentName,
          status: `failed: ${err instanceof Error ? err.message : "unknown"}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: results.length,
        results,
        message: `Processed ${results.length} expired suspension(s)`,
      },
    });
  } catch (error) {
    console.error("Error processing suspensions:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
