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

  // Avatar color based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500",
      "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div>
      {/* Results count */}
      <p className="text-sm mb-3 theme-text-muted">
        {t("students.showingStudents", { count: students.length })}
      </p>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden shadow-sm"
        style={{ border: "1px solid var(--surface-border)", backgroundColor: "var(--surface)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: "var(--surface-secondary)", borderBottom: "1px solid var(--surface-border)" }}>
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider theme-text-muted">
                {t("students.tableStudent")}
              </th>
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider theme-text-muted">
                {t("students.tableEmail")}
              </th>
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider theme-text-muted">
                {t("students.tableClass")}
              </th>
              <th className="text-center px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider theme-text-muted">
                {t("students.tableStatus")}
              </th>
              <th className="text-center px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider theme-text-muted">
                {t("students.tableToggle")}
              </th>
              {hasActions && (
                <th className="text-center px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider theme-text-muted">
                  {t("students.tableActions")}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colCount} className="px-5 py-16 text-center theme-text-muted">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">{t("common.loading")}</span>
                  </div>
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 theme-text-muted">
                    <span className="text-3xl">📭</span>
                    <span className="text-sm">{t("common.noResults")}</span>
                  </div>
                </td>
              </tr>
            ) : (
              students.map((student, idx) => {
                const isSuspended = !!student.suspension;
                return (
                  <tr
                    key={student.id}
                    className="transition-colors hover:brightness-95"
                    style={{
                      borderBottom: idx < students.length - 1 ? "1px solid var(--surface-border)" : undefined,
                      backgroundColor: isSuspended ? "var(--badge-amber-bg)" : "var(--surface)",
                    }}
                  >
                    {/* Student name + avatar */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                            isSuspended ? "bg-amber-500" : getAvatarColor(student.displayName)
                          }`}
                        >
                          {isSuspended ? "⏸" : student.displayName[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-medium theme-text-primary block truncate">
                            {student.displayName}
                          </span>
                          {isSuspended && (
                            <span className="text-[11px] mt-0.5 block" style={{ color: "var(--badge-amber-text)" }}>
                              {t("students.suspendedUntil", { date: new Date(student.suspension!.endDate).toLocaleDateString(dateLocale) })}
                              {" — "}{student.suspension!.reason}
                            </span>
                          )}
                          {student.appliedPolicy && !isSuspended && (
                            <span className="text-[11px] theme-text-muted block mt-0.5">
                              🕒 {student.appliedPolicy}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-3.5">
                      <span className="text-sm theme-text-secondary truncate block max-w-[260px]">
                        {student.userPrincipalName}
                      </span>
                    </td>

                    {/* Groups / Class */}
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {student.groups && student.groups.length > 0 ? (
                          student.groups.map((g) => (
                            <span
                              key={g.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
                              style={g.policyId ? {
                                backgroundColor: "var(--badge-purple-bg)",
                                color: "var(--badge-purple-text)",
                                border: "1px solid var(--badge-purple-border)",
                              } : {
                                backgroundColor: "var(--badge-blue-bg)",
                                color: "var(--badge-blue-text)",
                                border: "1px solid var(--badge-blue-border)",
                              }}
                              title={g.policyName ? t("students.policyTooltip", { name: g.policyName }) : undefined}
                            >
                              {g.policyId && "⭐ "}{g.displayName}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm theme-text-muted">
                            {student.department || "—"}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-3.5 text-center">
                      {isSuspended ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: "var(--badge-amber-bg)", color: "var(--badge-amber-text)", border: "1px solid var(--badge-amber-border)" }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          {t("students.statusSuspended")}
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={student.accountEnabled ? {
                            backgroundColor: "var(--badge-green-bg)",
                            color: "var(--badge-green-text)",
                            border: "1px solid var(--badge-green-border)",
                          } : {
                            backgroundColor: "var(--badge-red-bg)",
                            color: "var(--badge-red-text)",
                            border: "1px solid var(--badge-red-border)",
                          }}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${student.accountEnabled ? "bg-emerald-500" : "bg-red-500"}`} />
                          {student.accountEnabled ? t("students.statusEnabled") : t("students.statusDisabled")}
                        </span>
                      )}
                    </td>

                    {/* Toggle button */}
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => handleToggle(student)}
                        disabled={toggling === student.id || isSuspended}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                          isSuspended
                            ? "opacity-40 cursor-not-allowed"
                            : "hover:shadow-sm"
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                        style={isSuspended ? { backgroundColor: "var(--surface-secondary)", color: "var(--text-muted)" } :
                          student.accountEnabled ? {
                            backgroundColor: "var(--badge-red-bg)", color: "var(--badge-red-text)", border: "1px solid var(--badge-red-border)",
                          } : {
                            backgroundColor: "var(--badge-green-bg)", color: "var(--badge-green-text)", border: "1px solid var(--badge-green-border)",
                          }
                        }
                        title={isSuspended ? t("students.cannotToggle") : ""}
                      >
                        {toggling === student.id ? (
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          </span>
                        ) : student.accountEnabled ? (
                          t("audit.actionDisable")
                        ) : (
                          t("audit.actionEnable")
                        )}
                      </button>
                    </td>

                    {/* Actions menu */}
                    {hasActions && (
                      <td className="px-5 py-3.5 text-center relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === student.id ? null : student.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors"
                          style={{ backgroundColor: "var(--surface-secondary)", color: "var(--text-secondary)" }}
                        >
                          ⋯
                        </button>
                        {openMenu === student.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-5 top-full mt-1 z-20 rounded-xl shadow-xl py-1.5 w-48 animate-in"
                            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)" }}
                          >
                            {isSuspended && onUnsuspend && (
                              <button
                                onClick={() => { setOpenMenu(null); onUnsuspend(student); }}
                                className="w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2.5"
                                style={{ color: "var(--badge-green-text)" }}
                              >
                                <span>▶️</span> {t("students.liftSuspension")}
                              </button>
                            )}
                            {!isSuspended && onSuspend && (
                              <button
                                onClick={() => { setOpenMenu(null); onSuspend(student); }}
                                className="w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2.5"
                                style={{ color: "var(--badge-amber-text)" }}
                              >
                                <span>⏸️</span> {t("students.suspend")}
                              </button>
                            )}
                            {onTransfer && (
                              <button
                                onClick={() => { setOpenMenu(null); onTransfer(student); }}
                                className="w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2.5"
                                style={{ color: "var(--badge-blue-text)" }}
                              >
                                <span>🔄</span> {t("students.transferClass")}
                              </button>
                            )}
                            {onDelete && (
                              <>
                                <div className="my-1.5 mx-3" style={{ borderTop: "1px solid var(--surface-border)" }} />
                                <button
                                  onClick={() => { setOpenMenu(null); onDelete(student.id, student.displayName); }}
                                  className="w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2.5"
                                  style={{ color: "var(--badge-red-text)" }}
                                >
                                  <span>🗑️</span> {t("students.removeStudent")}
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
