"use client";

import { useEffect, useState, useCallback } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import type { SpecialGroup, GroupInfo, SchedulePolicy } from "@/types";
import { useTranslation } from "@/lib/i18n";

export default function SpecialGroupsPage() {
  const [specialGroups, setSpecialGroups] = useState<SpecialGroup[]>([]);
  const [entraGroups, setEntraGroups] = useState<GroupInfo[]>([]);
  const [policies, setPolicies] = useState<SchedulePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [showCreate, setShowCreate] = useState(false);
  const [formGroupId, setFormGroupId] = useState("");
  const [formPolicyId, setFormPolicyId] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPriority, setFormPriority] = useState(10);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SpecialGroup | null>(null);
  const { t, locale } = useTranslation();

  const localeMap: Record<string, string> = { en: "en-GB", "nb-NO": "no-NO", de: "de-DE", es: "es-ES", pt: "pt-PT", sv: "sv-SE", da: "da-DK" };
  const dateLocale = localeMap[locale] || "en-GB";

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sgRes, grpRes, polRes] = await Promise.all([
        fetch("/api/special-groups"),
        fetch("/api/groups"),
        fetch("/api/policies"),
      ]);
      const sgData = await sgRes.json();
      const grpData = await grpRes.json();
      const polData = await polRes.json();
      if (sgData.success) setSpecialGroups(sgData.data);
      if (grpData.success) setEntraGroups(grpData.data);
      if (polData.success) setPolicies(polData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGroupId || !formPolicyId) return;
    setSaving(true);
    setError(null);

    const group = entraGroups.find((g) => g.id === formGroupId);
    try {
      const res = await fetch("/api/special-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: formGroupId,
          groupName: group?.displayName || "Unknown",
          description: formDescription,
          policyId: formPolicyId,
          priority: formPriority,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(t("specialGroups.createdSuccess", { name: group?.displayName ?? "" }));
        setShowCreate(false);
        setFormGroupId("");
        setFormPolicyId("");
        setFormDescription("");
        setFormPriority(10);
        await fetchData();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/special-groups/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSuccess(t("specialGroups.removedSuccess", { name: deleteTarget.groupName }));
        setDeleteTarget(null);
        await fetchData();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t("specialGroups.title")}
        subtitle={t("specialGroups.subtitle")}
        actions={
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
          >
            {showCreate ? t("common.cancel") : "➕ " + t("specialGroups.newGroup")}
          </button>
        }
      />

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">{t("common.dismiss")}</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
          <button onClick={() => setSuccess(null)} className="ml-2 underline">{t("common.dismiss")}</button>
        </div>
      )}

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <div className="flex gap-3">
          <span className="text-xl">⭐</span>
          <div>
            <p className="text-sm font-medium text-purple-800">{t("specialGroups.howItWorks")}</p>
            <p className="text-xs text-purple-600 mt-1">
              {t("specialGroups.howItWorksText")}
            </p>
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("specialGroups.formTitle")}</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("specialGroups.entraGroup")}</label>
                <select
                  value={formGroupId}
                  onChange={(e) => setFormGroupId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">{t("specialGroups.selectGroup")}</option>
                  {entraGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.displayName} ({g.memberCount ?? "?"} members)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("specialGroups.overridePolicy")}</label>
                <select
                  value={formPolicyId}
                  onChange={(e) => setFormPolicyId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">{t("specialGroups.selectPolicy")}</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.enableTime}–{p.disableTime})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("specialGroups.descriptionLabel")}</label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={t("specialGroups.descriptionPlaceholder")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("specialGroups.priority")}
              </label>
              <input
                type="number"
                value={formPriority}
                onChange={(e) => setFormPriority(Number(e.target.value))}
                min={1}
                max={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || !formGroupId || !formPolicyId}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {saving ? t("specialGroups.creating") : t("specialGroups.createGroup")}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Special Groups List */}
      {specialGroups.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <span className="text-4xl block mb-3">⭐</span>
          <p className="text-gray-500">{t("specialGroups.emptyState")}</p>
          <p className="text-sm text-gray-400 mt-1">
            {t("specialGroups.emptyStateHint")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {specialGroups.map((sg) => {
            const policy = policies.find((p) => p.id === sg.policyId);
            return (
              <div key={sg.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{sg.groupName}</h3>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                        {t("specialGroups.priorityLabel", { value: sg.priority })}
                      </span>
                    </div>
                    {sg.description && (
                      <p className="text-sm text-gray-500 mb-3">{sg.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>
                        🕒 <strong>{policy?.name ?? sg.policyName}</strong>
                        {policy && ` (${policy.enableTime}–${policy.disableTime})`}
                      </span>
                      <span>👥 {t("specialGroups.memberCount", { count: sg.memberCount })}</span>
                      <span>📅 {t("specialGroups.createdDate", { date: new Date(sg.createdAt).toLocaleDateString(dateLocale) })}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteTarget(sg)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                  >
                    {t("common.remove")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("specialGroups.removeConfirm")}
        message={t("specialGroups.removeMsg", { name: deleteTarget?.groupName ?? "" })}
        confirmLabel={t("common.remove")}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
