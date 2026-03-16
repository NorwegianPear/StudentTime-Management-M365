// API: POST /api/holidays/generate?year=2031
// Generates Norwegian public holidays for a year that isn't yet in the store,
// then appends them and syncs to the Automation Variable.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canWrite, getUserRole } from "@/lib/roles";
import { logPolicyAction } from "@/lib/audit-store";
import { DefaultAzureCredential, ClientSecretCredential } from "@azure/identity";
import { getHolidays, saveHolidays, generateNorwegianHolidays } from "@/lib/holiday-store";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!canWrite(getUserRole(session.user?.email))) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  const performedBy = session.user?.email || session.user?.name || "unknown";

  const yearParam = request.nextUrl.searchParams.get("year");
  if (!yearParam || isNaN(parseInt(yearParam))) {
    return NextResponse.json({ success: false, error: "?year=YYYY required" }, { status: 400 });
  }
  const year = parseInt(yearParam);
  if (year < 2024 || year > 2050) {
    return NextResponse.json({ success: false, error: "year must be between 2024 and 2050" }, { status: 400 });
  }

  const existing = await getHolidays();
  // Check if year already has entries
  const alreadyHas = existing.some(h => h.date.startsWith(String(year)));
  if (alreadyHas) {
    const forYear = existing.filter(h => h.date.startsWith(String(year)));
    return NextResponse.json({
      success: true,
      data: forYear,
      message: `Year ${year} already has ${forYear.length} holidays — no changes made`,
    });
  }

  const generated = generateNorwegianHolidays(year);
  const merged = [...existing, ...generated].sort((a, b) => a.date.localeCompare(b.date));
  await saveHolidays(merged);
  await syncToAutomation(merged);

  await logPolicyAction(
    "holiday_generated",
    performedBy,
    `Generated ${generated.length} holidays for year ${year}`
  );

  return NextResponse.json({
    success: true,
    data: generated,
    message: `Generated ${generated.length} holidays for ${year}`,
  });
}

async function syncToAutomation(holidays: Array<{ date: string; name: string; nameEn: string; type: string }>): Promise<void> {
  try {
    const sub = process.env.AZURE_SUBSCRIPTION_ID;
    const rg = process.env.AUTOMATION_RESOURCE_GROUP;
    const acc = process.env.AUTOMATION_ACCOUNT_NAME;
    if (!sub || !rg || !acc) return;

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
  } catch {
    // non-fatal: local holiday store remains source of truth for the portal
  }
}
