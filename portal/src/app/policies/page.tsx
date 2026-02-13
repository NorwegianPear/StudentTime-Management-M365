"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import type { SchedulePolicy, GroupInfo } from "@/types";
import { useTranslation } from "@/lib/i18n";

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Convert "HH:mm" to percentage of 24 h */
function timePct(t: string) {
  const [h, m] = t.split(":").map(Number);
  return ((h * 60 + m) / 1440) * 100;
}

/** Format "HH:mm" */
function fmtTime(t: string) {
  const [h, m] = t.split(":");
  return `${h}:${m}`;
}

interface PolicyFormData {
  name: string;
  description: string;
  enableTime: string;
  disableTime: string;
  daysOfWeek: string[];
}

const emptyForm: PolicyFormData = {
  name: "",
  description: "",
  enableTime: "08:00",
  disableTime: "16:00",
  daysOfWeek: [...WEEKDAYS],
};

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<SchedulePolicy[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PolicyFormData>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SchedulePolicy | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [groupSearch, setGroupSearch] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const [polRes, grpRes] = await Promise.all([
        fetch("/api/policies"),
        fetch("/api/groups"),
      ]);
      const polData = await polRes.json();
      const grpData = await grpRes.json();
      if (polData.success) setPolicies(polData.data);
      if (grpData.success) setGroups(grpData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ─── Create / Edit ─────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        // Update
        const res = await fetch(`/api/policies/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      } else {
        // Create
        const res = await fetch("/api/policies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      }
      setShowCreate(false);
      setEditingId(null);
      setFormData({ ...emptyForm });
      await fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (policy: SchedulePolicy) => {
    setEditingId(policy.id);
    setFormData({
      name: policy.name,
      description: policy.description,
      enableTime: policy.enableTime,
      disableTime: policy.disableTime,
      daysOfWeek: [...policy.daysOfWeek],
    });
    setShowCreate(true);
    setOpenMenuId(null);
  };

  // ─── Delete ────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/policies/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setDeleteTarget(null);
      await fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  // ─── Toggle Active ─────────────────────────────────────────────────────

  const toggleActive = async (policy: SchedulePolicy) => {
    try {
      const res = await fetch(`/api/policies/${policy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !policy.isActive }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  // ─── Assign Groups ─────────────────────────────────────────────────────

  const startAssign = (policy: SchedulePolicy) => {
    setAssigningId(policy.id);
    setSelectedGroups([...policy.assignedGroupIds]);
    setGroupSearch("");
    setOpenMenuId(null);
  };

  const handleAssign = async () => {
    if (!assigningId) return;
    try {
      const res = await fetch(`/api/policies/${assigningId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedGroupIds: selectedGroups }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setAssigningId(null);
      setSelectedGroups([]);
      await fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign");
    }
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  // ─── Day toggle ────────────────────────────────────────────────────────

  const toggleDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day],
    }));
  };

  // ─── Group expand toggle ────────────────────────────────────────────────

  const toggleGroupExpand = (policyId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(policyId)) next.delete(policyId);
      else next.add(policyId);
      return next;
    });
  };

  // Filtered groups for assign modal
  const filteredGroups = groups.filter((g) =>
    g.displayName.toLowerCase().includes(groupSearch.toLowerCase())
  );

  // Day label helpers
  const dayLabel = (d: string) => {
    const key = `policies.${d.toLowerCase().slice(0, 3)}`;
    return t(key) || d.slice(0, 3);
  };

  const shortDaysSummary = (days: string[]) => {
    if (days.length === 7) return t("policies.everyDay");
    if (days.length === 5 && WEEKDAYS.every((d) => days.includes(d))) return t("policies.weekdays");
    return days.map((d) => dayLabel(d)).join(", ");
  };

  // ─── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
      </div>
    );
  }

  // Summary stats
  const activePolicies = policies.filter((p) => p.isActive);
  const totalGroups = new Set(policies.flatMap((p) => p.assignedGroupIds)).size;

  return (
    <div>
      <PageHeader
        title={t("policies.title")}
        subtitle={t("policies.subtitle")}
        actions={
          <button
            onClick={() => { setShowCreate(true); setEditingId(null); setFormData({ ...emptyForm }); }}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors text-sm font-medium shadow-sm"
          >
            {t("policies.newPolicy")}
          </button>
        }
      />

      {/* ── Summary Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="theme-surface rounded-lg border theme-border px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ background: "var(--badge-blue-bg)", color: "var(--badge-blue-text)" }}>📋</div>
          <div>
            <p className="text-xl font-bold theme-text-primary">{policies.length}</p>
            <p className="text-xs theme-text-secondary">{t("policies.totalPolicies")}</p>
          </div>
        </div>
        <div className="theme-surface rounded-lg border theme-border px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ background: "var(--badge-green-bg)", color: "var(--badge-green-text)" }}>✅</div>
          <div>
            <p className="text-xl font-bold theme-text-primary">{activePolicies.length}</p>
            <p className="text-xs theme-text-secondary">{t("policies.activePoliciesCount")}</p>
          </div>
        </div>
        <div className="theme-surface rounded-lg border theme-border px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ background: "var(--badge-purple-bg)", color: "var(--badge-purple-text)" }}>👥</div>
          <div>
            <p className="text-xl font-bold theme-text-primary">{totalGroups}</p>
            <p className="text-xs theme-text-secondary">{t("policies.groupsCovered")}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm flex items-center justify-between" style={{ background: "var(--badge-red-bg)", color: "var(--badge-red-text)", borderWidth: 1, borderColor: "var(--badge-red-border)" }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline text-xs ml-2">{t("common.dismiss")}</button>
        </div>
      )}

      {/* ── Create / Edit Modal ───────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in">
          <div className="theme-surface rounded-xl shadow-2xl w-full max-w-lg mx-4 border theme-border">
            <div className="p-6 border-b theme-border">
              <h2 className="text-lg font-semibold theme-text-primary">
                {editingId ? t("policies.editTitle") : t("policies.createTitle")}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium theme-text-primary mb-1">
                  {t("policies.policyName")}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("policies.policyNamePlaceholder")}
                  className="w-full px-3 py-2 border rounded-lg text-sm theme-text-primary theme-surface theme-border focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium theme-text-primary mb-1">
                  {t("policies.description")}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t("policies.descriptionPlaceholder")}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm theme-text-primary theme-surface theme-border focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium theme-text-primary mb-1">{t("policies.enableTime")}</label>
                  <input type="time" required value={formData.enableTime} onChange={(e) => setFormData({ ...formData, enableTime: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm theme-text-primary theme-surface theme-border focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium theme-text-primary mb-1">{t("policies.disableTime")}</label>
                  <input type="time" required value={formData.disableTime} onChange={(e) => setFormData({ ...formData, disableTime: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm theme-text-primary theme-surface theme-border focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium theme-text-primary mb-2">{t("policies.activeDays")}</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_DAYS.map((day) => (
                    <button key={day} type="button" onClick={() => toggleDay(day)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${formData.daysOfWeek.includes(day) ? "bg-[var(--accent)] text-white" : "theme-surface-secondary theme-text-secondary hover:opacity-80"}`}>
                      {dayLabel(day)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual preview timeline */}
              <div className="rounded-lg p-4 theme-surface-secondary">
                <p className="text-xs theme-text-muted mb-3 font-medium uppercase tracking-wide">{t("policies.preview")}</p>
                <div className="relative">
                  <div className="flex justify-between mb-1">
                    {[0, 6, 12, 18, 24].map((h) => (
                      <span key={h} className="text-[10px] theme-text-muted">{String(h).padStart(2, "0")}:00</span>
                    ))}
                  </div>
                  <div className="h-8 rounded-lg relative overflow-hidden" style={{ background: "var(--surface-border)" }}>
                    {[6, 12, 18].map((h) => (
                      <div key={h} className="absolute top-0 bottom-0 w-px opacity-30" style={{ left: `${(h / 24) * 100}%`, background: "var(--text-muted)" }} />
                    ))}
                    <div className="absolute top-1 bottom-1 rounded-md transition-all" style={{ left: `${timePct(formData.enableTime)}%`, width: `${timePct(formData.disableTime) - timePct(formData.enableTime)}%`, background: "var(--accent)", opacity: 0.85 }} />
                    <div className="absolute top-0 bottom-0 flex items-center justify-center text-white text-[11px] font-semibold" style={{ left: `${timePct(formData.enableTime)}%`, width: `${timePct(formData.disableTime) - timePct(formData.enableTime)}%` }}>
                      {fmtTime(formData.enableTime)} — {fmtTime(formData.disableTime)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setEditingId(null); }} className="px-4 py-2 border theme-border rounded-lg text-sm theme-text-secondary hover:opacity-80 transition-colors">
                  {t("common.cancel")}
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors">
                  {saving ? t("policies.saving") : editingId ? t("policies.updatePolicy") : t("policies.createPolicy")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign Groups Modal ───────────────────────────────────────── */}
      {assigningId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in">
          <div className="theme-surface rounded-xl shadow-2xl w-full max-w-md mx-4 border theme-border">
            <div className="p-6 border-b theme-border">
              <h2 className="text-lg font-semibold theme-text-primary">{t("policies.assignTitle")}</h2>
              <p className="text-sm theme-text-secondary mt-1">{t("policies.assignSubtitle")}</p>
            </div>
            {/* Search bar */}
            <div className="px-6 pt-4">
              <input type="text" value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} placeholder={t("policies.searchGroups")} className="w-full px-3 py-2 border rounded-lg text-sm theme-text-primary theme-surface theme-border focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] outline-none" />
            </div>
            <div className="p-6 pt-3 max-h-80 overflow-y-auto space-y-2">
              {filteredGroups.length === 0 ? (
                <p className="text-sm theme-text-muted text-center py-4">{t("policies.noGroups")}</p>
              ) : (
                filteredGroups.map((group) => {
                  const checked = selectedGroups.includes(group.id);
                  return (
                    <label key={group.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checked ? "border-[var(--accent)] bg-[var(--accent-light)]" : "theme-border hover:theme-surface-secondary"}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleGroupSelection(group.id)} className="rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium theme-text-primary truncate">{group.displayName}</p>
                        {group.description && <p className="text-xs theme-text-muted truncate">{group.description}</p>}
                      </div>
                      {group.memberCount !== undefined && (
                        <span className="text-xs theme-text-muted shrink-0">{group.memberCount} {t("policies.members")}</span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
            <div className="p-4 border-t theme-border flex items-center justify-between">
              <span className="text-xs theme-text-muted">{t("policies.selectedCount", { count: selectedGroups.length })}</span>
              <div className="flex gap-3">
                <button onClick={() => setAssigningId(null)} className="px-4 py-2 border theme-border rounded-lg text-sm theme-text-secondary hover:opacity-80 transition-colors">{t("common.cancel")}</button>
                <button onClick={handleAssign} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:bg-[var(--accent-hover)] transition-colors">
                  {t("policies.saveAssignment", { count: selectedGroups.length })}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Policy Cards ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        {policies.map((policy) => {
          const enablePct = timePct(policy.enableTime);
          const disablePct = timePct(policy.disableTime);
          const widthPct = disablePct - enablePct;
          const groupCount = policy.assignedGroupNames.length;
          const VISIBLE_GROUPS = 3;
          const isExpanded = expandedGroups.has(policy.id);
          const shownGroups = isExpanded ? policy.assignedGroupNames : policy.assignedGroupNames.slice(0, VISIBLE_GROUPS);
          const hiddenCount = groupCount - VISIBLE_GROUPS;

          return (
            <div key={policy.id} className={`theme-surface rounded-xl border transition-all hover:shadow-md ${policy.isActive ? "border-[var(--badge-green-border)]" : "theme-border"}`}>
              {/* ─ Header ─ */}
              <div className="flex items-start justify-between p-5 pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <h3 className="text-lg font-semibold theme-text-primary truncate">{policy.name}</h3>
                  {/* Clickable status badge — toggles active */}
                  <button
                    onClick={() => toggleActive(policy)}
                    title={policy.isActive ? t("policies.deactivate") : t("policies.activate")}
                    className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors cursor-pointer"
                    style={{
                      background: policy.isActive ? "var(--badge-green-bg)" : "var(--badge-yellow-bg)",
                      color: policy.isActive ? "var(--badge-green-text)" : "var(--badge-yellow-text)",
                      borderWidth: 1,
                      borderColor: policy.isActive ? "var(--badge-green-border)" : "var(--badge-yellow-border)",
                    }}
                  >
                    {policy.isActive ? t("common.active") : t("common.inactive")}
                  </button>
                </div>

                {/* ⋯ Action Menu */}
                <div className="relative shrink-0 ml-4" ref={openMenuId === policy.id ? menuRef : null}>
                  <button onClick={() => setOpenMenuId(openMenuId === policy.id ? null : policy.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:theme-surface-secondary transition-colors theme-text-secondary" title={t("policies.actions")}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/></svg>
                  </button>
                  {openMenuId === policy.id && (
                    <div className="absolute right-0 top-9 z-10 w-44 theme-surface rounded-lg shadow-lg border theme-border py-1 animate-in">
                      <button onClick={() => startEdit(policy)} className="w-full text-left px-4 py-2 text-sm theme-text-primary hover:theme-surface-secondary transition-colors flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        {t("common.edit")}
                      </button>
                      <button onClick={() => startAssign(policy)} className="w-full text-left px-4 py-2 text-sm theme-text-primary hover:theme-surface-secondary transition-colors flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                        {t("policies.assignGroups")}
                      </button>
                      <button onClick={() => toggleActive(policy)} className="w-full text-left px-4 py-2 text-sm hover:theme-surface-secondary transition-colors flex items-center gap-2" style={{ color: policy.isActive ? "var(--badge-yellow-text)" : "var(--badge-green-text)" }}>
                        {policy.isActive ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
                        )}
                        {policy.isActive ? t("policies.deactivate") : t("policies.activate")}
                      </button>
                      <div className="border-t theme-border my-1" />
                      <button onClick={() => { setDeleteTarget(policy); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-sm hover:theme-surface-secondary transition-colors flex items-center gap-2" style={{ color: "var(--badge-red-text)" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        {t("common.delete")}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ─ Body ─ */}
              <div className="px-5 pt-2 pb-4">
                {policy.description && <p className="text-sm theme-text-secondary mb-3">{policy.description}</p>}

                {/* Schedule info */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "var(--badge-green-text)" }} />
                    <span className="theme-text-secondary">{t("policies.enable")}</span>
                    <span className="font-semibold theme-text-primary">{fmtTime(policy.enableTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "var(--badge-red-text)" }} />
                    <span className="theme-text-secondary">{t("policies.disable")}</span>
                    <span className="font-semibold theme-text-primary">{fmtTime(policy.disableTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm theme-text-secondary">
                    <span>📅</span>
                    <span>{shortDaysSummary(policy.daysOfWeek)}</span>
                  </div>
                </div>

                {/* Visual timeline */}
                <div className="mb-4">
                  <div className="relative">
                    <div className="flex justify-between mb-1 px-0.5">
                      {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
                        <span key={h} className="text-[9px] theme-text-muted w-0 text-center">{String(h === 24 ? 0 : h).padStart(2, "0")}</span>
                      ))}
                    </div>
                    <div className="h-6 rounded-md relative overflow-hidden" style={{ background: "var(--surface-secondary)" }}>
                      {[3, 6, 9, 12, 15, 18, 21].map((h) => (
                        <div key={h} className="absolute top-0 bottom-0 w-px" style={{ left: `${(h / 24) * 100}%`, background: "var(--surface-border)" }} />
                      ))}
                      <div className="absolute top-0.5 bottom-0.5 rounded transition-all flex items-center justify-center" style={{ left: `${enablePct}%`, width: `${widthPct}%`, background: policy.isActive ? "var(--badge-green-text)" : "var(--text-muted)", opacity: policy.isActive ? 0.8 : 0.4 }}>
                        {widthPct > 15 && (
                          <span className="text-white text-[10px] font-semibold tracking-wide">{fmtTime(policy.enableTime)} — {fmtTime(policy.disableTime)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assigned groups */}
                {groupCount > 0 ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium theme-text-secondary">{t("policies.assignedTo")}</span>
                      <span className="text-xs theme-text-muted">({groupCount})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {shownGroups.map((name, i) => (
                        <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium" style={{ background: "var(--badge-blue-bg)", color: "var(--badge-blue-text)", borderWidth: 1, borderColor: "var(--badge-blue-border)" }}>
                          {name}
                        </span>
                      ))}
                      {hiddenCount > 0 && !isExpanded && (
                        <button onClick={() => toggleGroupExpand(policy.id)} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity" style={{ background: "var(--surface-secondary)", color: "var(--text-secondary)" }}>
                          +{hiddenCount} {t("policies.more")}
                        </button>
                      )}
                      {isExpanded && hiddenCount > 0 && (
                        <button onClick={() => toggleGroupExpand(policy.id)} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity" style={{ background: "var(--surface-secondary)", color: "var(--text-secondary)" }}>
                          {t("policies.showLess")}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <button onClick={() => startAssign(policy)} className="text-xs font-medium cursor-pointer hover:underline" style={{ color: "var(--accent)" }}>
                    + {t("policies.assignGroups")}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {policies.length === 0 && (
          <div className="text-center py-16 theme-surface rounded-xl border theme-border">
            <p className="text-4xl mb-3">📅</p>
            <p className="theme-text-secondary text-sm">{t("policies.emptyState")}</p>
            <button onClick={() => { setShowCreate(true); setEditingId(null); setFormData({ ...emptyForm }); }} className="mt-4 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:bg-[var(--accent-hover)] transition-colors">
              {t("policies.newPolicy")}
            </button>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={t("policies.deleteTitle")}
        message={t("policies.deleteMsg", { name: deleteTarget?.name ?? "" })}
        confirmLabel={t("policies.deleteTitle")}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
}
