"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { OnboardDialog } from "@/components/OnboardDialog";
import { OffboardDialog } from "@/components/OffboardDialog";
import type { StaffUser, AvailableLicense, GroupInfo, OnboardStaffRequest, OffboardStaffRequest } from "@/types";
import { useTranslation } from "@/lib/i18n";

// Color hash for avatar backgrounds
function hashColor(name: string): string {
  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-rose-500",
    "bg-amber-500", "bg-cyan-500", "bg-indigo-500", "bg-pink-500",
    "bg-teal-500", "bg-orange-500", "bg-fuchsia-500", "bg-lime-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function StaffAdminPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [licenses, setLicenses] = useState<AvailableLicense[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Dialogs
  const [showOnboard, setShowOnboard] = useState(false);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [offboardTarget, setOffboardTarget] = useState<StaffUser | null>(null);
  const [offboardLoading, setOffboardLoading] = useState(false);

  // Detail view
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);

  const { t, locale } = useTranslation();
  const localeMap: Record<string, string> = { en: "en-GB", "nb-NO": "no-NO", de: "de-DE", es: "es-ES", pt: "pt-PT", sv: "sv-SE", da: "da-DK" };
  const dateLocale = localeMap[locale] || "en-GB";

  // ── Data fetching ──────────────────────────────────────────────────

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterRole) params.set("role", filterRole);
      if (filterStatus !== "all") params.set("status", filterStatus);
      const qs = params.toString();
      const res = await fetch(`/api/staff${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      if (data.success) setStaff(data.data);
      else setError(data.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch staff");
    } finally {
      setLoading(false);
    }
  }, [filterRole, filterStatus]);

  const fetchLicenses = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/licenses");
      const data = await res.json();
      if (data.success) setLicenses(data.data);
    } catch { /* ignore */ }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      if (data.success) setGroups(data.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchStaff();
    fetchLicenses();
    fetchGroups();
  }, [fetchStaff, fetchLicenses, fetchGroups]);

  // ── Handlers ───────────────────────────────────────────────────────

  const handleOnboard = async (data: OnboardStaffRequest) => {
    setOnboardLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setSuccess(`✅ ${result.data.message}. ${t("staffAdmin.tempPassword")}: ${result.data.temporaryPassword}`);
        setShowOnboard(false);
        fetchStaff();
        fetchLicenses(); // refresh available counts
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onboard failed");
    } finally {
      setOnboardLoading(false);
    }
  };

  const handleOffboard = async (data: OffboardStaffRequest) => {
    setOffboardLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/offboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setSuccess(`✅ ${result.data.message}. ${t("staffAdmin.actionsPerformed")}: ${result.data.actions.join(", ")}`);
        setOffboardTarget(null);
        setSelectedUser(null);
        fetchStaff();
        fetchLicenses();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Offboard failed");
    } finally {
      setOffboardLoading(false);
    }
  };

  // ── Filtered data ──────────────────────────────────────────────────

  const filteredStaff = staff.filter((u) => {
    if (search) {
      const q = search.toLowerCase();
      if (!u.displayName.toLowerCase().includes(q) && !u.userPrincipalName.toLowerCase().includes(q) && !(u.department || "").toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Stats
  const enabledCount = staff.filter((u) => u.accountEnabled).length;
  const disabledCount = staff.filter((u) => !u.accountEnabled).length;
  const roles = [...new Set(staff.map((u) => u.jobTitle).filter(Boolean))];

  return (
    <div>
      <PageHeader
        title={t("staffAdmin.title")}
        subtitle={t("staffAdmin.subtitle")}
        actions={
          <button onClick={() => setShowOnboard(true)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm">
            ➕ {t("staffAdmin.onboardBtn")}
          </button>
        }
      />

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm font-medium border"
          style={{ backgroundColor: "var(--stat-red-bg)", color: "var(--stat-red-text)", borderColor: "var(--stat-red-border)" }}>
          ❌ {error}
          <button onClick={() => setError(null)} className="ml-2 underline">{t("common.dismiss")}</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-lg text-sm font-medium border"
          style={{ backgroundColor: "var(--stat-green-bg)", color: "var(--stat-green-text)", borderColor: "var(--stat-green-border)" }}>
          {success}
          <button onClick={() => setSuccess(null)} className="ml-2 underline">{t("common.dismiss")}</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: t("staffAdmin.totalStaff"), value: staff.length, icon: "👥", color: "blue" },
          { label: t("staffAdmin.activeAccounts"), value: enabledCount, icon: "🟢", color: "green" },
          { label: t("staffAdmin.disabledAccounts"), value: disabledCount, icon: "🔴", color: "red" },
          { label: t("staffAdmin.licensesAvailable"), value: licenses.filter((l) => l.availableUnits > 0).length, icon: "📋", color: "purple" },
        ].map((stat) => (
          <div key={stat.label} className="theme-surface rounded-xl border theme-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{stat.icon}</span>
              <span className="text-xs font-medium theme-text-muted">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold theme-text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="theme-surface rounded-xl border theme-border p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={`🔍 ${t("staffAdmin.searchPlaceholder")}`}
              className="w-full px-3 py-2 text-sm rounded-lg border theme-border theme-surface theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border theme-border theme-surface theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">{t("staffAdmin.allRoles")}</option>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border theme-border theme-surface theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">{t("common.all")}</option>
            <option value="enabled">{t("common.enabled")}</option>
            <option value="disabled">{t("common.disabled")}</option>
          </select>
          <button onClick={() => fetchStaff()} className="px-3 py-2 text-sm rounded-lg theme-surface-secondary theme-text-secondary hover:opacity-80 transition-opacity border theme-border">
            🔄 {t("common.refresh")}
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="theme-surface rounded-xl border theme-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center theme-text-muted">{t("common.loading")}</div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-12 text-center theme-text-muted">{t("common.noResults")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b theme-border" style={{ backgroundColor: "var(--table-header-bg, var(--surface-secondary))" }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider theme-text-muted">{t("staffAdmin.colName")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider theme-text-muted">{t("staffAdmin.colRole")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider theme-text-muted">{t("staffAdmin.colDepartment")}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider theme-text-muted">{t("staffAdmin.colStatus")}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider theme-text-muted">{t("staffAdmin.colLicenses")}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider theme-text-muted">{t("staffAdmin.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((user) => (
                  <tr key={user.id} className="border-b theme-border hover:bg-opacity-50 transition-colors"
                    style={{ ["--tw-bg-opacity" as string]: "0.5" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${hashColor(user.displayName)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium theme-text-primary text-sm leading-tight">{user.displayName}</p>
                          <p className="text-[11px] theme-text-muted">{user.userPrincipalName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {user.jobTitle || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm theme-text-secondary">{user.department || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {user.accountEnabled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          🟢 {t("common.enabled")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                          🔴 {t("common.disabled")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-medium theme-text-secondary">{user.assignedLicenses?.length || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSelectedUser(user)}
                          className="px-2 py-1 text-xs rounded-lg theme-surface-secondary theme-text-secondary hover:opacity-80 transition-opacity border theme-border"
                          title={t("staffAdmin.viewDetails")}>
                          👁️
                        </button>
                        <button onClick={() => setOffboardTarget(user)}
                          className="px-2 py-1 text-xs rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors border border-red-200 dark:border-red-800"
                          title={t("staffAdmin.offboardBtn")}>
                          🚫
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredStaff.length > 0 && (
          <div className="px-4 py-3 border-t theme-border text-xs theme-text-muted">
            {t("common.showingCount", { count: String(filteredStaff.length), item: t("staffAdmin.staffMembers") })}
            {search && ` (${t("staffAdmin.filtered")})`}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedUser && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
          <div className="theme-surface rounded-xl shadow-xl w-full max-w-md p-6 mx-4 border theme-border max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold theme-text-primary">👤 {t("staffAdmin.userDetails")}</h3>
              <button onClick={() => setSelectedUser(null)} className="theme-text-muted hover:theme-text-primary text-lg">✕</button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full ${hashColor(selectedUser.displayName)} flex items-center justify-center text-white font-bold`}>
                {selectedUser.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold theme-text-primary">{selectedUser.displayName}</p>
                <p className="text-xs theme-text-muted">{selectedUser.userPrincipalName}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm mb-4">
              {[
                { label: t("staffAdmin.colRole"), value: selectedUser.jobTitle || "—" },
                { label: t("staffAdmin.colDepartment"), value: selectedUser.department || "—" },
                { label: t("staffAdmin.office"), value: selectedUser.officeLocation || "—" },
                { label: t("staffAdmin.phone"), value: selectedUser.mobilePhone || "—" },
                { label: t("staffAdmin.colStatus"), value: selectedUser.accountEnabled ? `🟢 ${t("common.enabled")}` : `🔴 ${t("common.disabled")}` },
                { label: t("staffAdmin.created"), value: selectedUser.createdDateTime
                  ? new Date(selectedUser.createdDateTime).toLocaleDateString(dateLocale, { year: "numeric", month: "short", day: "numeric" })
                  : "—" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between">
                  <span className="theme-text-muted">{item.label}</span>
                  <span className="theme-text-primary font-medium">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Assigned Licenses */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold theme-text-primary mb-2">📋 {t("staffAdmin.assignedLicenses")}</h4>
              {(!selectedUser.assignedLicenses || selectedUser.assignedLicenses.length === 0) ? (
                <p className="text-xs theme-text-muted">{t("staffAdmin.noAssignedLicenses")}</p>
              ) : (
                <div className="space-y-1">
                  {selectedUser.assignedLicenses.map((lic) => (
                    <div key={lic.skuId} className="px-2 py-1.5 rounded-lg theme-surface-secondary text-xs theme-text-secondary border theme-border">
                      {lic.displayName || lic.skuId}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t theme-border">
              <button onClick={() => setSelectedUser(null)}
                className="px-4 py-2 text-sm rounded-lg theme-surface-secondary theme-text-secondary hover:opacity-80 transition-opacity">
                {t("common.close")}
              </button>
              <button onClick={() => { setOffboardTarget(selectedUser); }}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">
                🚫 {t("staffAdmin.offboardBtn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboard Dialog */}
      <OnboardDialog
        open={showOnboard}
        licenses={licenses}
        groups={groups}
        onConfirm={handleOnboard}
        onCancel={() => setShowOnboard(false)}
        loading={onboardLoading}
      />

      {/* Offboard Dialog */}
      <OffboardDialog
        open={!!offboardTarget}
        user={offboardTarget}
        onConfirm={handleOffboard}
        onCancel={() => setOffboardTarget(null)}
        loading={offboardLoading}
      />
    </div>
  );
}
