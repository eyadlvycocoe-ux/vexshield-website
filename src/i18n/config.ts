import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";

const STORAGE_KEY = "airshield_i18n_lang";
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "de", label: "German", nativeLabel: "Deutsch" },
  { code: "it", label: "Italian", nativeLabel: "Italiano" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português" },
  { code: "nl", label: "Dutch", nativeLabel: "Nederlands" },
  { code: "hu", label: "Hungarian", nativeLabel: "Magyar" },
  { code: "cs", label: "Czech", nativeLabel: "Čeština" },
  { code: "ko", label: "Korean", nativeLabel: "한국어" },
] as const;

const ALLOWED_LANGS = new Set(SUPPORTED_LANGUAGES.map((lang) => lang.code));

const LOCALE_LOADERS: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  ar: () => import("./locales/ar.json"),
  fr: () => import("./locales/fr.json"),
  es: () => import("./locales/es.json"),
  de: () => import("./locales/de.json"),
  it: () => import("./locales/it.json"),
  pt: () => import("./locales/pt.json"),
  nl: () => import("./locales/nl.json"),
  hu: () => import("./locales/hu.json"),
  cs: () => import("./locales/cs.json"),
  ko: () => import("./locales/ko.json"),
};

function getInitialLanguage(): string {
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ALLOWED_LANGS.has(stored)) return stored;
  } catch {
    /* ignore */
  }
  return "en";
}

export async function ensureLocaleLoaded(lng: string): Promise<void> {
  if (lng === "en" || !ALLOWED_LANGS.has(lng)) return;
  if (i18n.hasResourceBundle(lng, "translation")) return;
  const loader = LOCALE_LOADERS[lng];
  if (!loader) return;
  const mod = await loader();
  i18n.addResourceBundle(lng, "translation", mod.default ?? mod, true, true);
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  partialBundledLanguages: true,
});

const bootLang = getInitialLanguage();
if (bootLang !== "en") {
  void ensureLocaleLoaded(bootLang);
}

i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
    document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
  }
  void ensureLocaleLoaded(lng);
});

if (typeof document !== "undefined") {
  document.documentElement.lang = i18n.language;
  document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
}

export default i18n;
