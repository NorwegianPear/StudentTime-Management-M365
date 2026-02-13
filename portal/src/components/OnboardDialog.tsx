"use client";

import React, { useState } from "react";
import type { AvailableLicense, StaffRole, GroupInfo } from "@/types";
import { useTranslation } from "@/lib/i18n";

interface OnboardDialogProps {
  open: boolean;
  licenses: AvailableLicense[];
  groups: GroupInfo[];
  onConfirm: (data: {
    firstName: string;
    lastName: string;
    role: StaffRole;
    department?: string;
    jobTitle?: string;
    officeLocation?: string;
    mobilePhone?: string;
    licenseSkuIds: string[];
    groupIds?: string[];
  }) => void;
  onCancel: () => void;
  loading?: boolean;
}

const STAFF_ROLES: StaffRole[] = ["Teacher", "IT-Staff", "Administrative", "Principal", "Other"];

export function OnboardDialog({
  open,
  licenses,
  groups,
  onConfirm,
  onCancel,
  loading,
}: OnboardDialogProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<StaffRole>("Teacher");
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [officeLocation, setOfficeLocation] = useState("");
  const [mobilePhone, setMobilePhone] = useState("");
  const [selectedLicenses, setSelectedLicenses] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2>(1);

  const { t } = useTranslation();

  if (!open) return null;

  const handleConfirm = () => {
    if (!firstName.trim() || !lastName.trim()) return;
    onConfirm({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
      department: department.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined,
      officeLocation: officeLocation.trim() || undefined,
      mobilePhone: mobilePhone.trim() || undefined,
      licenseSkuIds: selectedLicenses,
      groupIds: selectedGroups.length > 0 ? selectedGroups : undefined,
    });
    // Reset form
    setFirstName(""); setLastName(""); setRole("Teacher");
    setDepartment(""); setJobTitle(""); setOfficeLocation(""); setMobilePhone("");
    setSelectedLicenses([]); setSelectedGroups([]); setStep(1);
  };

  const toggleLicense = (skuId: string) => {
    setSelectedLicenses((prev) =>
      prev.includes(skuId) ? prev.filter((s) => s !== skuId) : [...prev, skuId]
    );
  };

  const toggleGroup = (gid: string) => {
    setSelectedGroups((prev) =>
      prev.includes(gid) ? prev.filter((g) => g !== gid) : [...prev, gid]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="theme-surface rounded-xl shadow-xl w-full max-w-lg p-6 mx-4 border theme-border max-h-[85vh] overflow-y-auto">
        <h3 className="text-lg font-bold theme-text-primary mb-1">
          👤 {t("staffAdmin.onboardTitle")}
        </h3>
        <p className="text-sm theme-text-secondary mb-4">
          {t("staffAdmin.onboardDesc")}
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-5">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${step === 1 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "theme-surface-secondary theme-text-muted"}`}>
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
            {t("staffAdmin.userInfo")}
          </div>
          <div className="w-4 h-px theme-border bg-gray-300 dark:bg-gray-600" />
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${step === 2 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "theme-surface-secondary theme-text-muted"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 2 ? "bg-blue-600 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"}`}>2</span>
            {t("staffAdmin.licensesGroups")}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium theme-text-primary mb-1">{t("staffAdmin.firstName")}</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Emma"
                  className="w-full px-3 py-2 text-sm rounded-lg border theme-border theme-surface theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium theme-text-primary mb-1">{t("staffAdmin.lastName")}</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Hansen"
                  className="w-full px-3 py-2 text-sm rounded-lg border theme-border theme-surface theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-medium theme-text-primary mb-1">{t("staffAdmin.role")}</label>
              <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)}
                className="w-full px-3 py-2 text-sm rounded-lg border theme-border theme-surface theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500">
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>{t(`staffAdmin.role${r.replace("-", "")}` as string)}</option>
                ))}
              </select>
            </div>

            {/* Department + Job Title */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium theme-text-primary mb-1">
                  {t("staffAdmin.department")} <span className="theme-text-muted text-[10px]">({t("staffAdmin.optional")})</span>
                </label>
                <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Science"
                  className="w-full px-3 py-2 text-sm rounded-lg border theme-border theme-surface theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium theme-text-primary mb-1">
                  {t("staffAdmin.jobTitle")} <span className="theme-text-muted text-[10px]">({t("staffAdmin.optional")})</span>
                </label>
                <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Senior Teacher"
                  className="w-full px-3 py-2 text-sm rounded-lg border theme-border theme-surface theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Office + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium theme-text-primary mb-1">
                  {t("staffAdmin.office")} <span className="theme-text-muted text-[10px]">({t("staffAdmin.optional")})</span>
                </label>
                <input type="text" value={officeLocation} onChange={(e) => setOfficeLocation(e.target.value)} placeholder="Room 204"
                  className="w-full px-3 py-2 text-sm rounded-lg border theme-border theme-surface theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium theme-text-primary mb-1">
                  {t("staffAdmin.phone")} <span className="theme-text-muted text-[10px]">({t("staffAdmin.optional")})</span>
                </label>
                <input type="text" value={mobilePhone} onChange={(e) => setMobilePhone(e.target.value)} placeholder="+47 999 88 777"
                  className="w-full px-3 py-2 text-sm rounded-lg border theme-border theme-surface theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t theme-border">
              <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg theme-surface-secondary theme-text-secondary hover:opacity-80 transition-opacity">
                {t("common.cancel")}
              </button>
              <button onClick={() => setStep(2)} disabled={!firstName.trim() || !lastName.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {t("common.next")} →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {/* Licenses */}
            <div>
              <label className="block text-xs font-semibold theme-text-primary mb-2">
                📋 {t("staffAdmin.selectLicenses")}
              </label>
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border theme-border p-2">
                {licenses.length === 0 && (
                  <p className="text-xs theme-text-muted p-2">{t("staffAdmin.noLicenses")}</p>
                )}
                {licenses.map((lic) => (
                  <label key={lic.skuId} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                    selectedLicenses.includes(lic.skuId) ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-700" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}>
                    <input type="checkbox" checked={selectedLicenses.includes(lic.skuId)}
                      onChange={() => toggleLicense(lic.skuId)}
                      className="rounded border-gray-300" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium theme-text-primary">{lic.displayName}</span>
                      <span className="ml-2 theme-text-muted">
                        ({lic.availableUnits > 0
                          ? <span className="text-green-600 dark:text-green-400">{lic.availableUnits} {t("staffAdmin.available")}</span>
                          : <span className="text-red-600 dark:text-red-400">{t("staffAdmin.noAvailable")}</span>
                        })
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Groups */}
            <div>
              <label className="block text-xs font-semibold theme-text-primary mb-2">
                📁 {t("staffAdmin.selectGroups")} <span className="theme-text-muted font-normal">({t("staffAdmin.optional")})</span>
              </label>
              <div className="max-h-32 overflow-y-auto space-y-1 rounded-lg border theme-border p-2">
                {groups.length === 0 && (
                  <p className="text-xs theme-text-muted p-2">{t("staffAdmin.noGroups")}</p>
                )}
                {groups.map((g) => (
                  <label key={g.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                    selectedGroups.includes(g.id) ? "bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-700" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}>
                    <input type="checkbox" checked={selectedGroups.includes(g.id)}
                      onChange={() => toggleGroup(g.id)}
                      className="rounded border-gray-300" />
                    <span className="font-medium theme-text-primary">{g.displayName}</span>
                    {g.memberCount !== undefined && (
                      <span className="theme-text-muted">({g.memberCount})</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-lg p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">
                📋 {t("staffAdmin.summary")}
              </p>
              <p className="text-xs theme-text-secondary">
                {firstName} {lastName} • {t(`staffAdmin.role${role.replace("-", "")}` as string)} • {selectedLicenses.length} {t("staffAdmin.licensesCount")} • {selectedGroups.length} {t("staffAdmin.groupsCount")}
              </p>
            </div>

            <div className="flex justify-between pt-3 border-t theme-border">
              <button onClick={() => setStep(1)} className="px-4 py-2 text-sm rounded-lg theme-surface-secondary theme-text-secondary hover:opacity-80 transition-opacity">
                ← {t("common.back")}
              </button>
              <div className="flex gap-2">
                <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg theme-surface-secondary theme-text-secondary hover:opacity-80 transition-opacity">
                  {t("common.cancel")}
                </button>
                <button onClick={handleConfirm} disabled={loading}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
                  {loading ? t("common.processing") : `✅ ${t("staffAdmin.onboardBtn")}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
