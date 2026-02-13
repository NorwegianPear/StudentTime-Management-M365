"use client";

import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";

interface SuspendDialogProps {
  open: boolean;
  studentName: string;
  onConfirm: (reason: string, endDate: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function SuspendDialog({
  open,
  studentName,
  onConfirm,
  onCancel,
  loading,
}: SuspendDialogProps) {
  const [reason, setReason] = useState("");
  const [endDate, setEndDate] = useState("");
  const { t } = useTranslation();

  // Default: tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().slice(0, 10);

  if (!open) return null;

  const handleConfirm = () => {
    if (!reason.trim() || !endDate) return;
    onConfirm(reason.trim(), endDate);
    setReason("");
    setEndDate("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          ⏸️ {t("suspendDialog.title")}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {t("suspendDialog.description", { name: studentName })}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("suspendDialog.reasonLabel")}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("suspendDialog.reasonPlaceholder")}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("suspendDialog.endDateLabel")}
            </label>
            <input
              type="date"
              value={endDate}
              min={minDateStr}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !reason.trim() || !endDate}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("suspendDialog.suspending") : t("suspendDialog.suspendStudent")}
          </button>
        </div>
      </div>
    </div>
  );
}
