// API: POST /api/students/bulk/promote — Annual class promotion
// Moves all members from source group to destination group
import { NextRequest, NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph-client";
import { auth } from "@/lib/auth";
import type { ApiResponse, BulkPromoteRequest } from "@/types";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as BulkPromoteRequest;
    if (!body.promotions || !Array.isArray(body.promotions) || body.promotions.length === 0) {
      return NextResponse.json(
        { success: false, error: "promotions array is required with at least one entry" },
        { status: 400 }
      );
    }

    const client = await getGraphClient();
    const results: { from: string; to: string; moved: number; errors: string[] }[] = [];

    for (const promo of body.promotions) {
      const errors: string[] = [];
      let moved = 0;

      // Get group names
      const [fromGroup, toGroup] = await Promise.all([
        client.api(`/groups/${promo.fromGroupId}`).select("displayName").get(),
        client.api(`/groups/${promo.toGroupId}`).select("displayName").get(),
      ]);

      // Get all members of source group
      const members = await client
        .api(`/groups/${promo.fromGroupId}/members`)
        .select("id,displayName")
        .top(999)
        .get();

      const studentList = members.value || [];

      for (const student of studentList) {
        try {
          // Add to destination group
          await client.api(`/groups/${promo.toGroupId}/members/$ref`).post({
            "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${student.id}`,
          });
          // Remove from source group
          await client.api(`/groups/${promo.fromGroupId}/members/${student.id}/$ref`).delete();
          moved++;
        } catch (err) {
          errors.push(`${student.displayName}: ${err instanceof Error ? err.message : "failed"}`);
        }
      }

      results.push({
        from: fromGroup.displayName,
        to: toGroup.displayName,
        moved,
        errors,
      });
    }

    const totalMoved = results.reduce((sum, r) => sum + r.moved, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    return NextResponse.json({
      success: true,
      data: {
        message: `Promoted ${totalMoved} students across ${results.length} class(es). ${totalErrors} error(s).`,
        results,
      },
    } as ApiResponse<Record<string, unknown>>);
  } catch (error) {
    console.error("Error promoting students:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
