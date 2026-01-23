import i18next from "i18next";
import { moment } from "obsidian";
import en from "./locales/en";
import ko from "./locales/ko";

export type TranslationKey = keyof typeof en;
export type TranslationParams = Record<string, string | number>;

type LocaleCode = "en" | "ko";

let initialized = false;

function detectLocale(): LocaleCode {
  const obsidianLocale = moment.locale();
  const baseLocale = obsidianLocale.split("-")[0].toLowerCase();

  if (baseLocale === "en" || baseLocale === "ko") {
    return baseLocale as LocaleCode;
  }

  return "en";
}

export function initI18n(): void {
  if (initialized) return;

  const locale = detectLocale();

  i18next.init({
    lng: locale,
    fallbackLng: "en",
    resources: {
      en: { translation: en },
      ko: { translation: ko },
    },
  });

  initialized = true;
}

export function t(key: TranslationKey, params?: TranslationParams): string {
  if (!initialized) {
    // Auto-initialize if not already initialized (for backward compatibility)
    void initI18n();
  }

  return i18next.t(key, params);
}

export function getCurrentLocale(): LocaleCode {
  return i18next.language as LocaleCode;
}

export function getSupportedLocales(): LocaleCode[] {
  return ["en", "ko"];
}

export function resetI18n(): void {
  initialized = false;
  if (i18next.services?.resourceStore) {
    (i18next.services.resourceStore as any).data = undefined;
  }
}
