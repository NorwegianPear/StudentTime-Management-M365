// API: GET /api/holidays?year=2026 — list holidays for a year
// API: POST /api/holidays — add a custom holiday
// API: DELETE /api/holidays?date=YYYY-MM-DD — remove a holiday
// API: POST /api/holidays/generate?year=2031 — auto-generate a missing year
// API: POST /api/holidays/sync — push current holiday list to Automation Variable
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canWrite, getUserRole } from "@/lib/roles";
import { logPolicyAction } from "@/lib/audit-store";
import {
  getHolidays, getHolidaysForYear, saveHolidays, addHoliday, removeHoliday,
  generateNorwegianHolidays,
  type Holiday,
} from "@/lib/holiday-store";
import type { ApiResponse } from "@/types";

// ── GET — list (optionally filtered by year) ──────────────────────────────────
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const yearParam = request.nextUrl.searchParams.get("year");
  const holidays  = yearParam
    ? await getHolidaysForYear(parseInt(yearParam))
    : await getHolidays();

  const response: ApiResponse<Holiday[]> = { success: true, data: holidays };
  return NextResponse.json(response);
}

// ── POST — add a manually-entered holiday ─────────────────────────────────────
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!canWrite(getUserRole(session.user?.email))) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  const performedBy = session.user?.email || session.user?.name || "unknown";

  const body = await request.json() as Partial<Holiday>;
  if (!body.date || !body.name || !body.nameEn) {
    return NextResponse.json({ success: false, error: "date, name, and nameEn are required" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return NextResponse.json({ success: false, error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  const updated = await addHoliday({
    date:   body.date,
    name:   body.name,
    nameEn: body.nameEn,
    type:   body.type ?? "school",
  });

  // Sync to Automation Variable (non-fatal)
  await syncToAutomation(updated);

  await logPolicyAction(
    "holiday_added",
    performedBy,
    `Added holiday ${body.date} (${body.name} / ${body.nameEn})`
  );

  return NextResponse.json({ success: true, data: updated });
}

// ── DELETE — remove a holiday by date ─────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!canWrite(getUserRole(session.user?.email))) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  const performedBy = session.user?.email || session.user?.name || "unknown";

  const date = request.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ success: false, error: "date query param required" }, { status: 400 });

  const existing = await getHolidays();
  const removed = existing.find((h) => h.date === date);

  const updated = await removeHoliday(date);
  await syncToAutomation(updated);

  await logPolicyAction(
    "holiday_removed",
    performedBy,
    `Removed holiday ${date}${removed ? ` (${removed.name} / ${removed.nameEn})` : ""}`
  );

  return NextResponse.json({ success: true, data: updated });
}

// ── Helper: sync holiday list to the shared Automation Variable ───────────────
async function syncToAutomation(holidays: Holiday[]): Promise<void> {
  try {
    const sub = process.env.AZURE_SUBSCRIPTION_ID;
    const rg  = process.env.AUTOMATION_RESOURCE_GROUP;
    const acc = process.env.AUTOMATION_ACCOUNT_NAME;
    if (!sub || !rg || !acc) return; // env not configured — skip silently

    const { DefaultAzureCredential, ClientSecretCredential } = await import("@azure/identity");
    const cred = process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_TENANT_ID
      ? new ClientSecretCredential(process.env.AZURE_AD_TENANT_ID, process.env.AZURE_AD_CLIENT_ID, process.env.AZURE_AD_CLIENT_SECRET)
      : new DefaultAzureCredential();

    const token = (await cred.getToken("https://management.azure.com/.default")).token;
    const url = `https://management.azure.com/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.Automation/automationAccounts/${acc}/variables/HolidayCalendar?api-version=2019-06-01`;

    await fetch(url, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { value: JSON.stringify(JSON.stringify(holidays)) } }),
    });
  } catch (err) {
    console.warn("[holidays] Automation Variable sync failed (non-fatal):", err);
  }
}
