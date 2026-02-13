"use client";

import React from "react";
import type { GroupInfo, SchedulePolicy } from "@/types";
import { useTranslation } from "@/lib/i18n";

interface StudentFiltersProps {
  groups: GroupInfo[];
  policies: SchedulePolicy[];
  selectedGroup: string;
  selectedPolicy: string;
  selectedStatus: string;
  searchQuery: string;
  showOverridesOnly: boolean;
  onGroupChange: (groupId: string) => void;
  onPolicyChange: (policyId: string) => void;
  onStatusChange: (status: string) => void;
  onSearchChange: (query: string) => void;
  onOverridesOnlyChange: (value: boolean) => void;
  suspendedCount: number;
  totalCount: number;
  filteredCount: number;
}

const selectStyle: React.CSSProperties = {
  backgroundColor: "var(--surface)",
  color: "var(--text-primary)",
  borderColor: "var(--surface-border)",
};

export function StudentFilters({
  groups,
  policies,
  selectedGroup,
  selectedPolicy,
  selectedStatus,
  searchQuery,
  showOverridesOnly,
  onGroupChange,
  onPolicyChange,
  onStatusChange,
  onSearchChange,
  onOverridesOnlyChange,
  suspendedCount,
  totalCount,
  filteredCount,
}: StudentFiltersProps) {
  const { t } = useTranslation();
  const hasFilters =
    selectedGroup || selectedPolicy || selectedStatus !== "all" || searchQuery || showOverridesOnly;

  return (
    <div className="mb-5 space-y-3">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("students.searchPlaceholder")}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow"
            style={{ backgroundColor: "var(--surface)", color: "var(--text-primary)", border: "1px solid var(--surface-border)" }}
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 theme-text-muted text-sm">🔍</span>
        </div>
        {hasFilters && (
          <span className="text-xs theme-text-muted whitespace-nowrap">
            {filteredCount} / {totalCount}
          </span>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2.5 p-3.5 rounded-xl"
        style={{ backgroundColor: "var(--surface-secondary)", border: "1px solid var(--surface-border)" }}>
        <span className="text-[11px] font-semibold theme-text-muted uppercase tracking-wider">
          {t("common.filter")}:
        </span>

        {/* Status */}
        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          style={selectStyle}
        >
          <option value="all">{t("students.allStatuses")}</option>
          <option value="enabled">{t("students.enabledStatus")}</option>
          <option value="disabled">{t("students.disabledStatus")}</option>
          <option value="suspended">{t("students.suspendedStatus", { count: suspendedCount })}</option>
        </select>

        {/* Group/Class */}
        <select
          value={selectedGroup}
          onChange={(e) => onGroupChange(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          style={selectStyle}
        >
          <option value="">{t("students.allClasses")}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.displayName} ({g.memberCount ?? "?"})
              {g.policyName ? ` — ${g.policyName}` : ""}
            </option>
          ))}
        </select>

        {/* Policy */}
        <select
          value={selectedPolicy}
          onChange={(e) => onPolicyChange(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          style={selectStyle}
        >
          <option value="">{t("students.allPolicies")}</option>
          {policies.map((p) => (
            <option key={p.id} value={p.id}>
              🕒 {p.name} ({p.enableTime}–{p.disableTime})
            </option>
          ))}
        </select>

        {/* Special groups toggle */}
        <label className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg cursor-pointer transition-colors"
          style={{ backgroundColor: "var(--surface)", color: "var(--text-primary)", border: "1px solid var(--surface-border)" }}>
          <input
            type="checkbox"
            checked={showOverridesOnly}
            onChange={(e) => onOverridesOnlyChange(e.target.checked)}
            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <span className="text-sm">⭐ {t("students.specialOnly")}</span>
        </label>

        {/* Clear all */}
        {hasFilters && (
          <button
            onClick={() => {
              onGroupChange("");
              onPolicyChange("");
              onStatusChange("all");
              onSearchChange("");
              onOverridesOnlyChange(false);
            }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
            style={{ backgroundColor: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--surface-border)" }}
          >
            ✕ {t("students.clearFilters")}
          </button>
        )}
      </div>
    </div>
  );
}
