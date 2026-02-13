"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import { useTranslation } from "@/lib/i18n";
import { useRole } from "@/lib/use-role";
import type { DashboardStats } from "@/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<"enable" | "disable" | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const { t, locale } = useTranslation();
  const { canWrite } = useRole();

  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("student-portal-hide-welcome") !== "true";
  });

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem("student-portal-hide-welcome", "true");
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleBulkAction = async () => {
    if (!bulkAction) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: bulkAction }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchStats();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBulkLoading(false);
      setBulkAction(null);
    }
  };

  const localeMap: Record<string, string> = { en: "en-GB", "nb-NO": "no-NO", de: "de-DE", es: "es-ES", pt: "pt-PT", sv: "sv-SE", da: "da-DK" };
  const dateLocale = localeMap[locale] || "en-GB";
  const now = new Date();
  const timeStr = now.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString(dateLocale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 theme-text-muted">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">{t("common.loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t("dashboard.title")}
        subtitle={`${dateStr} — ${timeStr}`}
      />

      {error && (
        <div className="mb-6 p-4 rounded-xl text-sm flex items-center justify-between"
          style={{ backgroundColor: "var(--badge-red-bg)", color: "var(--badge-red-text)", border: "1px solid var(--badge-red-border)" }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-3 underline text-xs opacity-80 hover:opacity-100">
            {t("common.dismiss")}
          </button>
        </div>
      )}

      {/* Welcome / Feature Overview */}
      {showWelcome && (
        <div className="mb-8 rounded-2xl overflow-hidden shadow-sm" style={{ border: "1px solid var(--surface-border)" }}>
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 py-5 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                🎓 {t("dashboard.welcomeTitle")}
              </h2>
              <p className="text-blue-100 text-sm mt-1.5 max-w-3xl leading-relaxed">
                {t("dashboard.welcomeDescription")}
              </p>
            </div>
            <button
              onClick={dismissWelcome}
              className="text-blue-200 hover:text-white transition-colors ml-4 mt-0.5 shrink-0 p-1 rounded-lg hover:bg-white/10"
              aria-label={t("common.close")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-5" style={{ backgroundColor: "var(--surface)" }}>
            {[
              { icon: "⏰", titleKey: "dashboard.featureSchedules", descKey: "dashboard.featureSchedulesDesc" },
              { icon: "👥", titleKey: "dashboard.featureStudents", descKey: "dashboard.featureStudentsDesc" },
              { icon: "📋", titleKey: "dashboard.featurePolicies", descKey: "dashboard.featurePoliciesDesc" },
              { icon: "📁", titleKey: "dashboard.featureGroups", descKey: "dashboard.featureGroupsDesc" },
              { icon: "📜", titleKey: "dashboard.featureAudit", descKey: "dashboard.featureAuditDesc" },
              { icon: "🌐", titleKey: "dashboard.featureMultiLang", descKey: "dashboard.featureMultiLangDesc" },
            ].map((f) => (
              <div key={f.titleKey} className="flex items-start gap-3 p-3 rounded-xl transition-colors"
                style={{ backgroundColor: "var(--surface-secondary)" }}>
                <span className="text-xl shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <p className="font-medium text-sm theme-text-primary">{t(f.titleKey)}</p>
                  <p className="text-xs theme-text-muted mt-0.5 leading-relaxed">{t(f.descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          label={t("dashboard.totalStudents")}
          value={stats?.totalStudents ?? 0}
          icon="👥"
          color="blue"
        />
        <StatCard
          label={t("dashboard.currentlyEnabled")}
          value={stats?.enabledStudents ?? 0}
          icon="✅"
          color="green"
          subtitle={t("dashboard.haveAccess")}
        />
        <StatCard
          label={t("dashboard.currentlyDisabled")}
          value={stats?.disabledStudents ?? 0}
          icon="🚫"
          color="red"
          subtitle={t("dashboard.accessRestricted")}
        />
        <StatCard
          label={t("nav.groups")}
          value={stats?.groups.length ?? 0}
          icon="📁"
          color="purple"
        />
        <StatCard
          label={t("dashboard.activePolicies")}
          value={stats?.activePolicies ?? 0}
          icon="🕒"
          color="amber"
          subtitle={t("dashboard.logonHourRulesets")}
        />
      </div>

      {/* Quick Actions + Schedule in a 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="rounded-2xl p-6 shadow-sm"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)" }}>
          <h2 className="text-base font-semibold theme-text-primary mb-4">
            {t("dashboard.quickActions")}
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {canWrite && (
              <>
                <button
                  onClick={() => setBulkAction("enable")}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  {t("dashboard.enableAll")}
                </button>
                <button
                  onClick={() => setBulkAction("disable")}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                  {t("dashboard.disableAll")}
                </button>
              </>
            )}
            <button
              onClick={fetchStats}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm"
              style={{ backgroundColor: "var(--surface-secondary)", color: "var(--text-primary)" }}
            >
              {t("common.refresh")}
            </button>
          </div>
        </div>

        {/* Schedule Info */}
        <div className="rounded-2xl p-6 shadow-sm"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--surface-border)" }}>
          <h2 className="text-base font-semibold theme-text-primary mb-4">
            {t("dashboard.automatedSchedule")}
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3.5 rounded-xl"
              style={{ backgroundColor: "var(--badge-green-bg)", border: "1px solid var(--badge-green-border)" }}>
              <div className="text-2xl">🟢</div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--badge-green-text)" }}>{t("dashboard.enableAccess")}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--badge-green-text)", opacity: 0.8 }}>{t("dashboard.enableSchedule")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-xl"
              style={{ backgroundColor: "var(--badge-red-bg)", border: "1px solid var(--badge-red-border)" }}>
              <div className="text-2xl">🔴</div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--badge-red-text)" }}>{t("dashboard.disableAccess")}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--badge-red-text)", opacity: 0.8 }}>{t("dashboard.disableSchedule")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={bulkAction !== null}
        title={bulkAction === "enable" ? t("dashboard.enableAllConfirm") : t("dashboard.disableAllConfirm")}
        message={
          bulkAction === "enable"
            ? t("dashboard.enableAllMsg", { count: stats?.totalStudents ?? 0 })
            : t("dashboard.disableAllMsg", { count: stats?.totalStudents ?? 0 })
        }
        confirmLabel={bulkAction === "enable" ? t("dashboard.enableAll") : t("dashboard.disableAll")}
        variant={bulkAction === "disable" ? "danger" : "primary"}
        onConfirm={handleBulkAction}
        onCancel={() => setBulkAction(null)}
        loading={bulkLoading}
      />
    </div>
  );
}
