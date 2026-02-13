"use client";

import { useEffect, useState, useCallback } from "react";
import type { PendingGroupChange } from "@/types";
import { useTranslation } from "@/lib/i18n";

export default function PendingChangesPage() {
  const [changes, setChanges] = useState<PendingGroupChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "failed">("all");
  const { t, locale } = useTranslation();
  const localeMap: Record<string, string> = { en: "en-GB", "nb-NO": "no-NO", de: "de-DE", es: "es-ES", pt: "pt-PT", sv: "sv-SE", da: "da-DK" };
  const dateLocale = localeMap[locale] || "en-GB";

  const fetchChanges = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/pending-changes");
      const data = await res.json();
      if (data.success) setChanges(data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChanges();
  }, [fetchChanges]);

  const filtered =
    filter === "all" ? changes : changes.filter((c) => c.status === filter);

  const pendingCount = changes.filter((c) => c.status === "pending").length;
  const completedCount = changes.filter((c) => c.status === "completed").length;
  const failedCount = changes.filter((c) => c.status === "failed").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold theme-text-primary">{t("pendingChanges.title")}</h1>
          <p className="text-gray-500 mt-1">
            {t("pendingChanges.subtitle")}
          </p>
        </div>
        <button
          onClick={fetchChanges}
          className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          🔄 {t("common.refresh")}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: t("pendingChanges.total"), count: changes.length, color: "bg-gray-50 border-gray-200 text-gray-700" },
          { label: t("common.pending"), count: pendingCount, color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
          { label: t("common.completed"), count: completedCount, color: "bg-green-50 border-green-200 text-green-700" },
          { label: t("common.failed"), count: failedCount, color: "bg-red-50 border-red-200 text-red-700" },
        ].map((stat) => (
          <div key={stat.label} className={`p-4 rounded-xl border ${stat.color}`}>
            <p className="text-2xl font-bold">{stat.count}</p>
            <p className="text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Info */}
      {pendingCount > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
          <span className="text-xl">⏳</span>
          <div>
            <p className="text-sm font-medium text-yellow-800">
              {t("pendingChanges.infoBanner", { count: pendingCount })}
            </p>
            <p className="text-xs text-yellow-600 mt-0.5">{t("pendingChanges.infoText")}</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4 w-fit">
        {(["all", "pending", "completed", "failed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === f
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {f === "all" ? t("common.all") : f === "pending" ? t("common.pending") : f === "completed" ? t("common.completed") : t("common.failed")}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{t("pendingChanges.tableStudent")}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{t("pendingChanges.tableAction")}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{t("pendingChanges.tableGroup")}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{t("pendingChanges.tableReason")}</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{t("pendingChanges.tableStatus")}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{t("pendingChanges.tableRequested")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  {t("pendingChanges.noChanges")}
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {c.studentName}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        c.action === "add"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {c.action === "add" ? t("pendingChanges.actionAdd") : t("pendingChanges.actionRemove")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.groupName}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                      {c.reason.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : c.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(c.requestedAt).toLocaleString(dateLocale)}
                    <div className="text-gray-400">{t("pendingChanges.requestedBy", { name: c.requestedBy })}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
