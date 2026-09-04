import { en } from "./en";
import { ha } from "./ha";
import { fr } from "./fr";
import { SupportedLanguage } from "@/types/customer";

export const translations = {
  en,
  ha,
  fr,
};

export type TranslationKey = string;

// Helper to get nested object property via dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return typeof current === "string" ? current : undefined;
}

export function translate(
  lang: SupportedLanguage,
  key: string,
  params?: Record<string, string | number>
): string {
  const dictionary = translations[lang] || translations.en;
  let text = getNestedValue(dictionary as unknown as Record<string, unknown>, key);

  // Fallback to English if key missing in selected language
  if (!text && lang !== "en") {
    text = getNestedValue(translations.en as unknown as Record<string, unknown>, key);
  }

  if (!text) {
    return key;
  }

  // Interpolate {{param}} variables
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      text = text.replace(new RegExp(`{{${paramKey}}}`, "g"), String(paramValue));
    }
  }

  return text;
}
