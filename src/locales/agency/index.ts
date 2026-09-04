import { agencyEn } from "./en";
import { agencyHa } from "./ha";
import { agencyFr } from "./fr";
import { SupportedLanguage } from "@/types/customer";

export const agencyTranslations = {
  en: agencyEn,
  ha: agencyHa,
  fr: agencyFr,
};

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

export function translateAgency(
  lang: SupportedLanguage,
  key: string,
  params?: Record<string, string | number>
): string {
  const dictionary = agencyTranslations[lang] || agencyTranslations.en;
  let text = getNestedValue(dictionary as unknown as Record<string, unknown>, key);

  if (!text && lang !== "en") {
    text = getNestedValue(agencyTranslations.en as unknown as Record<string, unknown>, key);
  }

  if (!text) {
    return key;
  }

  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      text = text.replace(new RegExp(`{{${paramKey}}}`, "g"), String(paramValue));
    }
  }

  return text;
}
