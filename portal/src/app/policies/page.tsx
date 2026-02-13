"use client";

import { useEffect, useState, useCallback } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import type { SchedulePolicy, GroupInfo } from "@/types";
import { useTranslation } from "@/lib/i18n";

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

interface PolicyFormData {
  name: string;
  description: string;
  enableTime: string;
  disableTime: string;
  daysOfWeek: string[];
}

const emptyForm: PolicyFormData = {
  name: "",
  description: "",
  enableTime: "08:00",
  disableTime: "16:00",
  daysOfWeek: [...WEEKDAYS],
};

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<SchedulePolicy[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PolicyFormData>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SchedulePolicy | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const { t } = useTranslation();

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const [polRes, grpRes] = await Promise.all([
        fetch("/api/policies"),
        fetch("/api/groups"),
      ]);
      const polData = await polRes.json();
      const grpData = await grpRes.json();
      if (polData.success) setPolicies(polData.data);
      if (grpData.success) setGroups(grpData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  // ─── Create / Edit ─────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        // Update
        const res = await fetch(`/api/policies/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      } else {
        // Create
        const res = await fetch("/api/policies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      }
      setShowCreate(false);
      setEditingId(null);
      setFormData({ ...emptyForm });
      await fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (policy: SchedulePolicy) => {
    setEditingId(policy.id);
    setFormData({
      name: policy.name,
      description: policy.description,
      enableTime: policy.enableTime,
      disableTime: policy.disableTime,
      daysOfWeek: [...policy.daysOfWeek],
    });
    setShowCreate(true);
  };

  // ─── Delete ────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/policies/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setDeleteTarget(null);
      await fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  // ─── Toggle Active ─────────────────────────────────────────────────────

  const toggleActive = async (policy: SchedulePolicy) => {
    try {
      const res = await fetch(`/api/policies/${policy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !policy.isActive }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  // ─── Assign Groups ─────────────────────────────────────────────────────

  const startAssign = (policy: SchedulePolicy) => {
    setAssigningId(policy.id);
    setSelectedGroups([...policy.assignedGroupIds]);
  };

  const handleAssign = async () => {
    if (!assigningId) return;
    try {
      const res = await fetch(`/api/policies/${assigningId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedGroupIds: selectedGroups }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setAssigningId(null);
      setSelectedGroups([]);
      await fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign");
    }
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  // ─── Day toggle ────────────────────────────────────────────────────────

  const toggleDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day],
    }));
  };

  // ─── Render ────────────────────────────────────────────────────────────

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
        title={t("policies.title")}
        subtitle={t("policies.subtitle")}
        actions={
          <button
            onClick={() => { setShowCreate(true); setEditingId(null); setFormData({ ...emptyForm }); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
          >
            {t("policies.newPolicy")}
          </button>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            {t("common.dismiss")}
          </button>
        </div>
      )}

      {/* ── Create / Edit Modal ─────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">
                {editingId ? t("policies.editTitle") : t("policies.createTitle")}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("policies.policyName")}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("policies.policyNamePlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("policies.description")}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t("policies.descriptionPlaceholder")}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("policies.enableTime")}
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.enableTime}
                    onChange={(e) => setFormData({ ...formData, enableTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("policies.disableTime")}
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.disableTime}
                    onChange={(e) => setFormData({ ...formData, disableTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("policies.activeDays")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        formData.daysOfWeek.includes(day)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual preview */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-2">{t("policies.preview")}</p>
                <div className="h-6 bg-gray-200 rounded-full relative overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 bg-green-400"
                    style={{
                      left: `${(parseInt(formData.enableTime.split(":")[0]) / 24) * 100}%`,
                      width: `${((parseInt(formData.disableTime.split(":")[0]) - parseInt(formData.enableTime.split(":")[0])) / 24) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-gray-400">00:00</span>
                  <span className="text-[10px] text-green-700 font-medium">
                    {formData.enableTime} → {formData.disableTime}
                  </span>
                  <span className="text-[10px] text-gray-400">24:00</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? t("policies.saving") : editingId ? t("policies.updatePolicy") : t("policies.createPolicy")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign Groups Modal ─────────────────────────────────────────── */}
      {assigningId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{t("policies.assignTitle")}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {t("policies.assignSubtitle")}
              </p>
            </div>
            <div className="p-6 max-h-80 overflow-y-auto space-y-2">
              {groups.length === 0 ? (
                <p className="text-sm text-gray-400">{t("policies.noGroups")}</p>
              ) : (
                groups.map((group) => (
                  <label
                    key={group.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(group.id)}
                      onChange={() => toggleGroupSelection(group.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {group.displayName}
                      </p>
                      {group.description && (
                        <p className="text-xs text-gray-500">{group.description}</p>
                      )}
                    </div>
                    {group.memberCount !== undefined && (
                      <span className="text-xs text-gray-400">
                        {t("common.members", { count: group.memberCount })}
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setAssigningId(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleAssign}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                {t("policies.saveAssignment", { count: selectedGroups.length })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Policy Cards ────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {policies.map((policy) => (
          <div
            key={policy.id}
            className={`bg-white rounded-xl border p-5 transition-colors ${
              policy.isActive ? "border-green-300 shadow-sm" : "border-gray-200"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900">{policy.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      policy.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {policy.isActive ? t("common.active") : t("common.inactive")}
                  </span>
                </div>
                {policy.description && (
                  <p className="text-sm text-gray-500 mb-3">{policy.description}</p>
                )}

                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-green-600">🟢</span>
                    <span className="text-gray-600">
                      {t("policies.enable")} <strong>{policy.enableTime}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-red-600">🔴</span>
                    <span className="text-gray-600">
                      {t("policies.disable")} <strong>{policy.disableTime}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>📅</span>
                    <span className="text-gray-600">
                      {policy.daysOfWeek.length === 7
                        ? t("policies.everyDay")
                        : policy.daysOfWeek.length === 5 &&
                          WEEKDAYS.every((d) => policy.daysOfWeek.includes(d))
                        ? t("policies.weekdays")
                        : policy.daysOfWeek.map((d) => d.slice(0, 3)).join(", ")}
                    </span>
                  </div>
                </div>

                {/* Assigned groups */}
                {policy.assignedGroupNames.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="text-xs text-gray-500 mr-1">{t("policies.assignedTo")}</span>
                    {policy.assignedGroupNames.map((name, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => toggleActive(policy)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    policy.isActive
                      ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                >
                  {policy.isActive ? t("policies.deactivate") : t("policies.activate")}
                </button>
                <button
                  onClick={() => startAssign(policy)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100"
                >
                  {t("policies.assignGroups")}
                </button>
                <button
                  onClick={() => startEdit(policy)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200"
                >
                  {t("common.edit")}
                </button>
                <button
                  onClick={() => setDeleteTarget(policy)}
                  className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100"
                >
                  {t("common.delete")}
                </button>
              </div>
            </div>

            {/* Mini timeline */}
            <div className="mt-4 h-3 bg-gray-100 rounded-full relative overflow-hidden">
              <div
                className={`absolute top-0 bottom-0 ${
                  policy.isActive ? "bg-green-400" : "bg-gray-300"
                } rounded-full`}
                style={{
                  left: `${(parseInt(policy.enableTime.split(":")[0]) * 60 + parseInt(policy.enableTime.split(":")[1])) / 14.4}%`,
                  width: `${((parseInt(policy.disableTime.split(":")[0]) * 60 + parseInt(policy.disableTime.split(":")[1])) - (parseInt(policy.enableTime.split(":")[0]) * 60 + parseInt(policy.enableTime.split(":")[1]))) / 14.4}%`,
                }}
              />
            </div>
          </div>
        ))}

        {policies.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">📅</p>
            <p className="text-gray-500">{t("policies.emptyState")}</p>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={t("policies.deleteTitle")}
        message={t("policies.deleteMsg", { name: deleteTarget?.name ?? "" })}
        confirmLabel={t("policies.deleteTitle")}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
}
