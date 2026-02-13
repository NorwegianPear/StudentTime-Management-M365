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
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useTranslation();

  return (
    <aside className="w-64 theme-sidebar min-h-screen flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
        <h1 className="text-lg font-bold text-white">{t("nav.brand")}</h1>
        <p className="text-xs mt-1" style={{ color: "var(--sidebar-text)" }}>{t("nav.brandSub")}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "theme-sidebar-active text-white"
                      : "theme-sidebar-hover"
                  }`}
                  style={!isActive ? { color: "var(--sidebar-text)" } : undefined}
                >
                  <span>{item.icon}</span>
                  <span>{t(item.labelKey)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      {session?.user && (
        <div className="p-4 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: "var(--sidebar-active)" }}>
              {session.user.name?.[0] || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-white">
                {session.user.name}
              </p>
              <p className="text-xs truncate" style={{ color: "var(--sidebar-text)" }}>
                {session.user.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full px-3 py-1.5 text-xs rounded transition-colors theme-sidebar-hover"
            style={{ color: "var(--sidebar-text)" }}
          >
            {t("common.signOut")}
          </button>
        </div>
      )}
    </aside>
  );
}
