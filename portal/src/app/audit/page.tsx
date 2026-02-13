"use client";

import { useEffect, useState, useCallback } from "react";
import type { AuditLogEntry } from "@/types";
import { useTranslation } from "@/lib/i18n";

// ─── Action badge colors ─────────────────────────────────────────────────

const ACTION_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  enable:                   { label: "Enable",             color: "bg-green-100 text-green-800",  icon: "✅" },
  disable:                  { label: "Disable",            color: "bg-red-100 text-red-800",      icon: "🚫" },
  manual_toggle:            { label: "Manual Toggle",      color: "bg-yellow-100 text-yellow-800",icon: "🔀" },
  policy_created:           { label: "Policy Created",     color: "bg-blue-100 text-blue-800",    icon: "📝" },
  policy_deleted:           { label: "Policy Deleted",     color: "bg-red-100 text-red-800",      icon: "🗑️" },
  policy_assigned:          { label: "Policy Assigned",    color: "bg-blue-100 text-blue-800",    icon: "🔗" },
  policy_updated:           { label: "Policy Updated",     color: "bg-blue-100 text-blue-800",    icon: "✏️" },
  student_suspended:        { label: "Suspended",          color: "bg-orange-100 text-orange-800",icon: "⏸️" },
  student_unsuspended:      { label: "Unsuspended",        color: "bg-green-100 text-green-800",  icon: "▶️" },
  student_transferred:      { label: "Transferred",        color: "bg-purple-100 text-purple-800",icon: "🔄" },
  student_created:          { label: "Student Created",    color: "bg-blue-100 text-blue-800",    icon: "👤" },
  student_removed:          { label: "Student Removed",    color: "bg-red-100 text-red-800",      icon: "❌" },
  bulk_promote:             { label: "Bulk Promote",       color: "bg-indigo-100 text-indigo-800",icon: "🎓" },
  special_group_added:      { label: "Special Group +",    color: "bg-amber-100 text-amber-800",  icon: "⭐" },
  special_group_removed:    { label: "Special Group −",    color: "bg-amber-100 text-amber-800",  icon: "⭐" },
  group_membership_changed: { label: "Group Changed",      color: "bg-purple-100 text-purple-800",icon: "📁" },
};

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_CONFIG[action] || {
    label: action,
    color: "bg-gray-100 text-gray-800",
    icon: "•",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}
    >
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ─── Page component ──────────────────────────────────────────────────────

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Record<string, number>>({});

  // Filters
  const [filterAction, setFilterAction] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [limit, setLimit] = useState(100);
  const { t } = useTranslation();

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterAction) params.set("action", filterAction);
      if (filterSearch) {
        params.set("targetUser", filterSearch);
      }
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      params.set("limit", limit.toString());

      const res = await fetch(`/api/audit?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setEntries(json.data);
      } else {
        setError(json.error || "Failed to load audit log");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterSearch, filterFrom, filterTo, limit]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/audit?summary=true&days=7");
      const json = await res.json();
      if (json.success) setSummary(json.data);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchAudit();
    fetchSummary();
  }, [fetchAudit, fetchSummary]);

  // Summary stat cards
  const summaryCards = [
    { label: t("audit.enables7d"),    key: "enable",             icon: "✅", accent: "border-green-400" },
    { label: t("audit.disables7d"),   key: "disable",            icon: "🚫", accent: "border-red-400" },
    { label: t("audit.transfers7d"),  key: "student_transferred", icon: "🔄", accent: "border-purple-400" },
    { label: t("audit.suspensions7d"),key: "student_suspended",   icon: "⏸️", accent: "border-orange-400" },
    { label: t("audit.newStudents"),    key: "student_created",     icon: "👤", accent: "border-blue-400" },
    { label: t("audit.promotions"),      key: "bulk_promote",        icon: "🎓", accent: "border-indigo-400" },
  ];

  const allActions = Object.keys(ACTION_CONFIG);

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold theme-text-primary">{t("audit.title")}</h1>
        <p className="text-gray-500 mt-1">
          {t("audit.subtitle")}
        </p>
      </div>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-3">
          <span className="text-xl">ℹ️</span>
          <div>
            <p className="text-sm font-medium text-blue-800">
              {t("audit.infoBanner")}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {t("audit.infoText")}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {summaryCards.map((card) => (
          <div
            key={card.key}
            className={`bg-white rounded-xl border-l-4 ${card.accent} border border-gray-200 p-4`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{card.icon}</span>
              <span className="text-2xl font-bold text-gray-900">
                {summary[card.key] || 0}
              </span>
            </div>
            <p className="text-xs text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Action filter */}
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t("audit.filterAction")}
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
            >
              <option value="">{t("audit.allActions")}</option>
              {allActions.map((a) => (
                <option key={a} value={a}>
                  {ACTION_CONFIG[a].icon} {ACTION_CONFIG[a].label}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t("audit.filterSearch")}
            </label>
            <input
              type="text"
              placeholder={t("audit.searchPlaceholder")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
          </div>

          {/* Date from */}
          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t("audit.filterFrom")}
            </label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
            />
          </div>

          {/* Date to */}
          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t("audit.filterTo")}
            </label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
            />
          </div>

          {/* Limit */}
          <div className="min-w-[100px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t("audit.filterShow")}
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
            </select>
          </div>

          {/* Apply */}
          <button
            onClick={fetchAudit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            {t("common.apply")}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-[170px]">
                  Timestamp
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-[160px]">
                  Action
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Target
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Performed By
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-8 w-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                      <p className="text-sm">{t("audit.loadingAudit")}</p>
                    </div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">📋</span>
                      <p className="text-sm">{t("audit.noEntries")}</p>
                      <p className="text-xs">
                        {t("audit.noEntriesHint")}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {formatTimestamp(entry.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <ActionBadge action={entry.action} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {entry.targetUser && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">👤</span>
                          <span>{entry.targetUser}</span>
                        </div>
                      )}
                      {entry.targetGroup && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">📁</span>
                          <span className="text-gray-600 text-xs">
                            {entry.targetGroup}
                          </span>
                        </div>
                      )}
                      {!entry.targetUser && !entry.targetGroup && (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {entry.performedBy}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[300px] truncate">
                      {entry.details || (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && entries.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center">
            <span>
              {t("audit.showingEntries", { count: entries.length })}
            </span>
            <button
              onClick={fetchAudit}
              className="text-blue-600 hover:text-blue-800"
            >
              ↻ {t("common.refresh")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
