"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

// Supported locales
export const LOCALES = {
  en: { label: "English", flag: "🇬🇧", nativeName: "English" },
  "nb-NO": { label: "Norsk Bokmål", flag: "🇳🇴", nativeName: "Norsk Bokmål" },
  de: { label: "Deutsch", flag: "🇩🇪", nativeName: "Deutsch" },
  es: { label: "Español", flag: "🇪🇸", nativeName: "Español" },
  pt: { label: "Português", flag: "🇵🇹", nativeName: "Português" },
  sv: { label: "Svenska", flag: "🇸🇪", nativeName: "Svenska" },
  da: { label: "Dansk", flag: "🇩🇰", nativeName: "Dansk" },
} as const;

export type Locale = keyof typeof LOCALES;

// Flatten nested keys to dot-notation: { a: { b: "x" } } → { "a.b": "x" }
type FlattenKeys<T, Prefix extends string = ""> = T extends Record<string, unknown>
  ? {
      [K in keyof T & string]: T[K] extends Record<string, unknown>
        ? FlattenKeys<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

// Import types for translations
import type { TranslationDict } from "./translations/en";
export type TranslationKey = FlattenKeys<TranslationDict>;

// ─── Context ─────────────────────────────────────────────────────────
interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  resetToDefault: () => void;
  isDefault: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

// ─── Helpers ─────────────────────────────────────────────────────────

/** Detect browser keyboard/language setting */
function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "en";

  // Use navigator.language (matches keyboard language default)
  const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || "en";

  // Map browser language codes to our supported locales
  const langMap: Record<string, Locale> = {
    en: "en",
    "en-US": "en",
    "en-GB": "en",
    nb: "nb-NO",
    "nb-NO": "nb-NO",
    no: "nb-NO",
    "no-NO": "nb-NO",
    nn: "nb-NO",
    "nn-NO": "nb-NO",
    de: "de",
    "de-DE": "de",
    "de-AT": "de",
    "de-CH": "de",
    es: "es",
    "es-ES": "es",
    "es-MX": "es",
    pt: "pt",
    "pt-BR": "pt",
    "pt-PT": "pt",
    sv: "sv",
    "sv-SE": "sv",
    da: "da",
    "da-DK": "da",
  };

  // Exact match first
  if (langMap[browserLang]) return langMap[browserLang];

  // Try base language (e.g., "de-AT" → "de")
  const base = browserLang.split("-")[0];
  if (langMap[base]) return langMap[base];

  return "en";
}

/** Resolve a dot-path key from a nested object */
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

// ─── Translation loader (eagerly import all translations) ─────────────
import enDict from "./translations/en";
import nbNODict from "./translations/nb-NO";
import deDict from "./translations/de";
import esDict from "./translations/es";
import ptDict from "./translations/pt";
import svDict from "./translations/sv";
import daDict from "./translations/da";

const allTranslations: Record<Locale, Record<string, unknown>> = {
  en: enDict as unknown as Record<string, unknown>,
  "nb-NO": nbNODict as unknown as Record<string, unknown>,
  de: deDict as unknown as Record<string, unknown>,
  es: esDict as unknown as Record<string, unknown>,
  pt: ptDict as unknown as Record<string, unknown>,
  sv: svDict as unknown as Record<string, unknown>,
  da: daDict as unknown as Record<string, unknown>,
};

function getTranslations(locale: Locale): Record<string, unknown> {
  return allTranslations[locale] || allTranslations.en;
}

// ─── Provider ────────────────────────────────────────────────────────
const STORAGE_KEY = "student-portal-locale";
const STORAGE_DEFAULT_KEY = "student-portal-locale-is-default";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Initialize from localStorage/browser synchronously
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return "en";
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    const storedIsDefault = localStorage.getItem(STORAGE_DEFAULT_KEY);
    if (stored && storedIsDefault === "false") return stored;
    return detectBrowserLocale();
  });
  const [isDefault, setIsDefault] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(STORAGE_DEFAULT_KEY) !== "false";
  });
  // Update translations when locale changes (locale changes come from setLocale/resetToDefault, not from effects)
  const translations = getTranslations(locale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setIsDefault(false);
    localStorage.setItem(STORAGE_KEY, newLocale);
    localStorage.setItem(STORAGE_DEFAULT_KEY, "false");
  }, []);

  const resetToDefault = useCallback(() => {
    const detected = detectBrowserLocale();
    setLocaleState(detected);
    setIsDefault(true);
    localStorage.setItem(STORAGE_KEY, detected);
    localStorage.setItem(STORAGE_DEFAULT_KEY, "true");
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value = getNestedValue(translations, key);
      if (!value) return key; // Fallback to key itself

      // Interpolate {{param}} placeholders
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
        }
      }
      return value;
    },
    [translations]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, resetToDefault, isDefault, t }}>
      {children}
    </I18nContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────
export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within I18nProvider");
  return ctx;
}
