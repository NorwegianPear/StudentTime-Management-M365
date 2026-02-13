"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTranslation, LOCALES, type Locale } from "@/lib/i18n";
import { useTheme, type Theme } from "@/lib/theme";

const THEME_CONFIG: Record<Theme, { icon: string; colorClass: string }> = {
  light: { icon: "☀️", colorClass: "bg-amber-100 border-amber-300" },
  dark: { icon: "🌙", colorClass: "bg-slate-700 border-slate-500" },
  pinkPastel: { icon: "🌸", colorClass: "bg-pink-100 border-pink-300" },
};

export function SettingsPanel() {
  const { locale, setLocale, resetToDefault, isDefault, t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors
          text-slate-300 hover:bg-slate-800 hover:text-white w-full"
        title="Settings"
      >
        <span>⚙️</span>
        <span className="flex-1 text-left text-xs">
          {LOCALES[locale].flag} {LOCALES[locale].nativeName}
        </span>
        <span className="text-xs">{THEME_CONFIG[theme].icon}</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-72 settings-panel rounded-xl shadow-2xl border 
          overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2
          bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600"
          style={{ maxHeight: "80vh", overflowY: "auto" }}
        >
          {/* Language Section */}
          <div className="p-4 border-b border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                🌐 {t("common.language")}
              </h3>
              {!isDefault && (
                <button
                  onClick={() => { resetToDefault(); }}
                  className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 
                    text-gray-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 transition-colors"
                  title={t("common.resetDefault")}
                >
                  ↩ {t("common.resetDefault")}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-1">
              {(Object.entries(LOCALES) as [Locale, typeof LOCALES[Locale]][]).map(
                ([key, info]) => (
                  <button
                    key={key}
                    onClick={() => setLocale(key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
                      ${locale === key
                        ? "bg-blue-50 text-blue-700 font-medium border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                        : "text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-700"
                      }`}
                  >
                    <span className="text-lg">{info.flag}</span>
                    <span className="flex-1 text-left">{info.nativeName}</span>
                    {locale === key && (
                      <span className="text-blue-500 dark:text-blue-400">✓</span>
                    )}
                    {locale === key && isDefault && (
                      <span className="text-xs bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
                        auto
                      </span>
                    )}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Theme Section */}
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              🎨 {t("common.theme")}
            </h3>
            <div className="flex gap-2">
              {(["light", "dark", "pinkPastel"] as Theme[]).map((th) => (
                <button
                  key={th}
                  onClick={() => setTheme(th)}
                  className={`flex-1 flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border-2 
                    text-sm transition-all
                    ${theme === th
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm"
                      : "border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500"
                    }`}
                >
                  <span className="text-xl">{THEME_CONFIG[th].icon}</span>
                  <span className={`text-xs font-medium ${theme === th ? "text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-slate-400"}`}>
                    {t(`themes.${th}`)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
