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
    <div className="mb-4 space-y-3">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("students.searchPlaceholder")}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        </div>
        {hasFilters && (
          <span className="text-xs text-gray-500">
            {filteredCount} of {totalCount}
          </span>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {t("common.filter")}:
        </span>

        {/* Status filter */}
        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">{t("students.allStatuses")}</option>
          <option value="enabled">{t("students.enabledStatus")}</option>
          <option value="disabled">{t("students.disabledStatus")}</option>
          <option value="suspended">{t("students.suspendedStatus", { count: suspendedCount })}</option>
        </select>

        {/* Group/Class filter */}
        <select
          value={selectedGroup}
          onChange={(e) => onGroupChange(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t("students.allClasses")}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.displayName} ({g.memberCount ?? "?"})
              {g.policyName ? ` — ${g.policyName}` : ""}
            </option>
          ))}
        </select>

        {/* Policy filter */}
        <select
          value={selectedPolicy}
          onChange={(e) => onPolicyChange(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t("students.allPolicies")}</option>
          {policies.map((p) => (
            <option key={p.id} value={p.id}>
              🕒 {p.name} ({p.enableTime}–{p.disableTime})
            </option>
          ))}
        </select>

        {/* Special groups toggle */}
        <label className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={showOverridesOnly}
            onChange={(e) => onOverridesOnlyChange(e.target.checked)}
            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <span className="text-gray-700">{t("students.specialOnly")}</span>
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
            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {t("students.clearFilters")}
          </button>
        )}
      </div>
    </div>
  );
}
