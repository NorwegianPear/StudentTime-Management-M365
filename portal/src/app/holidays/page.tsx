"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";

interface Holiday {
  date:   string;
  name:   string;
  nameEn: string;
  type:   "public" | "school";
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR + i - 1);

function groupByYear(holidays: Holiday[]): Record<string, Holiday[]> {
  return holidays.reduce<Record<string, Holiday[]>>((acc, h) => {
    const y = h.date.slice(0, 4);
    (acc[y] ??= []).push(h);
    return acc;
  }, {});
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "long", year: "numeric",
  });
}

export default function HolidaysPage() {
  const [holidays, setHolidays]       = useState<Holiday[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [generating, setGenerating]   = useState<number | null>(null);
  const [removing, setRemoving]       = useState<string | null>(null);
  const [showAdd, setShowAdd]         = useState(false);
  const [addForm, setAddForm]         = useState({ date: "", name: "", nameEn: "", type: "school" as "public" | "school" });
  const [saving, setSaving]           = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>(String(CURRENT_YEAR));

  const fetchHolidays = useCallback(async () => {
    try {
      setLoading(true);
      const res  = await fetch("/api/holidays");
      const data = await res.json();
      if (data.success) setHolidays(data.data);
      else setError(data.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  const handleGenerate = async (year: number) => {
    setGenerating(year);
    try {
      const res  = await fetch(`/api/holidays/generate?year=${year}`, { method: "POST" });
      const data = await res.json();
      if (data.success) await fetchHolidays();
      else setError(data.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setGenerating(null);
    }
  };

  const handleRemove = async (date: string) => {
    if (!confirm(`Remove holiday ${date}?`)) return;
    setRemoving(date);
    try {
      const res  = await fetch(`/api/holidays?date=${date}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) await fetchHolidays();
      else setError(data.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setRemoving(null);
    }
  };

  const handleAdd = async () => {
    if (!addForm.date || !addForm.name || !addForm.nameEn) return;
    setSaving(true);
    try {
      const res  = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (data.success) { setShowAdd(false); setAddForm({ date: "", name: "", nameEn: "", type: "school" }); await fetchHolidays(); }
      else setError(data.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const byYear    = groupByYear(holidays);
  const yearHols  = byYear[selectedYear] ?? [];
  const hasYear   = !!byYear[selectedYear];

  return (
    <div>
      <PageHeader
        title="Holiday Calendar"
        subtitle="Norwegian public holidays 2025–2030+ · Runbooks skip enforcement on these days automatically"
      />

      {/* Info banner */}
      <div className="rounded-lg border p-4 mb-6 text-sm"
        style={{ background: "var(--card-bg)", borderColor: "var(--border-color)" }}>
        <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          🔗 How this connects to automation
        </p>
        <p style={{ color: "var(--text-secondary)" }}>
          Every change saved here is written to the <code className="px-1 rounded text-xs" style={{ background: "var(--hover-bg)" }}>HolidayCalendar</code> Azure
          Automation Variable. The <strong>Apply-SchedulePolicies</strong> runbook reads that variable on every 15-minute run —
          so students will automatically stay <strong>disabled</strong> on public holidays, no manual intervention needed.
          Adding a new school closure or generating a future year takes effect within 15 minutes.
        </p>
      </div>

      {error && (
        <div className="rounded-lg p-4 mb-4 text-sm text-red-700 bg-red-50 border border-red-200">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Year selector + generate */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {YEARS.map(y => {
          const ys   = String(y);
          const has  = !!byYear[ys];
          const cnt  = (byYear[ys] ?? []).length;
          return (
            <button
              key={y}
              onClick={() => setSelectedYear(ys)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                selectedYear === ys
                  ? "text-white shadow-sm"
                  : "hover:opacity-80"
              }`}
              style={
                selectedYear === ys
                  ? { background: "var(--sidebar-active)", borderColor: "var(--sidebar-active)", color: "#fff" }
                  : { background: "var(--card-bg)", borderColor: "var(--border-color)", color: "var(--text-secondary)" }
              }
            >
              {y}
              {has ? ` (${cnt})` : " ···"}
            </button>
          );
        })}
      </div>

      {/* Generate missing year */}
      {!hasYear && (
        <div className="rounded-lg border p-5 mb-6 flex items-center justify-between"
          style={{ background: "var(--hover-bg)", borderColor: "var(--border-color)" }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              No holidays loaded for {selectedYear}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              Click Generate to auto-compute Norwegian public holidays using the Easter algorithm.
            </p>
          </div>
          <button
            onClick={() => handleGenerate(parseInt(selectedYear))}
            disabled={generating === parseInt(selectedYear)}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: "var(--sidebar-active)" }}
          >
            {generating === parseInt(selectedYear) ? "Generating…" : `Generate ${selectedYear}`}
          </button>
        </div>
      )}

      {/* Holiday list */}
      {loading ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : (
        <>
          <div className="rounded-lg border overflow-hidden mb-4"
            style={{ borderColor: "var(--border-color)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--table-header-bg)" }}>
                  <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide"
                    style={{ color: "var(--text-secondary)" }}>Date</th>
                  <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide"
                    style={{ color: "var(--text-secondary)" }}>Norwegian name</th>
                  <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide"
                    style={{ color: "var(--text-secondary)" }}>English name</th>
                  <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide"
                    style={{ color: "var(--text-secondary)" }}>Type</th>
                  <th className="px-5 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {yearHols.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm"
                      style={{ color: "var(--text-muted)" }}>
                      No holidays for {selectedYear}
                    </td>
                  </tr>
                )}
                {yearHols.map((h, i) => (
                  <tr key={h.date}
                    className="border-t"
                    style={{
                      borderColor: "var(--border-color)",
                      background: i % 2 === 0 ? "var(--card-bg)" : "var(--hover-bg)",
                    }}>
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: "var(--text-primary)" }}>
                      {fmtDate(h.date)}
                    </td>
                    <td className="px-5 py-3" style={{ color: "var(--text-primary)" }}>{h.name}</td>
                    <td className="px-5 py-3" style={{ color: "var(--text-secondary)" }}>{h.nameEn}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        h.type === "public"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {h.type === "public" ? "🇳🇴 Public" : "🏫 School"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleRemove(h.date)}
                        disabled={removing === h.date}
                        title="Remove"
                        className="text-xs px-2 py-1 rounded transition-colors disabled:opacity-40"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {removing === h.date ? "…" : "✕"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add custom holiday */}
          {showAdd ? (
            <div className="rounded-lg border p-5 mb-4"
              style={{ background: "var(--card-bg)", borderColor: "var(--sidebar-active)" }}>
              <p className="font-semibold text-sm mb-3" style={{ color: "var(--text-primary)" }}>
                Add custom school closure / holiday
              </p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Date (YYYY-MM-DD)</label>
                  <input type="date" value={addForm.date}
                    onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ background: "var(--input-bg)", borderColor: "var(--border-color)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Type</label>
                  <select value={addForm.type}
                    onChange={e => setAddForm(f => ({ ...f, type: e.target.value as "public" | "school" }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ background: "var(--input-bg)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}>
                    <option value="school">🏫 School closure</option>
                    <option value="public">🇳🇴 Public holiday</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Norwegian name</label>
                  <input type="text" placeholder="e.g. Eksamensdag" value={addForm.name}
                    onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ background: "var(--input-bg)", borderColor: "var(--border-color)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>English name</label>
                  <input type="text" placeholder="e.g. Exam Day" value={addForm.nameEn}
                    onChange={e => setAddForm(f => ({ ...f, nameEn: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ background: "var(--input-bg)", borderColor: "var(--border-color)", color: "var(--text-primary)" }} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAdd} disabled={saving || !addForm.date || !addForm.name || !addForm.nameEn}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: "var(--sidebar-active)" }}>
                  {saving ? "Saving…" : "Save holiday"}
                </button>
                <button onClick={() => setShowAdd(false)}
                  className="px-4 py-2 rounded-lg text-sm border"
                  style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium border"
                style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)", background: "var(--card-bg)" }}>
                + Add school closure
              </button>
              {!hasYear && (
                <button onClick={() => handleGenerate(parseInt(selectedYear))}
                  disabled={generating === parseInt(selectedYear)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                  style={{ background: "var(--sidebar-active)" }}>
                  {generating === parseInt(selectedYear) ? "Generating…" : `+ Generate ${selectedYear} holidays`}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
