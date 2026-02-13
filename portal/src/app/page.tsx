"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          {t("common.loading")}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold theme-text-primary">{t("dashboard.title")}</h1>
        <p className="theme-text-secondary mt-1">
          {dateStr} — {timeStr}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            {t("common.dismiss")}
          </button>
        </div>
      )}

      {/* Welcome / Feature Overview */}
      {showWelcome && (
        <div className="mb-8 theme-surface rounded-xl border theme-border overflow-hidden">
          {/* Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                🎓 {t("dashboard.welcomeTitle")}
              </h2>
              <p className="text-blue-100 text-sm mt-1 max-w-3xl leading-relaxed">
                {t("dashboard.welcomeDescription")}
              </p>
            </div>
            <button
              onClick={dismissWelcome}
              className="text-blue-200 hover:text-white transition-colors ml-4 mt-1 shrink-0"
              aria-label={t("common.close")}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            <div className="flex items-start gap-3 p-3 rounded-lg theme-surface-secondary">
              <span className="text-2xl shrink-0">⏰</span>
              <div>
                <p className="font-semibold text-sm theme-text-primary">{t("dashboard.featureSchedules")}</p>
                <p className="text-xs theme-text-muted mt-0.5 leading-relaxed">{t("dashboard.featureSchedulesDesc")}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg theme-surface-secondary">
              <span className="text-2xl shrink-0">👥</span>
              <div>
                <p className="font-semibold text-sm theme-text-primary">{t("dashboard.featureStudents")}</p>
                <p className="text-xs theme-text-muted mt-0.5 leading-relaxed">{t("dashboard.featureStudentsDesc")}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg theme-surface-secondary">
              <span className="text-2xl shrink-0">📋</span>
              <div>
                <p className="font-semibold text-sm theme-text-primary">{t("dashboard.featurePolicies")}</p>
                <p className="text-xs theme-text-muted mt-0.5 leading-relaxed">{t("dashboard.featurePoliciesDesc")}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg theme-surface-secondary">
              <span className="text-2xl shrink-0">📁</span>
              <div>
                <p className="font-semibold text-sm theme-text-primary">{t("dashboard.featureGroups")}</p>
                <p className="text-xs theme-text-muted mt-0.5 leading-relaxed">{t("dashboard.featureGroupsDesc")}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg theme-surface-secondary">
              <span className="text-2xl shrink-0">📜</span>
              <div>
                <p className="font-semibold text-sm theme-text-primary">{t("dashboard.featureAudit")}</p>
                <p className="text-xs theme-text-muted mt-0.5 leading-relaxed">{t("dashboard.featureAuditDesc")}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg theme-surface-secondary">
              <span className="text-2xl shrink-0">🌐</span>
              <div>
                <p className="font-semibold text-sm theme-text-primary">{t("dashboard.featureMultiLang")}</p>
                <p className="text-xs theme-text-muted mt-0.5 leading-relaxed">{t("dashboard.featureMultiLangDesc")}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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

      {/* Quick Actions */}
      <div className="theme-surface rounded-xl border theme-border p-6 mb-8">
        <h2 className="text-lg font-semibold theme-text-primary mb-4">
          {t("dashboard.quickActions")}
        </h2>
        <div className="flex flex-wrap gap-3">
          {canWrite && (
            <>
              <button
                onClick={() => setBulkAction("enable")}
                className="px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                {t("dashboard.enableAll")}
              </button>
              <button
                onClick={() => setBulkAction("disable")}
                className="px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                {t("dashboard.disableAll")}
              </button>
            </>
          )}
          <button
            onClick={fetchStats}
            className="px-4 py-2.5 theme-surface-secondary theme-text-primary text-sm font-medium rounded-lg hover:opacity-80 transition-colors"
          >
            {t("common.refresh")}
          </button>
        </div>
      </div>

      {/* Schedule Info */}
      <div className="theme-surface rounded-xl border theme-border p-6">
        <h2 className="text-lg font-semibold theme-text-primary mb-4">
          {t("dashboard.automatedSchedule")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-3xl">🟢</div>
            <div>
              <p className="font-semibold text-green-800">{t("dashboard.enableAccess")}</p>
              <p className="text-sm text-green-600">{t("dashboard.enableSchedule")}</p>
              <p className="text-xs text-green-500 mt-1">
                {t("dashboard.enableDesc")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="text-3xl">🔴</div>
            <div>
              <p className="font-semibold text-red-800">{t("dashboard.disableAccess")}</p>
              <p className="text-sm text-red-600">{t("dashboard.disableSchedule")}</p>
              <p className="text-xs text-red-500 mt-1">
                {t("dashboard.disableDesc")}
              </p>
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
