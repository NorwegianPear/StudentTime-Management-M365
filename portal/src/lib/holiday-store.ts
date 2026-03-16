// Holiday store — persists at data/holidays.json
// Mirrors the HolidayCalendar Automation Variable in Azure.
// When the portal saves holidays, it writes here AND syncs to the Automation Variable
// via automation-client.ts so the runbooks always see the latest calendar.
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR  = path.join(process.cwd(), "data");
const FILE      = path.join(DATA_DIR, "holidays.json");
const SEED_FILE = path.join(process.cwd(), "..", "config", "biss-holidays.json");

export interface Holiday {
  date:   string;  // YYYY-MM-DD
  name:   string;  // Norwegian name
  nameEn: string;  // English name
  type:   "public" | "school";  // public = Norwegian law, school = BISS-specific
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

// ── Load all holidays, seeding from biss-holidays.json on first run ──────────
export async function getHolidays(): Promise<Holiday[]> {
  await ensureDir();
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    return JSON.parse(raw) as Holiday[];
  } catch {
    // First run — try to load from the config seed file
    const seeded = await seedFromConfig();
    await saveHolidays(seeded);
    return seeded;
  }
}

async function seedFromConfig(): Promise<Holiday[]> {
  try {
    const raw = await fs.readFile(SEED_FILE, "utf-8");
    const config = JSON.parse(raw);
    const flat: Holiday[] = [];
    for (const key of Object.keys(config)) {
      if (!/^\d{4}$/.test(key)) continue;
      const year = config[key];
      for (const h of year.holidays ?? []) {
        flat.push({ date: h.date, name: h.name, nameEn: h.nameEn, type: h.type ?? "public" });
      }
    }
    return flat.sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

export async function saveHolidays(list: Holiday[]): Promise<void> {
  await ensureDir();
  const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
  await fs.writeFile(FILE, JSON.stringify(sorted, null, 2), "utf-8");
}

export async function getHolidaysForYear(year: number): Promise<Holiday[]> {
  const all = await getHolidays();
  return all.filter(h => h.date.startsWith(String(year)));
}

export async function isHoliday(date: string): Promise<boolean> {
  const all = await getHolidays();
  return all.some(h => h.date === date);
}

export async function addHoliday(holiday: Holiday): Promise<Holiday[]> {
  const all = await getHolidays();
  // Prevent duplicates
  const filtered = all.filter(h => h.date !== holiday.date);
  filtered.push(holiday);
  await saveHolidays(filtered);
  return filtered.sort((a, b) => a.date.localeCompare(b.date));
}

export async function removeHoliday(date: string): Promise<Holiday[]> {
  const all = await getHolidays();
  const filtered = all.filter(h => h.date !== date);
  await saveHolidays(filtered);
  return filtered;
}

// ── Compute Norwegian Easter for any year (Anonymous Gregorian algorithm) ────
export function computeEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((11 * h + 22 * l + 114) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── Generate Norwegian public holidays for a given year ───────────────────────
export function generateNorwegianHolidays(year: number): Holiday[] {
  const easter = computeEaster(year);
  const movable: Array<{ offset: number; name: string; nameEn: string }> = [
    { offset: -3, name: "Skjærtorsdag",         nameEn: "Maundy Thursday"   },
    { offset: -2, name: "Langfredag",            nameEn: "Good Friday"       },
    { offset:  0, name: "1. påskedag",           nameEn: "Easter Sunday"     },
    { offset:  1, name: "2. påskedag",           nameEn: "Easter Monday"     },
    { offset: 39, name: "Kristi Himmelfartsdag", nameEn: "Ascension Day"     },
    { offset: 49, name: "1. pinsedag",           nameEn: "Whit Sunday"       },
    { offset: 50, name: "2. pinsedag",           nameEn: "Whit Monday"       },
  ];
  const fixed: Holiday[] = [
    { date: `${year}-01-01`, name: "Nyttårsdag",     nameEn: "New Year's Day",   type: "public" },
    { date: `${year}-05-01`, name: "Arbeidernes dag", nameEn: "Labour Day",       type: "public" },
    { date: `${year}-05-17`, name: "Grunnlovsdag",   nameEn: "Constitution Day", type: "public" },
    { date: `${year}-12-25`, name: "1. juledag",     nameEn: "Christmas Day",    type: "public" },
    { date: `${year}-12-26`, name: "2. juledag",     nameEn: "Boxing Day",       type: "public" },
  ];

  const seen = new Set<string>(fixed.map(h => h.date));
  const result: Holiday[] = [...fixed];

  for (const m of movable) {
    const d = fmt(addDays(easter, m.offset));
    if (seen.has(d)) {
      // Merge names (e.g. 2027: 2. pinsedag + Grunnlovsdag)
      const existing = result.find(h => h.date === d)!;
      existing.name   = `${existing.name} / ${m.name}`;
      existing.nameEn = `${existing.nameEn} / ${m.nameEn}`;
    } else {
      seen.add(d);
      result.push({ date: d, name: m.name, nameEn: m.nameEn, type: "public" });
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}
