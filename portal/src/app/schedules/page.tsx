"use client";

import { useEffect, useState, useCallback } from "react";
import type { SchedulePolicy, GroupInfo } from "@/types";
import { PageHeader } from "@/components/PageHeader";
import { useTranslation } from "@/lib/i18n";

export default function SchedulesPage() {
  const [policies, setPolicies] = useState<SchedulePolicy[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
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
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { t } = useTranslation();

  // Build managed-groups lookup (already prefix-filtered by /api/groups)
  const managedGroupIds = new Set(groups.map((g) => g.id));
  const managedGroupNameMap = new Map(groups.map((g) => [g.id, g.displayName]));

  /** Resolve a policy's group IDs to only managed group names */
  const resolveManagedGroups = (policy: SchedulePolicy): string[] =>
    policy.assignedGroupIds
      .filter((id) => managedGroupIds.has(id))
      .map((id) => managedGroupNameMap.get(id) || id);

  const activePolicies = policies.filter((p) => p.isActive);
  const now = new Date();
  const currentHHMM = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  const todayName = now.toLocaleDateString("en-US", { weekday: "long" });

  // Helper: compute timeline percentage for a time string "HH:mm"
  const timeToPercent = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return ((h * 60 + m) / 1440) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t("schedules.title")} subtitle={t("schedules.subtitle")} />

      {/* Current time banner */}
      <div className="mb-6 p-4 rounded-lg flex items-center gap-3 border" style={{ background: "var(--badge-blue-bg)", color: "var(--badge-blue-text)", borderColor: "var(--badge-blue-border)" }}>
        <span className="text-xl">🕐</span>
        <div>
          <p className="text-sm font-medium">
            {t("schedules.currentTime", { time: currentHHMM, day: todayName })}
          </p>
          <p className="text-xs mt-0.5 opacity-80">
            {t("schedules.activePolicies", { count: activePolicies.length }).split("|")[activePolicies.length === 1 ? 0 : 1]}
            {" "}{t("schedules.definedOnPolicies")}
          </p>
        </div>
      </div>

      {/* Combined timeline view */}
      <div className="theme-surface rounded-xl border theme-border p-6 mb-6">
        <h2 className="text-lg font-semibold theme-text-primary mb-4">{t("schedules.dailyTimeline")}</h2>

        {activePolicies.length === 0 ? (
          <p className="theme-text-muted text-center py-8">{t("schedules.noActivePolicies")}</p>
        ) : (
          <div className="space-y-5">
            {activePolicies.map((policy) => {
              const enablePct = timeToPercent(policy.enableTime);
              const disablePct = timeToPercent(policy.disableTime);
              const widthPct = disablePct - enablePct;
              const isScheduledToday = policy.daysOfWeek.includes(todayName);
              const isWithinWindow =
                isScheduledToday &&
                currentHHMM >= policy.enableTime &&
                currentHHMM < policy.disableTime;
              const policyGroups = resolveManagedGroups(policy);

              return (
                <div key={policy.id}>
                  {/* Policy label */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: isWithinWindow ? "var(--badge-green-text)" : "var(--text-muted)" }}
                      />
                      <span className="text-sm font-semibold theme-text-primary">{policy.name}</span>
                      {isWithinWindow && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--badge-green-bg)", color: "var(--badge-green-text)" }}>{t("schedules.activeNow")}</span>
                      )}
                    </div>
                    <span className="text-xs theme-text-muted font-medium">
                      {policy.enableTime} – {policy.disableTime}
                    </span>
                  </div>

                  {/* Timeline bar */}
                  <div className="relative">
                    {/* Hour markers */}
                    <div className="flex justify-between mb-1 px-0.5">
                      {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
                        <span key={h} className="text-[9px] theme-text-muted w-0 text-center">{String(h === 24 ? 0 : h).padStart(2, "0")}</span>
                      ))}
                    </div>
                    <div className="h-7 rounded-md relative overflow-hidden" style={{ background: "var(--surface-secondary)" }}>
                      {/* Grid lines */}
                      {[3, 6, 9, 12, 15, 18, 21].map((h) => (
                        <div key={h} className="absolute top-0 bottom-0 w-px" style={{ left: `${(h / 24) * 100}%`, background: "var(--surface-border)" }} />
                      ))}

                      {/* Enabled window */}
                      <div
                        className="absolute top-0.5 bottom-0.5 rounded transition-all flex items-center justify-center"
                        style={{
                          left: `${enablePct}%`,
                          width: `${widthPct}%`,
                          background: isWithinWindow ? "var(--badge-green-text)" : "var(--text-muted)",
                          opacity: isScheduledToday ? 0.8 : 0.3,
                        }}
                      >
                        {widthPct > 15 && (
                          <span className="text-white text-[10px] font-semibold tracking-wide">
                            {policy.enableTime} — {policy.disableTime}
                          </span>
                        )}
                      </div>

                      {/* Current time marker */}
                      {isScheduledToday && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 z-10"
                          style={{ left: `${timeToPercent(currentHHMM)}%`, background: "var(--accent)" }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Groups assigned */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {policyGroups.length > 0 ? (
                      policyGroups.map((name, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
                          style={{ background: "var(--badge-blue-bg)", color: "var(--badge-blue-text)", borderWidth: 1, borderColor: "var(--badge-blue-border)" }}
                        >
                          {name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs theme-text-muted italic">{t("schedules.noGroupsAssigned")}</span>
                    )}
                    {!isScheduledToday && (
                      <span className="text-xs theme-text-muted ml-1">({t("schedules.notScheduledToday")})</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Time axis */}
        <div className="flex justify-between mt-5 border-t pt-3" style={{ borderColor: "var(--surface-border)" }}>
          {[0, 4, 8, 12, 16, 20, 24].map((h) => (
            <span key={h} className="text-[10px] theme-text-muted">
              {h.toString().padStart(2, "0")}:00
            </span>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-5 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: "var(--badge-green-text)", opacity: 0.8 }} />
            <span className="text-xs theme-text-secondary">{t("schedules.legend.accessEnabled")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border" style={{ background: "var(--surface-secondary)", borderColor: "var(--surface-border)" }} />
            <span className="text-xs theme-text-secondary">{t("schedules.legend.accessDisabled")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 rounded" style={{ background: "var(--accent)" }} />
            <span className="text-xs theme-text-secondary">{t("schedules.legend.currentTime")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--badge-green-text)" }} />
            <span className="text-xs theme-text-secondary">{t("schedules.legend.activeNow")}</span>
          </div>
        </div>
      </div>

      {/* All policies table */}
      <div className="theme-surface rounded-xl border theme-border overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--surface-border)" }}>
          <h2 className="text-lg font-semibold theme-text-primary">{t("schedules.allPolicies")}</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ backgroundColor: "var(--table-header-bg, var(--surface-secondary))", borderColor: "var(--surface-border)" }}>
              <th className="text-left px-5 py-3 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t("schedules.tablePolicy")}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t("schedules.tableWindow")}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t("schedules.tableDays")}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t("schedules.tableGroups")}</th>
              <th className="text-center px-5 py-3 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t("schedules.tableStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => {
              const pGroups = resolveManagedGroups(p);
              return (
                <tr key={p.id} className="border-b theme-border hover:opacity-90 transition-colors">
                  <td className="px-5 py-3">
                    <span className="text-sm font-medium theme-text-primary">{p.name}</span>
                    {p.description && (
                      <p className="text-xs theme-text-muted mt-0.5">{p.description}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm theme-text-secondary font-medium">
                    {p.enableTime} – {p.disableTime}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.daysOfWeek.map((d) => (
                        <span key={d} className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: "var(--surface-secondary)", color: "var(--text-secondary)" }}>
                          {d.slice(0, 3)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {pGroups.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {pGroups.map((name, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: "var(--badge-blue-bg)", color: "var(--badge-blue-text)" }}>
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs theme-text-muted">{t("schedules.noGroupsAssigned")}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        background: p.isActive ? "var(--badge-green-bg)" : "var(--badge-yellow-bg)",
                        color: p.isActive ? "var(--badge-green-text)" : "var(--badge-yellow-text)",
                        borderWidth: 1,
                        borderColor: p.isActive ? "var(--badge-green-border)" : "var(--badge-yellow-border)",
                      }}
                    >
                      {p.isActive ? t("common.active") : t("common.inactive")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
