"use client";

import React, { useState, useRef, useEffect } from "react";
import type { StudentUser } from "@/types";
import { useTranslation } from "@/lib/i18n";

interface StudentTableProps {
  students: StudentUser[];
  onToggle: (id: string, enabled: boolean) => Promise<void>;
  onDelete?: (id: string, displayName: string) => void;
  onSuspend?: (student: StudentUser) => void;
  onUnsuspend?: (student: StudentUser) => void;
  onTransfer?: (student: StudentUser) => void;
  loading?: boolean;
}

export function StudentTable({
  students,
  onToggle,
  onDelete,
  onSuspend,
  onUnsuspend,
  onTransfer,
  loading,
}: StudentTableProps) {
  const { t, locale } = useTranslation();
  const localeMap: Record<string, string> = { en: "en-GB", "nb-NO": "no-NO", de: "de-DE", es: "es-ES", pt: "pt-PT", sv: "sv-SE", da: "da-DK" };
  const dateLocale = localeMap[locale] || "en-GB";

  const [toggling, setToggling] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleToggle = async (student: StudentUser) => {
    setToggling(student.id);
    try {
      await onToggle(student.id, !student.accountEnabled);
    } finally {
      setToggling(null);
    }
  };

  const hasActions = !!(onSuspend || onUnsuspend || onTransfer || onDelete);
  const colCount = 5 + (hasActions ? 1 : 0);

  return (
    <div>
      {/* Results count */}
      <p className="text-sm text-gray-500 mb-3">
        {t("students.showingStudents", { count: students.length })}
      </p>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t("students.tableStudent")}
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t("students.tableEmail")}
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t("students.tableClass")}
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t("students.tableStatus")}
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t("students.tableToggle")}
              </th>
              {hasActions && (
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t("students.tableActions")}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-12 text-center text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    {t("common.loading")}
                  </div>
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-12 text-center text-gray-400">
                  {t("common.noResults")}
                </td>
              </tr>
            ) : (
              students.map((student) => {
                const isSuspended = !!student.suspension;
                return (
                  <tr
                    key={student.id}
                    className={`hover:bg-gray-50 transition-colors ${isSuspended ? "bg-orange-50/50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            isSuspended
                              ? "bg-orange-100 text-orange-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {isSuspended ? "⏸" : student.displayName[0]}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {student.displayName}
                          </span>
                          {isSuspended && (
                            <div className="text-xs text-orange-600 mt-0.5">
                              {t("students.suspendedUntil", { date: new Date(student.suspension!.endDate).toLocaleDateString(dateLocale) })}
                              {" — "}
                              {student.suspension!.reason}
                            </div>
                          )}
                          {student.appliedPolicy && !isSuspended && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              🕒 {student.appliedPolicy}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {student.userPrincipalName}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {student.groups && student.groups.length > 0 ? (
                          student.groups.map((g) => (
                            <span
                              key={g.id}
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                g.policyId
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                              title={g.policyName ? t("students.policyTooltip", { name: g.policyName }) : undefined}
                            >
                              {g.policyId && "⭐ "}{g.displayName}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">
                            {student.department || "—"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isSuspended ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                          {t("students.statusSuspended")}
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            student.accountEnabled
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              student.accountEnabled ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          {student.accountEnabled ? t("students.statusEnabled") : t("students.statusDisabled")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(student)}
                        disabled={toggling === student.id || isSuspended}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          isSuspended
                            ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                            : student.accountEnabled
                              ? "bg-red-50 text-red-700 hover:bg-red-100"
                              : "bg-green-50 text-green-700 hover:bg-green-100"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={isSuspended ? t("students.cannotToggle") : ""}
                      >
                        {toggling === student.id ? (
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ...
                          </span>
                        ) : student.accountEnabled ? (
                          t("audit.actionDisable")
                        ) : (
                          t("audit.actionEnable")
                        )}
                      </button>
                    </td>
                    {hasActions && (
                      <td className="px-4 py-3 text-center relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === student.id ? null : student.id)}
                          className="px-2 py-1.5 text-xs font-medium rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          ⋯
                        </button>
                        {openMenu === student.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-4 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-44"
                          >
                            {isSuspended && onUnsuspend && (
                              <button
                                onClick={() => { setOpenMenu(null); onUnsuspend(student); }}
                                className="w-full text-left px-3 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors"
                              >
                                ▶️ {t("students.liftSuspension")}
                              </button>
                            )}
                            {!isSuspended && onSuspend && (
                              <button
                                onClick={() => { setOpenMenu(null); onSuspend(student); }}
                                className="w-full text-left px-3 py-2 text-sm text-orange-700 hover:bg-orange-50 transition-colors"
                              >
                                ⏸️ {t("students.suspend")}
                              </button>
                            )}
                            {onTransfer && (
                              <button
                                onClick={() => { setOpenMenu(null); onTransfer(student); }}
                                className="w-full text-left px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors"
                              >
                                🔄 {t("students.transferClass")}
                              </button>
                            )}
                            {onDelete && (
                              <>
                                <div className="border-t border-gray-100 my-1" />
                                <button
                                  onClick={() => { setOpenMenu(null); onDelete(student.id, student.displayName); }}
                                  className="w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                                >
                                  🗑️ {t("students.removeStudent")}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
