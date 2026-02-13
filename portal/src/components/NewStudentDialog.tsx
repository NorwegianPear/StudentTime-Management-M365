"use client";

import React, { useState } from "react";
import type { GroupInfo } from "@/types";
import { useTranslation } from "@/lib/i18n";

interface NewStudentDialogProps {
  open: boolean;
  groups: GroupInfo[];
  onConfirm: (firstName: string, lastName: string, groupId: string, department?: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function NewStudentDialog({
  open,
  groups,
  onConfirm,
  onCancel,
  loading,
}: NewStudentDialogProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [department, setDepartment] = useState("");

  const { t } = useTranslation();

  if (!open) return null;

  const handleConfirm = () => {
    if (!firstName.trim() || !lastName.trim() || !groupId) return;
    onConfirm(firstName.trim(), lastName.trim(), groupId, department.trim() || undefined);
    setFirstName("");
    setLastName("");
    setGroupId("");
    setDepartment("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          ➕ {t("newStudent.title")}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {t("newStudent.description")}
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("newStudent.firstName")}
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Emma"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("newStudent.lastName")}
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Hansen"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("newStudent.classGroup")}
            </label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t("newStudent.selectClass")}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.displayName}
                  {g.policyName ? ` (${g.policyName})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("newStudent.department")} <span className="text-gray-400">{t("newStudent.optional")}</span>
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g., Class 8A"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {firstName && lastName && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <strong>{t("newStudent.preview")}</strong>{" "}
              {firstName.toLowerCase()}.{lastName.toLowerCase()}@ateara.onmicrosoft.com
            </div>
          )}
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
            disabled={loading || !firstName.trim() || !lastName.trim() || !groupId}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("newStudent.creating") : t("newStudent.createStudent")}
          </button>
        </div>
      </div>
    </div>
  );
}
