// API: GET  /api/audit - Query audit log entries with optional filters
// API: POST /api/audit - Write a new audit log entry (portal actions)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryAuditLog, writeAuditEntry, getAuditSummary } from "@/lib/audit-store";
import type { AuditLogEntry, ApiResponse } from "@/types";

// ─── GET: Query audit log ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);

    const action = searchParams.get("action") || undefined;
    const performedBy = searchParams.get("performedBy") || undefined;
    const targetUser = searchParams.get("targetUser") || undefined;
    const targetGroup = searchParams.get("targetGroup") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const limitStr = searchParams.get("limit");
    const limit = limitStr ? parseInt(limitStr, 10) : 100;
    const summaryOnly = searchParams.get("summary") === "true";

    // If caller only wants summary counts
    if (summaryOnly) {
      const days = parseInt(searchParams.get("days") || "7", 10);
      const summary = await getAuditSummary(days);
      return NextResponse.json({ success: true, data: summary });
    }

    const entries = await queryAuditLog({
      action,
      performedBy,
      targetUser,
      targetGroup,
      from,
      to,
      limit,
    });

    const response: ApiResponse<AuditLogEntry[]> = { success: true, data: entries };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error querying audit log:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ─── POST: Write audit entry (from portal actions) ──────────────────────

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, targetUser, targetGroup, details } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Missing required field: action" },
        { status: 400 }
      );
    }

    const performedBy = session.user?.email || session.user?.name || "Unknown";

    const entry = await writeAuditEntry({
      action,
      performedBy,
      targetUser,
      targetGroup,
      details,
    });

    const response: ApiResponse<AuditLogEntry> = { success: true, data: entry };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error writing audit entry:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
