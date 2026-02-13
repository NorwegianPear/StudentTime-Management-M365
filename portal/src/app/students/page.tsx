"use client";

import { useEffect, useState, useCallback } from "react";
import { StudentTable } from "@/components/StudentTable";
import { StudentFilters } from "@/components/StudentFilters";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SuspendDialog } from "@/components/SuspendDialog";
import { TransferDialog } from "@/components/TransferDialog";
import { NewStudentDialog } from "@/components/NewStudentDialog";
import { PromoteDialog } from "@/components/PromoteDialog";
import type { StudentUser, GroupInfo, SchedulePolicy } from "@/types";
import { useTranslation } from "@/lib/i18n";

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [policies, setPolicies] = useState<SchedulePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter state
  const [filterGroup, setFilterGroup] = useState("");
  const [filterPolicy, setFilterPolicy] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showOverridesOnly, setShowOverridesOnly] = useState(false);

  // Dialog state
  const [bulkAction, setBulkAction] = useState<"enable" | "disable" | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<StudentUser | null>(null);
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [unsuspendTarget, setUnsuspendTarget] = useState<StudentUser | null>(null);
  const [unsuspendLoading, setUnsuspendLoading] = useState(false);
  const [transferTarget, setTransferTarget] = useState<StudentUser | null>(null);
  const [transferLoading, setTransferLoading] = useState(false);
  const [showNewStudent, setShowNewStudent] = useState(false);
  const [newStudentLoading, setNewStudentLoading] = useState(false);
  const [showPromote, setShowPromote] = useState(false);
  const [promoteLoading, setPromoteLoading] = useState(false);

  const { t, locale } = useTranslation();
  const localeMap: Record<string, string> = { en: "en-GB", "nb-NO": "no-NO", de: "de-DE", es: "es-ES", pt: "pt-PT", sv: "sv-SE", da: "da-DK" };
  const dateLocale = localeMap[locale] || "en-GB";

  // ── Fetch data ─────────────────────────────────────────────────────────

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterGroup) params.set("groupId", filterGroup);
      if (filterPolicy) params.set("policyId", filterPolicy);
      if (filterStatus !== "all") params.set("status", filterStatus);
      const qs = params.toString();
      const res = await fetch(`/api/students${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      if (data.success) {
        setStudents(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [filterGroup, filterPolicy, filterStatus]);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      if (data.success) setGroups(data.data);
    } catch { /* ignore */ }
  }, []);

  const fetchPolicies = useCallback(async () => {
    try {
      const res = await fetch("/api/policies");
      const data = await res.json();
      if (data.success) setPolicies(data.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchGroups();
    fetchPolicies();
  }, [fetchStudents, fetchGroups, fetchPolicies]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountEnabled: enabled }),
      });
      const data = await res.json();
      if (data.success) {
        setStudents((prev) =>
          prev.map((s) => (s.id === id ? { ...s, accountEnabled: enabled } : s))
        );
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

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
        setSuccess(t("students.bulkSuccess", { action: bulkAction, succeeded: data.data.succeeded, failed: data.data.failed }));
        await fetchStudents();
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/students/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        setSuccess(t("students.removedSuccess", { name: deleteTarget.name }));
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const handleSuspend = async (reason: string, endDate: string) => {
    if (!suspendTarget) return;
    setSuspendLoading(true);
    try {
      const res = await fetch(`/api/students/${suspendTarget.id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, endDate }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(t("students.suspendedSuccess", { name: suspendTarget.displayName, date: new Date(endDate).toLocaleDateString(dateLocale) }));
        await fetchStudents();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSuspendLoading(false);
      setSuspendTarget(null);
    }
  };

  const handleUnsuspend = async () => {
    if (!unsuspendTarget) return;
    setUnsuspendLoading(true);
    try {
      const res = await fetch(`/api/students/${unsuspendTarget.id}/suspend`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSuccess(t("students.liftedSuccess", { name: unsuspendTarget.displayName }));
        await fetchStudents();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setUnsuspendLoading(false);
      setUnsuspendTarget(null);
    }
  };

  const handleTransfer = async (fromGroupId: string, toGroupId: string) => {
    if (!transferTarget) return;
    setTransferLoading(true);
    try {
      const res = await fetch(`/api/students/${transferTarget.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromGroupId, toGroupId }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.data.message);
        await fetchStudents();
        await fetchGroups();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setTransferLoading(false);
      setTransferTarget(null);
    }
  };

  const handleNewStudent = async (
    firstName: string,
    lastName: string,
    groupId: string,
    department?: string
  ) => {
    setNewStudentLoading(true);
    try {
      const res = await fetch("/api/students/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, groupId, department }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(t("students.createdSuccess", { name: data.data.displayName, password: data.data.temporaryPassword }));
        await fetchStudents();
        await fetchGroups();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setNewStudentLoading(false);
      setShowNewStudent(false);
    }
  };

  const handlePromote = async (promotions: { fromGroupId: string; toGroupId: string }[]) => {
    setPromoteLoading(true);
    try {
      const res = await fetch("/api/students/bulk/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promotions }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.data.message);
        await fetchStudents();
        await fetchGroups();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setPromoteLoading(false);
      setShowPromote(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────

  // Client-side filtering (search + special groups)
  const filteredStudents = students.filter((s) => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        s.displayName.toLowerCase().includes(q) ||
        s.userPrincipalName.toLowerCase().includes(q) ||
        (s.department ?? "").toLowerCase().includes(q) ||
        (s.groups ?? []).some((g) => g.displayName.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }
    // Status filter (client-side supplement)
    if (filterStatus === "suspended" && !s.suspension) return false;
    if (filterStatus === "enabled" && (!s.accountEnabled || s.suspension)) return false;
    if (filterStatus === "disabled" && (s.accountEnabled || s.suspension)) return false;
    // Special groups filter
    if (showOverridesOnly) {
      const hasOverride = (s.groups ?? []).some((g) => g.policyId);
      if (!hasOverride) return false;
    }
    return true;
  });

  const enabledCount = students.filter((s) => s.accountEnabled && !s.suspension).length;
  const disabledCount = students.filter((s) => !s.accountEnabled && !s.suspension).length;
  const suspendedCount = students.filter((s) => !!s.suspension).length;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold theme-text-primary">{t("students.title")}</h1>
          <p className="theme-text-secondary mt-1">
            {t("students.subtitle", { total: students.length, enabled: enabledCount, disabled: disabledCount })}
            {suspendedCount > 0 && t("students.subtitleSuspended", { count: suspendedCount })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowNewStudent(true)}
            className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            ➕ {t("students.newStudent")}
          </button>
          <button
            onClick={() => setBulkAction("enable")}
            className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            {t("dashboard.enableAll")}
          </button>
          <button
            onClick={() => setBulkAction("disable")}
            className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            {t("dashboard.disableAll")}
          </button>
          <button
            onClick={() => setShowPromote(true)}
            className="px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            🎓 {t("students.promoteClasses")}
          </button>
          <button
            onClick={() => { fetchStudents(); fetchGroups(); fetchPolicies(); }}
            className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            🔄 {t("common.refresh")}
          </button>
        </div>
      </div>

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

      {/* Filters */}
      <StudentFilters
        groups={groups}
        policies={policies}
        selectedGroup={filterGroup}
        selectedPolicy={filterPolicy}
        selectedStatus={filterStatus}
        searchQuery={searchQuery}
        showOverridesOnly={showOverridesOnly}
        onGroupChange={setFilterGroup}
        onPolicyChange={setFilterPolicy}
        onStatusChange={setFilterStatus}
        onSearchChange={setSearchQuery}
        onOverridesOnlyChange={setShowOverridesOnly}
        suspendedCount={suspendedCount}
        totalCount={students.length}
        filteredCount={filteredStudents.length}
      />

      {/* Table */}
      <StudentTable
        students={filteredStudents}
        onToggle={handleToggle}
        onDelete={(id, displayName) => setDeleteTarget({ id, name: displayName })}
        onSuspend={(student) => setSuspendTarget(student)}
        onUnsuspend={(student) => setUnsuspendTarget(student)}
        onTransfer={(student) => setTransferTarget(student)}
        loading={loading}
      />

      {/* ── Dialogs ────────────────────────────────────────────────────── */}

      <ConfirmDialog
        open={bulkAction !== null}
        title={bulkAction === "enable" ? t("dashboard.enableAllConfirm") : t("dashboard.disableAllConfirm")}
        message={
          bulkAction === "enable"
            ? t("dashboard.enableAllMsg", { count: students.length })
            : t("dashboard.disableAllMsg", { count: students.length })
        }
        confirmLabel={bulkAction === "enable" ? t("dashboard.enableAll") : t("dashboard.disableAll")}
        variant={bulkAction === "disable" ? "danger" : "primary"}
        onConfirm={handleBulkAction}
        onCancel={() => setBulkAction(null)}
        loading={bulkLoading}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("students.removeConfirm")}
        message={t("students.removeMsg", { name: deleteTarget?.name ?? "" })}
        confirmLabel={t("students.removeStudent")}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />

      <ConfirmDialog
        open={unsuspendTarget !== null}
        title={t("students.liftConfirm")}
        message={t("students.liftMsg", { name: unsuspendTarget?.displayName ?? "" })}
        confirmLabel={t("students.liftSuspension")}
        variant="primary"
        onConfirm={handleUnsuspend}
        onCancel={() => setUnsuspendTarget(null)}
        loading={unsuspendLoading}
      />

      <SuspendDialog
        open={suspendTarget !== null}
        studentName={suspendTarget?.displayName || ""}
        onConfirm={handleSuspend}
        onCancel={() => setSuspendTarget(null)}
        loading={suspendLoading}
      />

      <TransferDialog
        open={transferTarget !== null}
        studentName={transferTarget?.displayName || ""}
        groups={groups}
        onConfirm={handleTransfer}
        onCancel={() => setTransferTarget(null)}
        loading={transferLoading}
      />

      <NewStudentDialog
        open={showNewStudent}
        groups={groups}
        onConfirm={handleNewStudent}
        onCancel={() => setShowNewStudent(false)}
        loading={newStudentLoading}
      />

      <PromoteDialog
        open={showPromote}
        groups={groups}
        onConfirm={handlePromote}
        onCancel={() => setShowPromote(false)}
        loading={promoteLoading}
      />
    </div>
  );
}
