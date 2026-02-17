"use client";

import { useEffect, useState } from "react";
import type { GroupInfo } from "@/types";
import { PageHeader } from "@/components/PageHeader";
import { useTranslation } from "@/lib/i18n";

export default function GroupsPage() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [populating, setPopulating] = useState(false);
  const [populateResult, setPopulateResult] = useState<{
    message: string;
    details: string[];
  } | null>(null);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/groups");
      const data = await res.json();
      if (data.success) {
        setGroups(data.data);
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
    fetchGroups();
  }, []);

  const handlePopulate = async () => {
    if (
      !confirm(
        "This will add demo students to their class groups using the app's Managed Identity. Continue?"
      )
    )
      return;
    setPopulating(true);
    setPopulateResult(null);
    try {
      const res = await fetch("/api/groups/populate", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setPopulateResult(data.data);
        // Refresh groups to show updated member counts
        await fetchGroups();
      } else {
        setError(data.error || "Failed to populate groups");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to populate groups"
      );
    } finally {
      setPopulating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 theme-text-muted">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          {t("groups.loadingGroups")}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title={t("groups.title")} subtitle={t("groups.subtitle")} />
        <button
          onClick={handlePopulate}
          disabled={populating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {populating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Populating...
            </>
          ) : (
            <>
              <span>👥</span>
              Seed Demo Members
            </>
          )}
        </button>
      </div>

      {error && (
        <div
          className="mb-4 p-4 rounded-lg text-sm"
          style={{
            backgroundColor: "var(--badge-red-bg)",
            border: "1px solid var(--badge-red-border)",
            color: "var(--badge-red-text)",
          }}
        >
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            {t("common.dismiss")}
          </button>
        </div>
      )}

      {populateResult && (
        <div
          className="mb-4 p-4 rounded-lg text-sm"
          style={{
            backgroundColor: "var(--badge-green-bg)",
            border: "1px solid var(--badge-green-border)",
            color: "var(--badge-green-text)",
          }}
        >
          <p className="font-medium mb-2">{populateResult.message}</p>
          <div className="max-h-40 overflow-y-auto text-xs space-y-0.5">
            {populateResult.details.map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
          <button
            onClick={() => setPopulateResult(null)}
            className="mt-2 underline text-xs"
          >
            {t("common.dismiss")}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <div
            key={group.id}
            className="rounded-xl p-5 hover:shadow-md transition-shadow"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style={{
                  backgroundColor: "var(--badge-purple-bg, #f3e8ff)",
                }}
              >
                📁
              </div>
              <span
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "var(--badge-blue-bg)",
                  color: "var(--badge-blue-text)",
                  border: "1px solid var(--badge-blue-border)",
                }}
              >
                {t("common.members", { count: group.memberCount ?? 0 })}
              </span>
            </div>
            <h3
              className="font-semibold text-sm"
              style={{ color: "var(--text-primary)" }}
            >
              {group.displayName}
            </h3>
            {group.description && (
              <p
                className="text-xs mt-1 line-clamp-2"
                style={{ color: "var(--text-muted)" }}
              >
                {group.description}
              </p>
            )}
            <div
              className="mt-3 pt-3"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <p
                className="text-xs font-mono truncate"
                style={{ color: "var(--text-muted)" }}
              >
                {group.id}
              </p>
            </div>
          </div>
        ))}

        {groups.length === 0 && !loading && (
          <div
            className="col-span-full text-center py-12"
            style={{ color: "var(--text-muted)" }}
          >
            {t("groups.noGroups")}
          </div>
        )}
      </div>
    </div>
  );
}
