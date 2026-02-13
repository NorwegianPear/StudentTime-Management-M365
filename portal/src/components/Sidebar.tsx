"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTranslation } from "@/lib/i18n";

const navItems = [
  { labelKey: "nav.dashboard", href: "/", icon: "📊" },
  { labelKey: "nav.students", href: "/students", icon: "👥" },
  { labelKey: "nav.groups", href: "/groups", icon: "📁" },
  { labelKey: "nav.specialGroups", href: "/special-groups", icon: "⭐" },
  { labelKey: "nav.policies", href: "/policies", icon: "🕒" },
  { labelKey: "nav.schedules", href: "/schedules", icon: "📅" },
  { labelKey: "nav.pendingChanges", href: "/pending-changes", icon: "🔄" },
  { labelKey: "nav.auditLog", href: "/audit", icon: "📋" },
  { labelKey: "nav.docs", href: "/docs", icon: "📖" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useTranslation();

  return (
    <aside className="w-[260px] theme-sidebar min-h-screen flex flex-col shrink-0">
      {/* Logo/Brand */}
      <div className="px-5 py-5 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: "var(--sidebar-active)" }}>
            SA
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white leading-tight">{t("nav.brand")}</h1>
            <p className="text-[11px] mt-0.5 leading-tight" style={{ color: "var(--sidebar-text)" }}>{t("nav.brandSub")}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? "theme-sidebar-active text-white shadow-sm"
                    : "theme-sidebar-hover"
                }`}
                style={!isActive ? { color: "var(--sidebar-text)" } : undefined}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile */}
      {session?.user && (
        <div className="px-3 py-4 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
          <div className="flex items-center gap-2.5 px-2 mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: "var(--sidebar-active)" }}>
              {session.user.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium truncate text-white leading-tight">
                {session.user.name}
              </p>
              <p className="text-[11px] truncate leading-tight" style={{ color: "var(--sidebar-text)" }}>
                {session.user.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full px-3 py-1.5 text-xs rounded-lg transition-colors theme-sidebar-hover text-center"
            style={{ color: "var(--sidebar-text)" }}
          >
            {t("common.signOut")}
          </button>
        </div>
      )}
    </aside>
  );
}
