// Simple file-based policy store for demo purposes
// Production: use Azure Table Storage or Cosmos DB
import { promises as fs } from "fs";
import path from "path";
import type { SchedulePolicy } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const POLICIES_FILE = path.join(DATA_DIR, "policies.json");

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // already exists
  }
}

export async function getPolicies(): Promise<SchedulePolicy[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(POLICIES_FILE, "utf-8");
    return JSON.parse(data) as SchedulePolicy[];
  } catch {
    // File doesn't exist yet — return defaults
    const defaults = getDefaultPolicies();
    await savePolicies(defaults);
    return defaults;
  }
}

export async function savePolicies(policies: SchedulePolicy[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(POLICIES_FILE, JSON.stringify(policies, null, 2), "utf-8");
}

export async function getPolicy(id: string): Promise<SchedulePolicy | undefined> {
  const policies = await getPolicies();
  return policies.find((p) => p.id === id);
}

export async function createPolicy(
  policy: Omit<SchedulePolicy, "id" | "createdAt" | "updatedAt" | "assignedGroupIds" | "assignedGroupNames">
): Promise<SchedulePolicy> {
  const policies = await getPolicies();
  const newPolicy: SchedulePolicy = {
    ...policy,
    id: `policy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    assignedGroupIds: [],
    assignedGroupNames: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  policies.push(newPolicy);
  await savePolicies(policies);
  return newPolicy;
}

export async function updatePolicy(
  id: string,
  updates: Partial<SchedulePolicy>
): Promise<SchedulePolicy | null> {
  const policies = await getPolicies();
  const index = policies.findIndex((p) => p.id === id);
  if (index === -1) return null;

  policies[index] = {
    ...policies[index],
    ...updates,
    id, // don't allow id change
    updatedAt: new Date().toISOString(),
  };
  await savePolicies(policies);
  return policies[index];
}

export async function deletePolicy(id: string): Promise<boolean> {
  const policies = await getPolicies();
  const filtered = policies.filter((p) => p.id !== id);
  if (filtered.length === policies.length) return false;
  await savePolicies(filtered);
  return true;
}

function getDefaultPolicies(): SchedulePolicy[] {
  return [
    {
      id: "policy-default-school",
      name: "Standard School Hours",
      description: "Default policy for regular school days. Students enabled at 07:55, disabled at 16:05.",
      enableTime: "07:55",
      disableTime: "16:05",
      daysOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      timezone: "W. Europe Standard Time",
      isActive: true,
      assignedGroupIds: [],
      assignedGroupNames: [],
      createdAt: new Date().toISOString(),
      createdBy: "system",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "policy-extended-hours",
      name: "Extended Hours (After-School)",
      description: "For students in after-school programs. Extended access until 18:00.",
      enableTime: "07:55",
      disableTime: "18:00",
      daysOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      timezone: "W. Europe Standard Time",
      isActive: false,
      assignedGroupIds: [],
      assignedGroupNames: [],
      createdAt: new Date().toISOString(),
      createdBy: "system",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "policy-exam-period",
      name: "Exam Period (Always On)",
      description: "During exam periods — students have 24/7 access to their accounts.",
      enableTime: "00:00",
      disableTime: "23:59",
      daysOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      timezone: "W. Europe Standard Time",
      isActive: false,
      assignedGroupIds: [],
      assignedGroupNames: [],
      createdAt: new Date().toISOString(),
      createdBy: "system",
      updatedAt: new Date().toISOString(),
    },
  ];
}
