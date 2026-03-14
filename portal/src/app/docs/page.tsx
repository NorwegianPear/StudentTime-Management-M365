"use client";

import { useTranslation } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";

export default function DocsPage() {
  const { t } = useTranslation();

  return (
    <div>
      <PageHeader title={t("docs.title")} subtitle={t("docs.subtitle")} />

      {/* Architecture Overview */}
      <section className="theme-surface rounded-xl border theme-border p-6 mb-8">
        <h2 className="text-lg font-semibold theme-text-primary mb-4 flex items-center gap-2">
          🏗️ {t("docs.architectureTitle")}
        </h2>
        <p className="theme-text-secondary text-sm mb-6 leading-relaxed">
          {t("docs.architectureDesc")}
        </p>

        {/* Mermaid-style architecture diagram rendered as styled HTML */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg border theme-border p-6 mb-6 overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Top: Azure Automation */}
            <div className="flex justify-center mb-4">
              <div className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-semibold shadow-lg">
                ☁️ Azure Cloud
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* Automation Account */}
              <div className="col-span-2 border-2 border-blue-400 rounded-xl p-4 bg-blue-50 dark:bg-blue-950/30">
                <h4 className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-3">
                  Azure Automation Account
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-blue-800 text-center">
                    <div className="text-lg mb-1">📋</div>
                    <div className="text-xs font-semibold theme-text-primary">Runbooks</div>
                    <div className="text-[10px] theme-text-muted mt-1">Enable / Disable<br/>Status / Import</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-blue-800 text-center">
                    <div className="text-lg mb-1">⏰</div>
                    <div className="text-xs font-semibold theme-text-primary">{t("docs.schedules")}</div>
                    <div className="text-[10px] theme-text-muted mt-1">07:55 🟢<br/>16:05 🔴</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-blue-800 text-center">
                    <div className="text-lg mb-1">🔐</div>
                    <div className="text-xs font-semibold theme-text-primary">{t("docs.variables")}</div>
                    <div className="text-[10px] theme-text-muted mt-1">TenantId<br/>ClientSecret</div>
                  </div>
                </div>
              </div>

              {/* App Service */}
              <div className="border-2 border-green-400 rounded-xl p-4 bg-green-50 dark:bg-green-950/30">
                <h4 className="text-xs font-bold text-green-700 dark:text-green-300 uppercase tracking-wider mb-3">
                  App Service
                </h4>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-green-200 dark:border-green-800 text-center">
                  <div className="text-lg mb-1">🌐</div>
                  <div className="text-xs font-semibold theme-text-primary">{t("docs.portalApp")}</div>
                  <div className="text-[10px] theme-text-muted mt-1">Next.js + React<br/>RBAC / i18n</div>
                </div>
              </div>
            </div>

            {/* Arrow down */}
            <div className="flex justify-center mb-4">
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-6 bg-gray-400 dark:bg-gray-500"></div>
                <div className="text-gray-400 dark:text-gray-500">▼</div>
              </div>
            </div>

            {/* Microsoft Graph API */}
            <div className="flex justify-center mb-4">
              <div className="border-2 border-purple-400 rounded-xl p-4 bg-purple-50 dark:bg-purple-950/30 w-2/3 text-center">
                <h4 className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider mb-2">
                  Microsoft Graph API
                </h4>
                <div className="flex justify-center gap-3 text-[10px] theme-text-muted">
                  <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded border border-purple-200 dark:border-purple-800">
                    GET /groups/members
                  </span>
                  <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded border border-purple-200 dark:border-purple-800">
                    PATCH /users
                  </span>
                  <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded border border-purple-200 dark:border-purple-800">
                    POST /revokeSignIn
                  </span>
                </div>
              </div>
            </div>

            {/* Arrow down */}
            <div className="flex justify-center mb-4">
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-6 bg-gray-400 dark:bg-gray-500"></div>
                <div className="text-gray-400 dark:text-gray-500">▼</div>
              </div>
            </div>

            {/* Entra ID */}
            <div className="flex justify-center">
              <div className="border-2 border-amber-400 rounded-xl p-4 bg-amber-50 dark:bg-amber-950/30 w-2/3 text-center">
                <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-2">
                  Microsoft Entra ID
                </h4>
                <div className="flex justify-center gap-2 flex-wrap">
                  {["👤", "👤", "👤", "👤", "👤"].map((_, i) => (
                    <span key={i} className="bg-white dark:bg-slate-800 w-8 h-8 flex items-center justify-center rounded-full border border-amber-200 dark:border-amber-800 text-sm">
                      👤
                    </span>
                  ))}
                  <span className="bg-white dark:bg-slate-800 w-8 h-8 flex items-center justify-center rounded-full border border-amber-200 dark:border-amber-800 text-[10px] font-bold">
                    ...
                  </span>
                </div>
                <p className="text-[10px] theme-text-muted mt-2">{t("docs.studentSecurityGroup")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="theme-surface rounded-xl border theme-border p-6 mb-8">
        <h2 className="text-lg font-semibold theme-text-primary mb-4 flex items-center gap-2">
          ⚙️ {t("docs.howItWorksTitle")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Morning Flow */}
          <div className="border border-green-200 dark:border-green-800 rounded-lg p-5 bg-green-50/50 dark:bg-green-950/20">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🟢</span>
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-300">{t("docs.morningFlow")}</h3>
                <p className="text-xs text-green-600 dark:text-green-400">{t("docs.morningSchedule")}</p>
              </div>
            </div>
            <ol className="space-y-2 text-sm theme-text-secondary">
              <li className="flex items-start gap-2"><span className="bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>{t("docs.step1Enable")}</li>
              <li className="flex items-start gap-2"><span className="bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>{t("docs.step2Connect")}</li>
              <li className="flex items-start gap-2"><span className="bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>{t("docs.step3Query")}</li>
              <li className="flex items-start gap-2"><span className="bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</span>{t("docs.step4Enable")}</li>
            </ol>
          </div>

          {/* Afternoon Flow */}
          <div className="border border-red-200 dark:border-red-800 rounded-lg p-5 bg-red-50/50 dark:bg-red-950/20">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🔴</span>
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-300">{t("docs.afternoonFlow")}</h3>
                <p className="text-xs text-red-600 dark:text-red-400">{t("docs.afternoonSchedule")}</p>
              </div>
            </div>
            <ol className="space-y-2 text-sm theme-text-secondary">
              <li className="flex items-start gap-2"><span className="bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>{t("docs.step1Disable")}</li>
              <li className="flex items-start gap-2"><span className="bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>{t("docs.step2Connect")}</li>
              <li className="flex items-start gap-2"><span className="bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>{t("docs.step3Query")}</li>
              <li className="flex items-start gap-2"><span className="bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</span>{t("docs.step4Disable")}</li>
              <li className="flex items-start gap-2"><span className="bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">5</span>{t("docs.step5Revoke")}</li>
            </ol>
          </div>
        </div>

        {/* Weekly Schedule Visual */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <th key={d} className="px-3 py-2 text-xs font-semibold uppercase tracking-wider theme-text-muted border-b theme-border text-center">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {[0, 1, 2, 3, 4].map((i) => (
                  <td key={i} className="px-2 py-3 text-center border-b theme-border">
                    <div className="text-green-600 dark:text-green-400 text-xs font-semibold">07:55 🟢</div>
                    <div className="my-1 text-lg">📚</div>
                    <div className="text-red-600 dark:text-red-400 text-xs font-semibold">16:05 🔴</div>
                  </td>
                ))}
                {[5, 6].map((i) => (
                  <td key={i} className="px-2 py-3 text-center border-b theme-border bg-red-50/50 dark:bg-red-950/10">
                    <div className="text-red-500 dark:text-red-400 text-xs font-semibold">{t("docs.allDay")}</div>
                    <div className="my-1 text-lg">🔴</div>
                    <div className="text-red-500 dark:text-red-400 text-xs font-semibold">{t("docs.disabled")}</div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Solution Options */}
      <section className="theme-surface rounded-xl border theme-border p-6 mb-8">
        <h2 className="text-lg font-semibold theme-text-primary mb-2 flex items-center gap-2">
          🔀 {t("docs.solutionOptionsTitle")}
        </h2>
        <p className="theme-text-secondary text-sm mb-6">{t("docs.solutionOptionsSubtitle")}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Script-Only */}
          <div className="border-2 border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">📜</span>
              <div>
                <h3 className="font-semibold theme-text-primary">{t("docs.scriptOnlyTitle")}</h3>
                <span className="text-xs bg-slate-100 dark:bg-slate-800 theme-text-muted px-2 py-0.5 rounded-full">PowerShell + Azure Automation</span>
              </div>
            </div>
            <p className="text-xs theme-text-secondary mb-4 leading-relaxed">{t("docs.scriptOnlyDesc")}</p>
            <div className="mb-3">
              <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1.5">✅ {t("docs.prosTitle")}</p>
              <ul className="space-y-1 text-xs theme-text-secondary">
                {[t("docs.scriptOnlyPro1"), t("docs.scriptOnlyPro2"), t("docs.scriptOnlyPro3"), t("docs.scriptOnlyPro4")].map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5"><span className="text-green-500 shrink-0">✓</span>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">⚠️ {t("docs.consTitle")}</p>
              <ul className="space-y-1 text-xs theme-text-secondary">
                {[t("docs.scriptOnlyCon1"), t("docs.scriptOnlyCon2"), t("docs.scriptOnlyCon3")].map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5"><span className="text-amber-500 shrink-0">•</span>{c}</li>
                ))}
              </ul>
            </div>
            <div className="mt-4 p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold theme-text-primary text-center">
              💰 0 NOK/mnd (script-only)
            </div>
          </div>

          {/* Portal + Script */}
          <div className="border-2 border-blue-400 dark:border-blue-600 rounded-xl p-5 bg-blue-50/30 dark:bg-blue-950/20">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">🌐</span>
              <div>
                <h3 className="font-semibold theme-text-primary">{t("docs.portalTitle")}</h3>
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">Next.js + Azure App Service</span>
              </div>
            </div>
            <p className="text-xs theme-text-secondary mb-4 leading-relaxed">{t("docs.portalDesc")}</p>
            <div className="mb-3">
              <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1.5">✅ {t("docs.prosTitle")}</p>
              <ul className="space-y-1 text-xs theme-text-secondary">
                {[t("docs.portalPro1"), t("docs.portalPro2"), t("docs.portalPro3"), t("docs.portalPro4")].map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5"><span className="text-green-500 shrink-0">✓</span>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">⚠️ {t("docs.consTitle")}</p>
              <ul className="space-y-1 text-xs theme-text-secondary">
                {[t("docs.portalCon1"), t("docs.portalCon2"), t("docs.portalCon3")].map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5"><span className="text-amber-500 shrink-0">•</span>{c}</li>
                ))}
              </ul>
            </div>
            <div className="mt-4 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs font-semibold text-blue-800 dark:text-blue-300 text-center">
              💰 720 NOK/mnd (App Service B1)
            </div>
          </div>
        </div>
      </section>

      {/* Security & Identity Architecture */}
      <section className="theme-surface rounded-xl border theme-border p-6 mb-8">
        <h2 className="text-lg font-semibold theme-text-primary mb-2 flex items-center gap-2">
          🔒 {t("docs.securityTitle")}
        </h2>
        <p className="theme-text-secondary text-sm mb-6 leading-relaxed">
          {t("docs.securitySubtitle")}
        </p>

        {/* Security Architecture Diagram */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg border theme-border p-6 mb-6 overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Top: Identity Flows */}
            <div className="flex justify-center mb-4">
              <div className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-semibold shadow-lg">
                🔐 {t("docs.securityIdentityFlows")}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* CI/CD OIDC Federation */}
              <div className="border-2 border-cyan-400 rounded-xl p-4 bg-cyan-50 dark:bg-cyan-950/30">
                <h4 className="text-xs font-bold text-cyan-700 dark:text-cyan-300 uppercase tracking-wider mb-3">
                  {t("docs.securityCiCd")}
                </h4>
                <div className="space-y-2">
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-cyan-200 dark:border-cyan-800 text-center">
                    <div className="text-lg mb-1">🐙</div>
                    <div className="text-xs font-semibold theme-text-primary">GitHub Actions</div>
                    <div className="text-[10px] theme-text-muted mt-1">{t("docs.securityOidcToken")}</div>
                  </div>
                  <div className="flex justify-center">
                    <div className="text-cyan-500 text-xs font-bold">OIDC ↕️</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-cyan-200 dark:border-cyan-800 text-center">
                    <div className="text-lg mb-1">☁️</div>
                    <div className="text-xs font-semibold theme-text-primary">Azure</div>
                    <div className="text-[10px] theme-text-muted mt-1">{t("docs.securityFederatedCred")}</div>
                  </div>
                </div>
              </div>

              {/* Runbook Graph API */}
              <div className="border-2 border-purple-400 rounded-xl p-4 bg-purple-50 dark:bg-purple-950/30">
                <h4 className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider mb-3">
                  {t("docs.securityRunbooks")}
                </h4>
                <div className="space-y-2">
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-purple-200 dark:border-purple-800 text-center">
                    <div className="text-lg mb-1">📋</div>
                    <div className="text-xs font-semibold theme-text-primary">Azure Automation</div>
                    <div className="text-[10px] theme-text-muted mt-1">{t("docs.securityEncryptedVars")}</div>
                  </div>
                  <div className="flex justify-center">
                    <div className="text-purple-500 text-xs font-bold">Client Secret ↕️</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-purple-200 dark:border-purple-800 text-center">
                    <div className="text-lg mb-1">📊</div>
                    <div className="text-xs font-semibold theme-text-primary">Graph API</div>
                    <div className="text-[10px] theme-text-muted mt-1">{t("docs.securityAppPermissions")}</div>
                  </div>
                </div>
              </div>

              {/* Portal User Auth */}
              <div className="border-2 border-green-400 rounded-xl p-4 bg-green-50 dark:bg-green-950/30">
                <h4 className="text-xs font-bold text-green-700 dark:text-green-300 uppercase tracking-wider mb-3">
                  {t("docs.securityPortalAuth")}
                </h4>
                <div className="space-y-2">
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-green-200 dark:border-green-800 text-center">
                    <div className="text-lg mb-1">👤</div>
                    <div className="text-xs font-semibold theme-text-primary">{t("docs.securityAdminUser")}</div>
                    <div className="text-[10px] theme-text-muted mt-1">{t("docs.securityBrowserLogin")}</div>
                  </div>
                  <div className="flex justify-center">
                    <div className="text-green-500 text-xs font-bold">OAuth 2.0 ↕️</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-green-200 dark:border-green-800 text-center">
                    <div className="text-lg mb-1">🌐</div>
                    <div className="text-xs font-semibold theme-text-primary">Entra ID</div>
                    <div className="text-[10px] theme-text-muted mt-1">{t("docs.securityNextAuth")}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Three security pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* OIDC Federation */}
          <div className="border border-cyan-200 dark:border-cyan-800 rounded-lg p-5 bg-cyan-50/50 dark:bg-cyan-950/20">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🔗</span>
              <h3 className="font-semibold text-cyan-800 dark:text-cyan-300 text-sm">{t("docs.securityOidcTitle")}</h3>
            </div>
            <p className="text-xs theme-text-secondary mb-3 leading-relaxed">{t("docs.securityOidcDesc")}</p>
            <ol className="space-y-1.5 text-xs theme-text-secondary">
              <li className="flex items-start gap-2">
                <span className="bg-cyan-200 dark:bg-cyan-800 text-cyan-800 dark:text-cyan-200 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                {t("docs.securityOidcStep1")}
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-cyan-200 dark:bg-cyan-800 text-cyan-800 dark:text-cyan-200 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                {t("docs.securityOidcStep2")}
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-cyan-200 dark:bg-cyan-800 text-cyan-800 dark:text-cyan-200 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                {t("docs.securityOidcStep3")}
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-cyan-200 dark:bg-cyan-800 text-cyan-800 dark:text-cyan-200 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">4</span>
                {t("docs.securityOidcStep4")}
              </li>
            </ol>
            <div className="mt-3 p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded text-[10px] text-cyan-700 dark:text-cyan-300 font-medium">
              ✅ {t("docs.securityOidcBenefit")}
            </div>
          </div>

          {/* Secret Handling */}
          <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-5 bg-purple-50/50 dark:bg-purple-950/20">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🔐</span>
              <h3 className="font-semibold text-purple-800 dark:text-purple-300 text-sm">{t("docs.securitySecretsTitle")}</h3>
            </div>
            <p className="text-xs theme-text-secondary mb-3 leading-relaxed">{t("docs.securitySecretsDesc")}</p>
            <ul className="space-y-1.5 text-xs theme-text-secondary">
              <li className="flex items-start gap-2">🔒 {t("docs.securitySecretsItem1")}</li>
              <li className="flex items-start gap-2">🔒 {t("docs.securitySecretsItem2")}</li>
              <li className="flex items-start gap-2">🔒 {t("docs.securitySecretsItem3")}</li>
              <li className="flex items-start gap-2">🔒 {t("docs.securitySecretsItem4")}</li>
            </ul>
            <div className="mt-3 p-2 bg-purple-100 dark:bg-purple-900/30 rounded text-[10px] text-purple-700 dark:text-purple-300 font-medium">
              🛡️ {t("docs.securitySecretsBenefit")}
            </div>
          </div>

          {/* Portal RBAC */}
          <div className="border border-green-200 dark:border-green-800 rounded-lg p-5 bg-green-50/50 dark:bg-green-950/20">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">👥</span>
              <h3 className="font-semibold text-green-800 dark:text-green-300 text-sm">{t("docs.securityRbacTitle")}</h3>
            </div>
            <p className="text-xs theme-text-secondary mb-3 leading-relaxed">{t("docs.securityRbacDesc")}</p>
            <ul className="space-y-1.5 text-xs theme-text-secondary">
              <li className="flex items-start gap-2">👑 {t("docs.securityRbacAdmin")}</li>
              <li className="flex items-start gap-2">👁️ {t("docs.securityRbacViewer")}</li>
              <li className="flex items-start gap-2">🏢 {t("docs.securityRbacDomain")}</li>
              <li className="flex items-start gap-2">⚙️ {t("docs.securityRbacEnvVar")}</li>
            </ul>
            <div className="mt-3 p-2 bg-green-100 dark:bg-green-900/30 rounded text-[10px] text-green-700 dark:text-green-300 font-medium">
              ✅ {t("docs.securityRbacBenefit")}
            </div>
          </div>
        </div>

        {/* Managed Identity — Active */}
        <div className="border-2 border-emerald-300 dark:border-emerald-700 rounded-lg p-5 bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🛡️</span>
            <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">{t("docs.securityMiTitle")}</h3>
          </div>
          <p className="text-sm theme-text-secondary mb-4 leading-relaxed">{t("docs.securityMiDesc")}</p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b theme-border">
                  <th className="text-left px-3 py-2 font-semibold theme-text-primary">{t("docs.securityMiAspect")}</th>
                  <th className="text-center px-3 py-2 font-semibold theme-text-secondary">{t("docs.securityMiCurrent")}</th>
                  <th className="text-center px-3 py-2 font-semibold text-emerald-700 dark:text-emerald-300">{t("docs.securityMiManaged")}</th>
                </tr>
              </thead>
              <tbody className="theme-text-secondary text-xs">
                <tr className="border-b theme-border">
                  <td className="px-3 py-2">{t("docs.securityMiSecretMgmt")}</td>
                  <td className="px-3 py-2 text-center theme-text-secondary">⚠️ {t("docs.securityMiSecretManual")}</td>
                  <td className="px-3 py-2 text-center text-emerald-700 dark:text-emerald-300 font-medium">✅ {t("docs.securityMiSecretAuto")}</td>
                </tr>
                <tr className="border-b theme-border">
                  <td className="px-3 py-2">{t("docs.securityMiRotation")}</td>
                  <td className="px-3 py-2 text-center theme-text-secondary">⚠️ {t("docs.securityMiRotationManual")}</td>
                  <td className="px-3 py-2 text-center text-emerald-700 dark:text-emerald-300 font-medium">✅ {t("docs.securityMiRotationAuto")}</td>
                </tr>
                <tr className="border-b theme-border">
                  <td className="px-3 py-2">{t("docs.securityMiLeakRisk")}</td>
                  <td className="px-3 py-2 text-center theme-text-secondary">⚠️ {t("docs.securityMiLeakLow")}</td>
                  <td className="px-3 py-2 text-center text-emerald-700 dark:text-emerald-300 font-medium">✅ {t("docs.securityMiLeakNone")}</td>
                </tr>
                <tr className="border-b theme-border">
                  <td className="px-3 py-2">{t("docs.securityMiSetup")}</td>
                  <td className="px-3 py-2 text-center">✅ {t("docs.securityMiSetupSimple")}</td>
                  <td className="px-3 py-2 text-center">✅ {t("docs.securityMiSetupGraph")}</td>
                </tr>
                <tr className="border-b theme-border">
                  <td className="px-3 py-2">{t("docs.securityMiCiCd")}</td>
                  <td className="px-3 py-2 text-center">✅ {t("docs.securityMiCiCdOidc")}</td>
                  <td className="px-3 py-2 text-center">— {t("docs.securityMiCiCdNa")}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1">✅ {t("docs.securityMiRecommendation")}</p>
            <p className="text-xs theme-text-secondary leading-relaxed">{t("docs.securityMiRecommendationDesc")}</p>
          </div>
        </div>

        {/* What's stored where summary */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold theme-text-primary mb-3">📍 {t("docs.securityWhereStored")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: "🐙", location: "GitHub Secrets", items: t("docs.securityGhSecrets") },
              { icon: "☁️", location: "Azure Automation", items: t("docs.securityAzAutomation") },
              { icon: "🌐", location: "App Service", items: t("docs.securityAppService") },
              { icon: "🆔", location: "Entra ID", items: t("docs.securityEntraId") },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-lg theme-surface-secondary border theme-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-xs font-semibold theme-text-primary">{item.location}</span>
                </div>
                <p className="text-[10px] theme-text-muted leading-relaxed">{item.items}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Comparison & Cost */}
      <section className="theme-surface rounded-xl border theme-border p-6 mb-8">
        <h2 className="text-lg font-semibold theme-text-primary mb-2 flex items-center gap-2">
          💰 {t("docs.costTitle")}
        </h2>
        <p className="theme-text-secondary text-sm mb-6">{t("docs.costSubtitle")}</p>

        {/* Current Solution Cost */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold theme-text-primary mb-3 flex items-center gap-2">
            ⭐ {t("docs.currentSolution")}
            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">
              {t("docs.recommended")}
            </span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b theme-border">
                  <th className="text-left px-3 py-2 font-semibold theme-text-primary">{t("docs.component")}</th>
                  <th className="text-right px-3 py-2 font-semibold theme-text-primary">{t("docs.regularPrice")}</th>
                  <th className="text-center px-3 py-2 font-semibold theme-text-primary">{t("docs.required")}</th>
                </tr>
              </thead>
              <tbody className="theme-text-secondary">
                <tr className="border-b theme-border">
                  <td className="px-3 py-2.5 font-medium">Azure Subscription</td>
                  <td className="px-3 py-2.5 text-right">Pay-as-you-go</td>
                  <td className="px-3 py-2.5 text-center">✅</td>
                </tr>
                <tr className="border-b theme-border">
                  <td className="px-3 py-2.5 font-medium">Azure Automation</td>
                  <td className="px-3 py-2.5 text-right">0 NOK</td>
                  <td className="px-3 py-2.5 text-center">✅</td>
                </tr>
                <tr className="border-b theme-border">
                  <td className="px-3 py-2.5 font-medium">Log Analytics (Basic)</td>
                  <td className="px-3 py-2.5 text-right">0 NOK</td>
                  <td className="px-3 py-2.5 text-center">✅</td>
                </tr>
                <tr className="border-b theme-border">
                  <td className="px-3 py-2.5 font-medium">App Service (Portal)</td>
                  <td className="px-3 py-2.5 text-right">720 NOK/month</td>
                  <td className="px-3 py-2.5 text-center">⚪ Optional</td>
                </tr>
                <tr className="border-b theme-border">
                  <td className="px-3 py-2.5 font-medium">M365 Education Licenses</td>
                  <td className="px-3 py-2.5 text-right">{t("docs.alreadyHave")}</td>
                  <td className="px-3 py-2.5 text-center">✅</td>
                </tr>
                <tr className="border-b theme-border">
                  <td className="px-3 py-2.5 font-medium">Extra Entra ID Licenses</td>
                  <td className="px-3 py-2.5 text-right">—</td>
                  <td className="px-3 py-2.5 text-center">❌ {t("docs.notNeeded")}</td>
                </tr>
                <tr className="border-b theme-border">
                  <td className="px-3 py-2.5 font-medium">Intune / Device Mgmt</td>
                  <td className="px-3 py-2.5 text-right">—</td>
                  <td className="px-3 py-2.5 text-center">❌ {t("docs.notNeeded")}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td className="px-3 py-3">{t("docs.totalMonthly")}</td>
                  <td className="px-3 py-3 text-right">0 – 720 NOK/month</td>
                  <td className="px-3 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Alternative Solutions Comparison */}
        <h3 className="text-sm font-semibold theme-text-primary mb-3">🔄 {t("docs.alternativeSolutions")}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b theme-border">
                <th className="text-left px-3 py-2 font-semibold theme-text-primary">{t("docs.solution")}</th>
                <th className="text-center px-3 py-2 font-semibold theme-text-primary">{t("docs.cloudOnly")}</th>
                <th className="text-center px-3 py-2 font-semibold theme-text-primary">{t("docs.timeBased")}</th>
                <th className="text-right px-3 py-2 font-semibold theme-text-primary">{t("docs.monthlyCost")}</th>
                <th className="text-center px-3 py-2 font-semibold theme-text-primary">{t("docs.complexity")}</th>
                <th className="text-center px-3 py-2 font-semibold theme-text-primary">{t("docs.verdict")}</th>
              </tr>
            </thead>
            <tbody className="theme-text-secondary">
              {/* Current Solution */}
              <tr className="border-b theme-border bg-green-50/50 dark:bg-green-950/10">
                <td className="px-3 py-2.5 font-semibold theme-text-primary">
                  ⭐ Azure Automation<br/>
                  <span className="text-xs font-normal theme-text-muted">{t("docs.currentLabel")}</span>
                </td>
                <td className="px-3 py-2.5 text-center">✅</td>
                <td className="px-3 py-2.5 text-center">✅</td>
                <td className="px-3 py-2.5 text-right font-semibold text-green-700 dark:text-green-300">0 – 720 NOK</td>
                <td className="px-3 py-2.5 text-center">🟡 {t("docs.medium")}</td>
                <td className="px-3 py-2.5 text-center">⭐ {t("docs.recommended")}</td>
              </tr>

              {/* Conditional Access */}
              <tr className="border-b theme-border">
                <td className="px-3 py-2.5 font-medium">
                  Conditional Access<br/>
                  <span className="text-xs theme-text-muted">Entra ID P1</span>
                </td>
                <td className="px-3 py-2.5 text-center">✅</td>
                <td className="px-3 py-2.5 text-center">❌</td>
                <td className="px-3 py-2.5 text-right">≈64 NOK/user/mo</td>
                <td className="px-3 py-2.5 text-center">🟢 {t("docs.low")}</td>
                <td className="px-3 py-2.5 text-center text-xs theme-text-muted">{t("docs.noTimeSupport")}</td>
              </tr>

              {/* Intune Device Control */}
              <tr className="border-b theme-border">
                <td className="px-3 py-2.5 font-medium">
                  Intune Device Control<br/>
                  <span className="text-xs theme-text-muted">{t("docs.deviceOnly")}</span>
                </td>
                <td className="px-3 py-2.5 text-center">✅</td>
                <td className="px-3 py-2.5 text-center">⚠️</td>
                <td className="px-3 py-2.5 text-right">≈77 NOK/user/mo</td>
                <td className="px-3 py-2.5 text-center">🟡 {t("docs.medium")}</td>
                <td className="px-3 py-2.5 text-center text-xs theme-text-muted">{t("docs.partial")}</td>
              </tr>

              {/* Hybrid AD */}
              <tr className="border-b theme-border">
                <td className="px-3 py-2.5 font-medium">
                  Hybrid AD + GPO<br/>
                  <span className="text-xs theme-text-muted">{t("docs.onPremRequired")}</span>
                </td>
                <td className="px-3 py-2.5 text-center">❌</td>
                <td className="px-3 py-2.5 text-center">✅</td>
                <td className="px-3 py-2.5 text-right">€€€</td>
                <td className="px-3 py-2.5 text-center">🔴 {t("docs.high")}</td>
                <td className="px-3 py-2.5 text-center text-xs theme-text-muted">{t("docs.needsServer")}</td>
              </tr>

              {/* Third-party */}
              <tr className="border-b theme-border">
                <td className="px-3 py-2.5 font-medium">
                  Third-party<br/>
                  <span className="text-xs theme-text-muted">GoGuardian, Lightspeed…</span>
                </td>
                <td className="px-3 py-2.5 text-center">✅</td>
                <td className="px-3 py-2.5 text-center">✅</td>
                <td className="px-3 py-2.5 text-right">~34–92 NOK/user/yr</td>
                <td className="px-3 py-2.5 text-center">🟢 {t("docs.low")}</td>
                <td className="px-3 py-2.5 text-center text-xs theme-text-muted">{t("docs.ifBudget")}</td>
              </tr>

              {/* Azure Logic Apps */}
              <tr className="border-b theme-border">
                <td className="px-3 py-2.5 font-medium">
                  Azure Logic Apps<br/>
                  <span className="text-xs theme-text-muted">{t("docs.lowCode")}</span>
                </td>
                <td className="px-3 py-2.5 text-center">✅</td>
                <td className="px-3 py-2.5 text-center">✅</td>
                <td className="px-3 py-2.5 text-right">~115–345 NOK/mo</td>
                <td className="px-3 py-2.5 text-center">🟡 {t("docs.medium")}</td>
                <td className="px-3 py-2.5 text-center text-xs theme-text-muted">{t("docs.moreExpensive")}</td>
              </tr>

              {/* Azure Functions */}
              <tr className="border-b theme-border">
                <td className="px-3 py-2.5 font-medium">
                  Azure Functions<br/>
                  <span className="text-xs theme-text-muted">Serverless</span>
                </td>
                <td className="px-3 py-2.5 text-center">✅</td>
                <td className="px-3 py-2.5 text-center">✅</td>
                <td className="px-3 py-2.5 text-right">~12–58 NOK/mo</td>
                <td className="px-3 py-2.5 text-center">🟡 {t("docs.medium")}</td>
                <td className="px-3 py-2.5 text-center text-xs theme-text-muted">{t("docs.viable")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Licensing & Eligibility */}
      <section className="theme-surface rounded-xl border theme-border p-6 mb-8">
        <h2 className="text-lg font-semibold theme-text-primary mb-4 flex items-center gap-2">
          🏫 {t("docs.nonprofitTitle")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Nonprofit eligibility criteria */}
          <div className="border border-amber-200 dark:border-amber-800 rounded-lg p-5 bg-amber-50/50 dark:bg-amber-950/20">
            <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">⚠️ Microsoft Nonprofit Eligibility</h3>
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">Must be equivalent to a US 501(c)(3). Commercial schools typically do not qualify.</p>
            <ul className="space-y-1.5 text-sm theme-text-secondary">
              <li className="flex items-start gap-2">✅ {t("docs.coversEverything")}</li>
              <li className="flex items-start gap-2">✅ {t("docs.renewsAnnually")}</li>
              <li className="flex items-start gap-2">❌ Limited companies (AS, Ltd, GmbH)</li>
              <li className="flex items-start gap-2">❌ Commercial foundations (private sector)</li>
              <li className="flex items-start gap-2">🔗 <a href="https://nonprofit.microsoft.com" target="_blank" rel="noopener" className="text-amber-600 dark:text-amber-400 underline">{t("docs.githubApply")}</a></li>
            </ul>
          </div>

          {/* M365 Education */}
          <div className="border border-green-200 dark:border-green-800 rounded-lg p-5 bg-green-50/50 dark:bg-green-950/20">
            <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">🎓 M365 Education</h3>
            <ul className="space-y-1.5 text-sm theme-text-secondary">
              <li className="flex items-start gap-2">✅ {t("docs.noExtraLicenses")}</li>
              <li className="flex items-start gap-2">✅ {t("docs.worksWithA1A3")}</li>
              <li className="flex items-start gap-2">✅ {t("docs.graphApiFree")}</li>
              <li className="flex items-start gap-2">❌ {t("docs.noEntraPremium")}</li>
            </ul>
          </div>
        </div>

        {/* Standard Pay-As-You-Go Pricing */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-gray-50/50 dark:bg-gray-950/20">
          <h3 className="font-semibold theme-text-primary mb-2">💰 Standard Pay-As-You-Go Pricing</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg border theme-border">
              <div className="font-semibold theme-text-primary">Script-Only</div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">0 NOK/mnd</div>
              <div className="text-xs theme-text-muted">{t("docs.publicRepos")}</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-300 dark:border-blue-700">
              <div className="font-semibold theme-text-primary">With Portal</div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">720 NOK/mnd</div>
              <div className="text-xs theme-text-muted">{t("docs.freeForNonprofits")}</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg border theme-border">
              <div className="font-semibold theme-text-primary">GitHub CI/CD</div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">0 NOK</div>
              <div className="text-xs theme-text-muted">{t("docs.nonprofitDiscount")}</div>
            </div>
          </div>
          <p className="text-xs theme-text-muted mt-3">
            🔗 <a href="https://azure.microsoft.com/en-us/pricing/calculator/" target="_blank" rel="noopener" className="text-blue-600 dark:text-blue-400 underline">
              azure.microsoft.com/pricing/calculator
            </a>
          </p>
        </div>
      </section>

      {/* NOK Cost Breakdown */}
      <section className="theme-surface rounded-xl border theme-border p-6 mb-8">
        <h2 className="text-lg font-semibold theme-text-primary mb-2 flex items-center gap-2">
          🇳🇴 {t("docs.nokCostTitle")}
        </h2>
        <p className="theme-text-secondary text-sm mb-6">{t("docs.nokCostSubtitle")}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Script-Only NOK */}
          <div>
            <h3 className="text-sm font-semibold theme-text-primary mb-3 flex items-center gap-2">
              📜 {t("docs.nokScriptOnlyTitle")}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b theme-border">
                    <th className="text-left px-3 py-2 font-semibold theme-text-primary">{t("docs.component")}</th>
                    <th className="text-right px-3 py-2 font-semibold theme-text-primary">{t("docs.nokRegular")}</th>
                  </tr>
                </thead>
                <tbody className="theme-text-secondary">
                  <tr className="border-b theme-border">
                    <td className="px-3 py-2.5">{t("docs.azureAutomationNok")}</td>
                    <td className="px-3 py-2.5 text-right">0 NOK</td>
                  </tr>
                  <tr className="border-b theme-border">
                    <td className="px-3 py-2.5">{t("docs.logAnalyticsNok")}</td>
                    <td className="px-3 py-2.5 text-right">0 NOK</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td className="px-3 py-3">{t("docs.nokTotalScriptOnly")}</td>
                    <td className="px-3 py-3 text-right">0 NOK</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Portal NOK */}
          <div>
            <h3 className="text-sm font-semibold theme-text-primary mb-3 flex items-center gap-2">
              🌐 {t("docs.nokPortalTitle")}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b theme-border">
                    <th className="text-left px-3 py-2 font-semibold theme-text-primary">{t("docs.component")}</th>
                    <th className="text-right px-3 py-2 font-semibold theme-text-primary">{t("docs.nokRegular")}</th>
                  </tr>
                </thead>
                <tbody className="theme-text-secondary">
                  <tr className="border-b theme-border">
                    <td className="px-3 py-2.5">{t("docs.azureAutomationNok")}</td>
                    <td className="px-3 py-2.5 text-right">0 NOK</td>
                  </tr>
                  <tr className="border-b theme-border">
                    <td className="px-3 py-2.5">{t("docs.logAnalyticsNok")}</td>
                    <td className="px-3 py-2.5 text-right">0 NOK</td>
                  </tr>
                  <tr className="border-b theme-border">
                    <td className="px-3 py-2.5">{t("docs.appServiceNok")}</td>
                    <td className="px-3 py-2.5 text-right">720 NOK</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td className="px-3 py-3">{t("docs.nokTotalPortal")}</td>
                    <td className="px-3 py-3 text-right">720 NOK</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs theme-text-secondary mb-4">
          {t("docs.nokNote")}
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs theme-text-muted">
          {t("docs.nokGithubNote")}
        </div>
      </section>

      {/* Deployment Scenarios */}
      <section className="theme-surface rounded-xl border theme-border p-6 mb-8">
        <h2 className="text-lg font-semibold theme-text-primary mb-2 flex items-center gap-2">
          🚀 {t("docs.deployTitle")}
        </h2>
        <p className="theme-text-secondary text-sm mb-6">{t("docs.deploySubtitle")}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Scenario A */}
          <div className="border-2 border-blue-300 dark:border-blue-700 rounded-xl p-5 bg-blue-50/30 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🏢</span>
              <h3 className="font-semibold text-blue-800 dark:text-blue-300">{t("docs.deployScenarioA")}</h3>
            </div>
            <p className="text-xs theme-text-secondary mb-4 leading-relaxed">{t("docs.deployScenarioADesc")}</p>
            <ul className="space-y-2 text-xs theme-text-secondary">
              <li className="flex items-start gap-2">🐙 <span><strong>GitHub:</strong> {t("docs.deployScenarioAGitHub")} — <em>{t("docs.deployScenarioAGitHubCost")}</em></span></li>
              <li className="flex items-start gap-2">☁️ <span><strong>Azure:</strong> {t("docs.deployScenarioAAzure")} — <em>{t("docs.deployScenarioAAzureCost")}</em></span></li>
              <li className="flex items-start gap-2">🔧 <span><strong>{t("docs.deployMaintenance")}:</strong> {t("docs.deployScenarioAMaint")}</span></li>
              <li className="flex items-start gap-2">🔑 <span><strong>{t("docs.deployControl")}:</strong> {t("docs.deployScenarioAControl")}</span></li>
            </ul>
            <div className="mt-4 p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-xs font-semibold text-blue-800 dark:text-blue-300 text-center">
              💰 {t("docs.deployScenarioACost")}
            </div>
          </div>

          {/* Scenario B */}
          <div className="border-2 border-green-300 dark:border-green-700 rounded-xl p-5 bg-green-50/30 dark:bg-green-950/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🎓</span>
              <h3 className="font-semibold text-green-800 dark:text-green-300">{t("docs.deployScenarioB")}</h3>
            </div>
            <p className="text-xs theme-text-secondary mb-4 leading-relaxed">{t("docs.deployScenarioBDesc")}</p>
            <ul className="space-y-2 text-xs theme-text-secondary">
              <li className="flex items-start gap-2">🐙 <span><strong>GitHub:</strong> {t("docs.deployScenarioBGitHub")}</span></li>
              <li className="flex items-start gap-2 pl-5">└ Free/Team (ideell): <strong className="text-green-700 dark:text-green-400">{t("docs.deployScenarioBGitHubCostFree")}</strong></li>
              <li className="flex items-start gap-2 pl-5">└ Enterprise: <span>{t("docs.deployScenarioBGitHubCostEnt")}</span></li>
              <li className="flex items-start gap-2">☁️ <span><strong>Azure:</strong> {t("docs.deployScenarioBAzure")} — <em>{t("docs.deployScenarioBAzureCost")}</em></span></li>
              <li className="flex items-start gap-2">🔧 <span><strong>{t("docs.deployMaintenance")}:</strong> {t("docs.deployScenarioBMaint")}</span></li>
              <li className="flex items-start gap-2">🔑 <span><strong>{t("docs.deployControl")}:</strong> {t("docs.deployScenarioBControl")}</span></li>
            </ul>
            <div className="mt-4 p-2.5 bg-green-100 dark:bg-green-900/30 rounded-lg text-xs font-semibold text-green-800 dark:text-green-300 text-center">
              💰 {t("docs.deployScenarioBCost")}
            </div>
          </div>
        </div>

        {/* Recommendation box */}
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-300 dark:border-emerald-700 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">💡</span>
            <h3 className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm">{t("docs.deployRecommendation")}</h3>
          </div>
          <p className="text-xs theme-text-secondary leading-relaxed">{t("docs.deployRecommendationText")}</p>
        </div>
      </section>

      {/* What's Not Needed */}
      <section className="theme-surface rounded-xl border theme-border p-6 mb-8">
        <h2 className="text-lg font-semibold theme-text-primary mb-4 flex items-center gap-2">
          ✅ {t("docs.whatYouDontNeed")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: "❌", label: "Entra ID Premium P1/P2" },
            { icon: "❌", label: "Microsoft Intune" },
            { icon: "❌", label: "Conditional Access (Premium)" },
            { icon: "❌", label: t("docs.perUserLicenses") },
            { icon: "❌", label: t("docs.onPremServer") },
            { icon: "❌", label: t("docs.thirdPartySoftware") },
            { icon: "❌", label: t("docs.additionalHardware") },
            { icon: "❌", label: t("docs.vpnSetup") },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-green-50/50 dark:bg-green-950/10 border border-green-200 dark:border-green-800 text-sm">
              <span>{item.icon}</span>
              <span className="theme-text-secondary">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Implementation Timeline */}
      <section className="theme-surface rounded-xl border theme-border p-6">
        <h2 className="text-lg font-semibold theme-text-primary mb-4 flex items-center gap-2">
          📅 {t("docs.timelineTitle")}
        </h2>

        <div className="space-y-3">
          {[
            { phase: t("docs.phase1"), time: "1–5 " + t("docs.days"), desc: t("docs.phase1Desc"), icon: "📋" },
            { phase: t("docs.phase2"), time: "2–4 " + t("docs.hours"), desc: t("docs.phase2Desc"), icon: "🔧" },
            { phase: t("docs.phase3"), time: "3–5 " + t("docs.days"), desc: t("docs.phase3Desc"), icon: "🧪" },
            { phase: t("docs.phase4"), time: "1 " + t("docs.hour"), desc: t("docs.phase4Desc"), icon: "🚀" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-lg theme-surface-secondary">
              <span className="text-2xl shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-sm theme-text-primary">{item.phase}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">{item.time}</span>
                </div>
                <p className="text-xs theme-text-muted">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <span className="text-xl">⚡</span>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t("docs.fastTrack")}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">{t("docs.fastTrackDesc")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
