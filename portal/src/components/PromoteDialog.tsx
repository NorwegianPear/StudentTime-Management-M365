"use client";

import React, { useState } from "react";
import type { GroupInfo } from "@/types";
import { useTranslation } from "@/lib/i18n";

interface PromoteDialogProps {
  open: boolean;
  groups: GroupInfo[];
  onConfirm: (promotions: { fromGroupId: string; toGroupId: string }[]) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function PromoteDialog({
  open,
  groups,
  onConfirm,
  onCancel,
  loading,
}: PromoteDialogProps) {
  const [mappings, setMappings] = useState<{ from: string; to: string }[]>([
    { from: "", to: "" },
  ]);

  const { t } = useTranslation();

  if (!open) return null;

  const addMapping = () => {
    setMappings([...mappings, { from: "", to: "" }]);
  };

  const removeMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const updateMapping = (index: number, field: "from" | "to", value: string) => {
    const updated = [...mappings];
    updated[index][field] = value;
    setMappings(updated);
  };

  const validMappings = mappings.filter(
    (m) => m.from && m.to && m.from !== m.to
  );

  const handleConfirm = () => {
    if (validMappings.length === 0) return;
    onConfirm(
      validMappings.map((m) => ({
        fromGroupId: m.from,
        toGroupId: m.to,
      }))
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          🎓 {t("promote.title")}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {t("promote.description")}
        </p>

        <div className="space-y-3">
          {mappings.map((mapping, index) => (
            <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <select
                value={mapping.from}
                onChange={(e) => updateMapping(index, "from", e.target.value)}
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t("promote.from")}</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.displayName} ({g.memberCount})
                  </option>
                ))}
              </select>

              <span className="text-gray-400 text-lg">→</span>

              <select
                value={mapping.to}
                onChange={(e) => updateMapping(index, "to", e.target.value)}
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t("promote.to")}</option>
                {groups
                  .filter((g) => g.id !== mapping.from)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.displayName}
                    </option>
                  ))}
              </select>

              {mappings.length > 1 && (
                <button
                  onClick={() => removeMapping(index)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addMapping}
          className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {t("promote.addMapping")}
        </button>

        {validMappings.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            {t("promote.warning", { count: validMappings.length })}
          </div>
        )}

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
            disabled={loading || validMappings.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("promote.promoting") : t("promote.promoteClasses", { count: validMappings.length })}
          </button>
        </div>
      </div>
    </div>
  );
}
