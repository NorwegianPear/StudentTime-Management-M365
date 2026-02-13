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

  useEffect(() => {
    const fetchGroups = async () => {
      try {
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
    fetchGroups();
  }, []);

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
      <PageHeader title={t("groups.title")} subtitle={t("groups.subtitle")} />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            {t("common.dismiss")}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <div
            key={group.id}
            className="theme-surface rounded-xl border theme-border p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-lg">
                📁
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {t("common.members", { count: group.memberCount ?? 0 })}
              </span>
            </div>
            <h3 className="font-semibold theme-text-primary text-sm">
              {group.displayName}
            </h3>
            {group.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {group.description}
              </p>
            )}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 font-mono truncate">
                {group.id}
              </p>
            </div>
          </div>
        ))}

        {groups.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 text-gray-400">
            {t("groups.noGroups")}
          </div>
        )}
      </div>
    </div>
  );
}
