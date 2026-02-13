"use client";

import React, { useState } from "react";
import type { GroupInfo } from "@/types";
import { useTranslation } from "@/lib/i18n";

interface TransferDialogProps {
  open: boolean;
  studentName: string;
  currentGroupId?: string;
  groups: GroupInfo[];
  onConfirm: (fromGroupId: string, toGroupId: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function TransferDialog({
  open,
  studentName,
  currentGroupId,
  groups,
  onConfirm,
  onCancel,
  loading,
}: TransferDialogProps) {
  const [fromGroupId, setFromGroupId] = useState(currentGroupId || "");
  const [toGroupId, setToGroupId] = useState("");
  const { t } = useTranslation();

  if (!open) return null;

  const handleConfirm = () => {
    if (!fromGroupId || !toGroupId || fromGroupId === toGroupId) return;
    onConfirm(fromGroupId, toGroupId);
    setFromGroupId("");
    setToGroupId("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          🔄 {t("transfer.title")}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {t("transfer.description", { name: studentName })}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("transfer.fromLabel")}
            </label>
            <select
              value={fromGroupId}
              onChange={(e) => setFromGroupId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t("transfer.selectCurrent")}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.displayName}
                  {g.policyName ? ` (${g.policyName})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="text-center text-gray-400 text-lg">↓</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("transfer.toLabel")}
            </label>
            <select
              value={toGroupId}
              onChange={(e) => setToGroupId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t("transfer.selectDestination")}</option>
              {groups
                .filter((g) => g.id !== fromGroupId)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.displayName}
                    {g.policyName ? ` (${g.policyName})` : ""}
                  </option>
                ))}
            </select>
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
            disabled={loading || !fromGroupId || !toGroupId || fromGroupId === toGroupId}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("transfer.transferring") : t("transfer.transferStudent")}
          </button>
        </div>
      </div>
    </div>
  );
}
