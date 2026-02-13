"use client";

import React, { useState } from "react";
import type { StaffUser } from "@/types";
import { useTranslation } from "@/lib/i18n";

interface OffboardDialogProps {
  open: boolean;
  user: StaffUser | null;
  onConfirm: (data: {
    userId: string;
    removeLicenses: boolean;
    disableAccount: boolean;
    revokeSessions: boolean;
    removeFromGroups: boolean;
    convertToSharedMailbox: boolean;
    forwardEmail?: string;
    offboardReason: string;
  }) => void;
  onCancel: () => void;
  loading?: boolean;
}

const OFFBOARD_REASONS = [
  "resigned",
  "retired",
  "contract_ended",
  "terminated",
  "transferred",
  "other",
] as const;

export function OffboardDialog({
  open,
  user,
  onConfirm,
  onCancel,
  loading,
}: OffboardDialogProps) {
  const [removeLicenses, setRemoveLicenses] = useState(true);
  const [disableAccount, setDisableAccount] = useState(true);
  const [revokeSessions, setRevokeSessions] = useState(true);
  const [removeFromGroups, setRemoveFromGroups] = useState(true);
  const [convertToSharedMailbox, setConvertToSharedMailbox] = useState(false);
  const [forwardEmail, setForwardEmail] = useState("");
  const [reason, setReason] = useState<string>("resigned");
  const [customReason, setCustomReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const { t } = useTranslation();

  if (!open || !user) return null;

  const handleConfirm = () => {
    const offboardReason = reason === "other" ? customReason.trim() : t(`staffAdmin.reason_${reason}` as string);
    if (!offboardReason) return;
    onConfirm({
      userId: user.id,
      removeLicenses,
      disableAccount,
      revokeSessions,
      removeFromGroups,
      convertToSharedMailbox,
      forwardEmail: forwardEmail.trim() || undefined,
      offboardReason,
    });
    // Reset
    setRemoveLicenses(true); setDisableAccount(true); setRevokeSessions(true);
    setRemoveFromGroups(true); setConvertToSharedMailbox(false);
    setForwardEmail(""); setReason("resigned"); setCustomReason(""); setConfirmed(false);
  };

  const licenseCount = user.assignedLicenses?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="theme-surface rounded-xl shadow-xl w-full max-w-lg p-6 mx-4 border theme-border max-h-[85vh] overflow-y-auto">
        <h3 className="text-lg font-bold theme-text-primary mb-1 flex items-center gap-2">
          <span className="text-red-500">⚠️</span> {t("staffAdmin.offboardTitle")}
        </h3>
        <p className="text-sm theme-text-secondary mb-2">
          {t("staffAdmin.offboardDesc")}
        </p>

        {/* User info card */}
        <div className="rounded-lg p-3 mb-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-200 dark:bg-red-800 flex items-center justify-center text-red-700 dark:text-red-200 font-bold text-sm">
              {user.displayName[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold theme-text-primary">{user.displayName}</p>
              <p className="text-xs theme-text-muted">{user.userPrincipalName}</p>
              <p className="text-xs theme-text-muted">{user.jobTitle || "—"} • {user.department || "—"} • {licenseCount} {t("staffAdmin.licensesCount")}</p>
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="mb-4">
          <label className="block text-xs font-semibold theme-text-primary mb-1.5">
            📝 {t("staffAdmin.offboardReason")}
          </label>
          <select value={reason} onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border theme-border theme-surface theme-text-primary focus:outline-none focus:ring-2 focus:ring-red-500 mb-2">
            {OFFBOARD_REASONS.map((r) => (
              <option key={r} value={r}>{t(`staffAdmin.reason_${r}` as string)}</option>
            ))}
          </select>
          {reason === "other" && (
            <input type="text" value={customReason} onChange={(e) => setCustomReason(e.target.value)}
              placeholder={t("staffAdmin.specifyReason")}
              className="w-full px-3 py-2 text-sm rounded-lg border theme-border theme-surface theme-text-primary focus:outline-none focus:ring-2 focus:ring-red-500" />
          )}
        </div>

        {/* Actions checklist */}
        <div className="mb-4">
          <label className="block text-xs font-semibold theme-text-primary mb-2">
            🔧 {t("staffAdmin.offboardActions")}
          </label>
          <div className="space-y-2">
            {[
              { key: "disable", checked: disableAccount, onChange: setDisableAccount, icon: "🔒", label: t("staffAdmin.actionDisable"), desc: t("staffAdmin.actionDisableDesc") },
              { key: "revoke", checked: revokeSessions, onChange: setRevokeSessions, icon: "🔑", label: t("staffAdmin.actionRevoke"), desc: t("staffAdmin.actionRevokeDesc") },
              { key: "licenses", checked: removeLicenses, onChange: setRemoveLicenses, icon: "📋", label: `${t("staffAdmin.actionLicenses")} (${licenseCount})`, desc: t("staffAdmin.actionLicensesDesc") },
              { key: "groups", checked: removeFromGroups, onChange: setRemoveFromGroups, icon: "📁", label: t("staffAdmin.actionGroups"), desc: t("staffAdmin.actionGroupsDesc") },
              { key: "shared", checked: convertToSharedMailbox, onChange: setConvertToSharedMailbox, icon: "📧", label: t("staffAdmin.actionShared"), desc: t("staffAdmin.actionSharedDesc") },
            ].map((item) => (
              <label key={item.key} className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                item.checked ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800" : "theme-surface-secondary border theme-border"
              }`}>
                <input type="checkbox" checked={item.checked} onChange={(e) => item.onChange(e.target.checked)}
                  className="rounded border-gray-300 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-medium theme-text-primary">{item.icon} {item.label}</div>
                  <div className="text-[10px] theme-text-muted">{item.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Forward email */}
        <div className="mb-4">
          <label className="block text-xs font-medium theme-text-primary mb-1">
            📨 {t("staffAdmin.forwardEmail")} <span className="theme-text-muted">({t("staffAdmin.optional")})</span>
          </label>
          <input type="email" value={forwardEmail} onChange={(e) => setForwardEmail(e.target.value)}
            placeholder="colleague@school.no"
            className="w-full px-3 py-2 text-sm rounded-lg border theme-border theme-surface theme-text-primary focus:outline-none focus:ring-2 focus:ring-red-500" />
        </div>

        {/* Confirmation checkbox */}
        <label className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700 mb-4 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}
            className="rounded border-gray-300 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300">
            <span className="font-semibold">{t("staffAdmin.confirmOffboard")}</span>
            <br />
            <span className="text-[10px]">{t("staffAdmin.confirmOffboardDesc", { name: user.displayName })}</span>
          </div>
        </label>

        <div className="flex justify-end gap-2 pt-3 border-t theme-border">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg theme-surface-secondary theme-text-secondary hover:opacity-80 transition-opacity">
            {t("common.cancel")}
          </button>
          <button onClick={handleConfirm} disabled={loading || !confirmed || (reason === "other" && !customReason.trim())}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {loading ? t("common.processing") : `🚫 ${t("staffAdmin.offboardBtn")}`}
          </button>
        </div>
      </div>
    </div>
  );
}
