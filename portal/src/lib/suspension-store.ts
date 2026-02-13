// File-based suspension store — persists at data/suspensions.json
// In production, replace with Azure Table Storage or Cosmos DB
import { promises as fs } from "fs";
import path from "path";
import type { Suspension } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "suspensions.json");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function getSuspensions(): Promise<Suspension[]> {
  await ensureDir();
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    return JSON.parse(raw) as Suspension[];
  } catch {
    return [];
  }
}

export async function saveSuspensions(list: Suspension[]): Promise<void> {
  await ensureDir();
  await fs.writeFile(FILE, JSON.stringify(list, null, 2), "utf-8");
}

export async function getActiveSuspension(studentId: string): Promise<Suspension | null> {
  const all = await getSuspensions();
  return all.find((s) => s.studentId === studentId && s.isActive) ?? null;
}

export async function getActiveSuspensions(): Promise<Suspension[]> {
  const all = await getSuspensions();
  return all.filter((s) => s.isActive);
}

export async function createSuspension(suspension: Omit<Suspension, "id" | "createdAt" | "isActive">): Promise<Suspension> {
  const all = await getSuspensions();
  // Deactivate any existing active suspension for this student
  for (const s of all) {
    if (s.studentId === suspension.studentId && s.isActive) {
      s.isActive = false;
    }
  }
  const newSuspension: Suspension = {
    ...suspension,
    id: `susp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    isActive: true,
  };
  all.push(newSuspension);
  await saveSuspensions(all);
  return newSuspension;
}

export async function liftSuspension(studentId: string): Promise<boolean> {
  const all = await getSuspensions();
  let found = false;
  for (const s of all) {
    if (s.studentId === studentId && s.isActive) {
      s.isActive = false;
      found = true;
    }
  }
  if (found) await saveSuspensions(all);
  return found;
}

/** Returns suspensions whose endDate has passed and are still active */
export async function getExpiredSuspensions(): Promise<Suspension[]> {
  const all = await getSuspensions();
  const now = new Date();
  return all.filter((s) => s.isActive && new Date(s.endDate) <= now);
}
