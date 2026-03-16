// Bridge: sync portal suspensions → Azure Automation Variable "SuspendedStudents"
//
// This is the co-existence layer.  The Automation runbooks (Enable-StudentAccess,
// Process-Suspensions) read from the "SuspendedStudents" variable as their source
// of truth.  The portal writes to that same variable whenever a suspension is
// created or lifted — so if the portal goes offline the runbooks still honour
// every suspension that was ever recorded.
//
// Required env vars:
//   AZURE_SUBSCRIPTION_ID      — Azure subscription ID
//   AUTOMATION_RESOURCE_GROUP  — Resource group that contains the Automation Account
//   AUTOMATION_ACCOUNT_NAME    — Name of the Azure Automation Account
//
// Authentication: uses the same DefaultAzureCredential / Managed Identity that
// graph-client.ts uses — no extra secrets needed.

import { DefaultAzureCredential, ClientSecretCredential } from "@azure/identity";

const API_VERSION = "2019-06-01";
const VARIABLE_NAME = "SuspendedStudents";

// ── Types (mirror Process-Suspensions.ps1 schema) ───────────────────────────
interface AutomationSuspension {
  studentId: string;
  studentName: string;
  endDate: string;      // ISO-8601
  reason: string;
  isActive: boolean;
  suspendedBy: string;
  suspendedAt: string;  // ISO-8601
}

// ── Credential (reuses the same logic as graph-client.ts) ───────────────────
function getCredential() {
  const clientId     = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  const tenantId     = process.env.AZURE_AD_TENANT_ID;
  if (clientId && clientSecret && tenantId) {
    return new ClientSecretCredential(tenantId, clientId, clientSecret);
  }
  return new DefaultAzureCredential();
}

async function getToken(): Promise<string> {
  const cred = getCredential();
  const result = await cred.getToken("https://management.azure.com/.default");
  return result.token;
}

function variableUrl(): string {
  const sub = process.env.AZURE_SUBSCRIPTION_ID;
  const rg  = process.env.AUTOMATION_RESOURCE_GROUP;
  const acc = process.env.AUTOMATION_ACCOUNT_NAME;

  if (!sub || !rg || !acc) {
    throw new Error(
      "Missing env vars: AZURE_SUBSCRIPTION_ID, AUTOMATION_RESOURCE_GROUP, or AUTOMATION_ACCOUNT_NAME"
    );
  }

  return (
    `https://management.azure.com/subscriptions/${sub}` +
    `/resourceGroups/${rg}/providers/Microsoft.Automation/automationAccounts/${acc}` +
    `/variables/${VARIABLE_NAME}?api-version=${API_VERSION}`
  );
}

// ── Read current suspensions from the Automation Variable ───────────────────
async function readAutomationSuspensions(): Promise<AutomationSuspension[]> {
  try {
    const token = await getToken();
    const res = await fetch(variableUrl(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 404) return [];        // variable doesn't exist yet
    if (!res.ok) {
      console.warn(`[automation-client] GET variable returned ${res.status}`);
      return [];
    }

    const body = await res.json() as { properties?: { value?: string } };
    const raw = body.properties?.value;
    if (!raw || raw === '""' || raw === "null") return [];

    // Automation stores string variables JSON-encoded with surrounding quotes
    const decoded = raw.startsWith('"') ? JSON.parse(raw) : raw;
    return JSON.parse(decoded) as AutomationSuspension[];
  } catch (err) {
    console.error("[automation-client] Failed to read suspensions:", err);
    return [];
  }
}

// ── Write suspensions back to the Automation Variable ───────────────────────
async function writeAutomationSuspensions(list: AutomationSuspension[]): Promise<void> {
  const token = await getToken();

  // Automation stores string variables with the value JSON-escaped inside a
  // JSON string — i.e. the body value field must be a quoted escaped string.
  const valuePayload = JSON.stringify(JSON.stringify(list));

  const res = await fetch(variableUrl(), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { value: valuePayload },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[automation-client] PATCH variable failed (${res.status}): ${text}`);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Record a new suspension in the shared Automation Variable.
 * Called by the portal suspend endpoint AFTER successfully disabling the account
 * in Entra ID and saving to the local suspension-store.
 */
export async function syncSuspensionCreate(params: {
  studentId: string;
  studentName: string;
  endDate: string;
  reason: string;
  suspendedBy: string;
}): Promise<void> {
  const list = await readAutomationSuspensions();

  // Deactivate any existing active suspension for this student
  for (const s of list) {
    if (s.studentId === params.studentId && s.isActive) s.isActive = false;
  }

  list.push({
    studentId:   params.studentId,
    studentName: params.studentName,
    endDate:     params.endDate,
    reason:      params.reason,
    isActive:    true,
    suspendedBy: params.suspendedBy,
    suspendedAt: new Date().toISOString(),
  });

  await writeAutomationSuspensions(list);
}

/**
 * Mark a suspension as lifted in the shared Automation Variable.
 * Called by the portal lift-suspension endpoint AFTER re-enabling the account.
 */
export async function syncSuspensionLift(studentId: string): Promise<void> {
  const list = await readAutomationSuspensions();
  let changed = false;

  for (const s of list) {
    if (s.studentId === studentId && s.isActive) {
      s.isActive = false;
      changed = true;
    }
  }

  if (changed) await writeAutomationSuspensions(list);
}
