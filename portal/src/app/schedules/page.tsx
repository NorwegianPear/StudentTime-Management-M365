"use client";

import { useEffect, useState, useCallback } from "react";
import type { SchedulePolicy, GroupInfo } from "@/types";
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold theme-text-primary">{t("schedules.title")}</h1>
        <p className="text-gray-500 mt-1">
          {t("schedules.subtitle")}
        </p>
      </div>

      {/* Current time banner */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
        <span className="text-xl">🕐</span>
        <div>
          <p className="text-sm font-medium text-blue-800">
            {t("schedules.currentTime", { time: currentHHMM, day: todayName })}
          </p>
          <p className="text-xs text-blue-600 mt-0.5">
            {t("schedules.activePolicies", { count: activePolicies.length }).split("|")[activePolicies.length === 1 ? 0 : 1]}
            {" "}{t("schedules.definedOnPolicies")}
          </p>
        </div>
      </div>

      {/* Combined timeline view */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold theme-text-primary mb-4">{t("schedules.dailyTimeline")}</h2>

        {activePolicies.length === 0 ? (
          <p className="text-gray-400 text-center py-8">{t("schedules.noActivePolicies")}</p>
        ) : (
          <div className="space-y-4">
            {activePolicies.map((policy) => {
              const enablePct = timeToPercent(policy.enableTime);
              const disablePct = timeToPercent(policy.disableTime);
              const widthPct = disablePct - enablePct;
              const isScheduledToday = policy.daysOfWeek.includes(todayName);
              const isWithinWindow =
                isScheduledToday &&
                currentHHMM >= policy.enableTime &&
                currentHHMM < policy.disableTime;
              const assignedGroupNames = policy.assignedGroupNames?.length
                ? policy.assignedGroupNames
                : policy.assignedGroupIds.map(
                    (id) => groups.find((g) => g.id === id)?.displayName ?? id.slice(0, 8)
                  );

              return (
                <div key={policy.id} className="group">
                  {/* Policy label */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isWithinWindow ? "bg-green-500 animate-pulse" : "bg-gray-300"
                        }`}
                      />
                      <span className="text-sm font-medium text-gray-800">{policy.name}</span>
                      {isWithinWindow && (
                        <span className="text-xs text-green-600 font-medium">{t("schedules.activeNow")}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {policy.enableTime} – {policy.disableTime}
                    </span>
                  </div>

                  {/* Timeline bar */}
                  <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                    {/* Enabled window */}
                    <div
                      className={`absolute top-0 bottom-0 rounded-full ${
                        isScheduledToday ? "bg-green-300" : "bg-green-100"
                      }`}
                      style={{ left: `${enablePct}%`, width: `${widthPct}%` }}
                    />

                    {/* Current time marker */}
                    {isScheduledToday && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-blue-600 z-10"
                        style={{ left: `${timeToPercent(currentHHMM)}%` }}
                      />
                    )}
                  </div>

                  {/* Groups assigned */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {assignedGroupNames.length > 0 ? (
                      assignedGroupNames.map((name, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded"
                        >
                          {name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400 italic">{t("schedules.noGroupsAssigned")}</span>
                    )}
                    {!isScheduledToday && (
                      <span className="text-xs text-gray-400 ml-2">{t("schedules.notScheduledToday")}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Time axis */}
        <div className="flex justify-between mt-4 border-t border-gray-100 pt-2">
          {[0, 4, 8, 12, 16, 20, 24].map((h) => (
            <span key={h} className="text-xs text-gray-400">
              {h.toString().padStart(2, "0")}:00
            </span>
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-6 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-300" />
            <span className="text-xs text-gray-600">{t("schedules.legend.accessEnabled")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-100 border border-gray-200" />
            <span className="text-xs text-gray-600">{t("schedules.legend.accessDisabled")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-blue-600" />
            <span className="text-xs text-gray-600">{t("schedules.legend.currentTime")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-gray-600">{t("schedules.legend.activeNow")}</span>
          </div>
        </div>
      </div>

      {/* All policies table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold theme-text-primary">{t("schedules.allPolicies")}</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">{t("schedules.tablePolicy")}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">{t("schedules.tableWindow")}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">{t("schedules.tableDays")}</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">{t("schedules.tableGroups")}</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-gray-600 uppercase">{t("schedules.tableStatus")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {policies.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <span className="text-sm font-medium text-gray-900">{p.name}</span>
                  {p.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
                  )}
                </td>
                <td className="px-5 py-3 text-sm text-gray-700">
                  {p.enableTime} – {p.disableTime}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {p.daysOfWeek.map((d) => (
                      <span key={d} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                        {d.slice(0, 3)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3 text-sm text-gray-500">
                  {p.assignedGroupNames?.length
                    ? p.assignedGroupNames.join(", ")
                    : p.assignedGroupIds.length > 0
                      ? t("schedules.groupCount", { count: p.assignedGroupIds.length })
                      : "None"}
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {p.isActive ? t("common.active") : t("common.inactive")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
