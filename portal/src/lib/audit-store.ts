// File-based audit log store — tracks all administrative actions
// Production: use Azure Table Storage or Cosmos DB
import { promises as fs } from "fs";
import path from "path";
import type { AuditLogEntry } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const AUDIT_FILE = path.join(DATA_DIR, "audit-log.json");

// Maximum entries to keep in the local store
const MAX_ENTRIES = 1000;

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

// ─── Read / Write ────────────────────────────────────────────────────────

export async function getAuditLog(): Promise<AuditLogEntry[]> {
  await ensureDir();
  try {
    const raw = await fs.readFile(AUDIT_FILE, "utf-8");
    return JSON.parse(raw) as AuditLogEntry[];
  } catch {
    return [];
  }
}

async function saveAuditLog(entries: AuditLogEntry[]): Promise<void> {
  await ensureDir();
  // Keep only the most recent MAX_ENTRIES
  const trimmed = entries
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, MAX_ENTRIES);
  await fs.writeFile(AUDIT_FILE, JSON.stringify(trimmed, null, 2), "utf-8");
}

// ─── Write an audit entry ────────────────────────────────────────────────

export async function writeAuditEntry(
  entry: Omit<AuditLogEntry, "id" | "timestamp">
): Promise<AuditLogEntry> {
  const all = await getAuditLog();
  const newEntry: AuditLogEntry = {
    ...entry,
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };
  all.unshift(newEntry); // most recent first
  await saveAuditLog(all);
  return newEntry;
}

// ─── Query helpers ───────────────────────────────────────────────────────

export type AuditFilter = {
  action?: string;
  performedBy?: string;
  targetUser?: string;
  targetGroup?: string;
  from?: string; // ISO date
  to?: string;   // ISO date
  limit?: number;
};

export async function queryAuditLog(filter: AuditFilter): Promise<AuditLogEntry[]> {
  let entries = await getAuditLog();

  if (filter.action) {
    entries = entries.filter((e) => e.action === filter.action);
  }
  if (filter.performedBy) {
    entries = entries.filter((e) =>
      e.performedBy.toLowerCase().includes(filter.performedBy!.toLowerCase())
    );
  }
  if (filter.targetUser) {
    entries = entries.filter((e) =>
      e.targetUser?.toLowerCase().includes(filter.targetUser!.toLowerCase())
    );
  }
  if (filter.targetGroup) {
    entries = entries.filter((e) =>
      e.targetGroup?.toLowerCase().includes(filter.targetGroup!.toLowerCase())
    );
  }
  if (filter.from) {
    const fromDate = new Date(filter.from);
    entries = entries.filter((e) => new Date(e.timestamp) >= fromDate);
  }
  if (filter.to) {
    const toDate = new Date(filter.to);
    entries = entries.filter((e) => new Date(e.timestamp) <= toDate);
  }

  const limit = filter.limit ?? 100;
  return entries.slice(0, limit);
}

// ─── Convenience methods ─────────────────────────────────────────────────

export async function logStudentAction(
  action: AuditLogEntry["action"],
  performedBy: string,
  targetUser: string,
  details?: string,
  targetGroup?: string
): Promise<AuditLogEntry> {
  return writeAuditEntry({
    action,
    performedBy,
    targetUser,
    targetGroup,
    details,
  });
}

export async function logPolicyAction(
  action: AuditLogEntry["action"],
  performedBy: string,
  details: string,
  targetGroup?: string
): Promise<AuditLogEntry> {
  return writeAuditEntry({
    action,
    performedBy,
    details,
    targetGroup,
  });
}

export async function logSystemAction(
  action: AuditLogEntry["action"],
  details: string,
  targetGroup?: string
): Promise<AuditLogEntry> {
  return writeAuditEntry({
    action,
    performedBy: "SYSTEM (Azure Automation)",
    details,
    targetGroup,
  });
}

/** Get summary counts for dashboard */
export async function getAuditSummary(sinceDays: number = 7): Promise<Record<string, number>> {
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);
  const entries = await getAuditLog();
  const recent = entries.filter((e) => new Date(e.timestamp) >= since);

  const summary: Record<string, number> = {};
  for (const e of recent) {
    summary[e.action] = (summary[e.action] || 0) + 1;
  }
  return summary;
}
