"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTranslation, LOCALES, type Locale } from "@/lib/i18n";
import { useTheme, type Theme } from "@/lib/theme";

const THEME_CONFIG: Record<Theme, { icon: string; label: string }> = {
  light: { icon: "☀️", label: "Light" },
  dark: { icon: "🌙", label: "Dark" },
  pinkPastel: { icon: "🌸", label: "Pink" },
};

export function TopBar() {
  const { locale, setLocale, resetToDefault, isDefault, t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [langOpen, setLangOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex items-center justify-end gap-2 mb-6">
      {/* Theme Toggle */}
      <div className="relative" ref={themeRef}>
        <button
          onClick={() => { setThemeOpen(!themeOpen); setLangOpen(false); }}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors
            theme-card border-[var(--card-border)] hover:opacity-80"
          title={t("common.theme")}
        >
          <span className="text-base">{THEME_CONFIG[theme].icon}</span>
        </button>

        {themeOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-2xl border overflow-hidden z-50
            theme-card border-[var(--card-border)]">
            <div className="p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                🎨 {t("common.theme")}
              </h3>
              <div className="space-y-1">
                {(["light", "dark", "pinkPastel"] as Theme[]).map((th) => (
                  <button
                    key={th}
                    onClick={() => { setTheme(th); setThemeOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all
                      ${theme === th
                        ? "bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-300"
                        : "hover:bg-gray-50 dark:hover:bg-slate-700"
                      }`}
                    style={theme !== th ? { color: "var(--text-primary)" } : undefined}
                  >
                    <span className="text-lg">{THEME_CONFIG[th].icon}</span>
                    <span>{t(`themes.${th}`)}</span>
                    {theme === th && <span className="ml-auto text-blue-500">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Language Toggle */}
      <div className="relative" ref={langRef}>
        <button
          onClick={() => { setLangOpen(!langOpen); setThemeOpen(false); }}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors
            theme-card border-[var(--card-border)] hover:opacity-80"
          title={t("common.language")}
        >
          <span className="text-base">{LOCALES[locale].flag}</span>
          <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
            {LOCALES[locale].nativeName}
          </span>
        </button>

        {langOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 rounded-xl shadow-2xl border overflow-hidden z-50
            theme-card border-[var(--card-border)]">
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  🌐 {t("common.language")}
                </h3>
                {!isDefault && (
                  <button
                    onClick={() => { resetToDefault(); }}
                    className="text-xs px-2 py-0.5 rounded transition-colors
                      hover:bg-gray-100 dark:hover:bg-slate-700"
                    style={{ color: "var(--text-secondary)" }}
                    title={t("common.resetDefault")}
                  >
                    ↩ {t("common.resetDefault")}
                  </button>
                )}
              </div>
              <div className="space-y-0.5">
                {(Object.entries(LOCALES) as [Locale, typeof LOCALES[Locale]][]).map(
                  ([key, info]) => (
                    <button
                      key={key}
                      onClick={() => { setLocale(key); setLangOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all
                        ${locale === key
                          ? "bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-300"
                          : "hover:bg-gray-50 dark:hover:bg-slate-700"
                        }`}
                      style={locale !== key ? { color: "var(--text-primary)" } : undefined}
                    >
                      <span className="text-lg">{info.flag}</span>
                      <span className="flex-1 text-left">{info.nativeName}</span>
                      {locale === key && <span className="text-blue-500">✓</span>}
                      {locale === key && isDefault && (
                        <span className="text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
                          auto
                        </span>
                      )}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
