import { moment } from "obsidian";
import en from "./locales/en";
import ko from "./locales/ko";

export type TranslationKey = keyof typeof en;
export type TranslationParams = Record<string, string | number>;

type LocaleCode = "en" | "ko";
type TranslationMap = { [K in TranslationKey]?: string };

const translations: Record<LocaleCode, TranslationMap> = {
  en,
  ko,
};

const SUPPORTED_LOCALES: LocaleCode[] = ["en", "ko"];
const DEFAULT_LOCALE: LocaleCode = "en";

let currentLocale: LocaleCode = DEFAULT_LOCALE;
let initialized = false;

function detectLocale(): LocaleCode {
  const obsidianLocale = moment.locale();
  const baseLocale = obsidianLocale.split("-")[0].toLowerCase();

  if (SUPPORTED_LOCALES.includes(baseLocale as LocaleCode)) {
    return baseLocale as LocaleCode;
  }

  return DEFAULT_LOCALE;
}

export function initI18n(): void {
  if (initialized) return;

  currentLocale = detectLocale();
  initialized = true;
}

export function t(key: TranslationKey, params?: TranslationParams): string {
  if (!initialized) {
    initI18n();
  }

  let text = translations[currentLocale]?.[key] ?? translations[DEFAULT_LOCALE][key] ?? key;

  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(new RegExp(`{{${paramKey}}}`, "g"), String(value));
    });
  }

  if (process.env.NODE_ENV === "development") {
    const hasTranslation = translations[currentLocale]?.[key] !== undefined;
    if (!hasTranslation && currentLocale !== DEFAULT_LOCALE) {
      console.warn(`[i18n] Missing ${currentLocale} translation for key: ${key}`);
    }
  }

  return text;
}

export function getCurrentLocale(): LocaleCode {
  return currentLocale;
}

export function getSupportedLocales(): LocaleCode[] {
  return [...SUPPORTED_LOCALES];
}

export function resetI18n(): void {
  currentLocale = DEFAULT_LOCALE;
  initialized = false;
}
