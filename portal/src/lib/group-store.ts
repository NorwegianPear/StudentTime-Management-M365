// File-based special groups store — tracks override groups with priority scheduling
// Production: use Azure Table Storage or Cosmos DB
import { promises as fs } from "fs";
import path from "path";
import type { SpecialGroup, PendingGroupChange } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const SPECIAL_GROUPS_FILE = path.join(DATA_DIR, "special-groups.json");
const PENDING_CHANGES_FILE = path.join(DATA_DIR, "pending-changes.json");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

// ─── Special Groups ──────────────────────────────────────────────────────

export async function getSpecialGroups(): Promise<SpecialGroup[]> {
  await ensureDir();
  try {
    const raw = await fs.readFile(SPECIAL_GROUPS_FILE, "utf-8");
    return JSON.parse(raw) as SpecialGroup[];
  } catch {
    return [];
  }
}

export async function saveSpecialGroups(groups: SpecialGroup[]): Promise<void> {
  await ensureDir();
  await fs.writeFile(SPECIAL_GROUPS_FILE, JSON.stringify(groups, null, 2), "utf-8");
}

export async function createSpecialGroup(
  group: Omit<SpecialGroup, "id" | "createdAt" | "memberCount">
): Promise<SpecialGroup> {
  const all = await getSpecialGroups();
  const newGroup: SpecialGroup = {
    ...group,
    id: `sg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    memberCount: 0,
    createdAt: new Date().toISOString(),
  };
  all.push(newGroup);
  await saveSpecialGroups(all);
  return newGroup;
}

export async function deleteSpecialGroup(id: string): Promise<boolean> {
  const all = await getSpecialGroups();
  const filtered = all.filter((g) => g.id !== id);
  if (filtered.length === all.length) return false;
  await saveSpecialGroups(filtered);
  return true;
}

export async function updateSpecialGroup(
  id: string,
  updates: Partial<SpecialGroup>
): Promise<SpecialGroup | null> {
  const all = await getSpecialGroups();
  const idx = all.findIndex((g) => g.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates, id };
  await saveSpecialGroups(all);
  return all[idx];
}

/** Check if a student is in any special/override group */
export async function getStudentSpecialGroups(studentGroupIds: string[]): Promise<SpecialGroup[]> {
  const all = await getSpecialGroups();
  return all.filter((sg) => studentGroupIds.includes(sg.groupId));
}

// ─── Pending Group Changes ──────────────────────────────────────────────

export async function getPendingChanges(): Promise<PendingGroupChange[]> {
  await ensureDir();
  try {
    const raw = await fs.readFile(PENDING_CHANGES_FILE, "utf-8");
    return JSON.parse(raw) as PendingGroupChange[];
  } catch {
    return [];
  }
}

export async function savePendingChanges(changes: PendingGroupChange[]): Promise<void> {
  await ensureDir();
  await fs.writeFile(PENDING_CHANGES_FILE, JSON.stringify(changes, null, 2), "utf-8");
}

export async function addPendingChange(
  change: Omit<PendingGroupChange, "id" | "requestedAt" | "status">
): Promise<PendingGroupChange> {
  const all = await getPendingChanges();
  const newChange: PendingGroupChange = {
    ...change,
    id: `chg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    requestedAt: new Date().toISOString(),
    status: "pending",
  };
  all.push(newChange);
  await savePendingChanges(all);
  return newChange;
}

export async function getPendingCount(): Promise<number> {
  const all = await getPendingChanges();
  return all.filter((c) => c.status === "pending").length;
}
