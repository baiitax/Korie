import { en } from "./en";
import { ha } from "./ha";
import { fr } from "./fr";
import { SupportedLanguage } from "@/types/customer";

export const aggregatorDictionaries = {
  en,
  ha,
  fr,
};

export function translateAggregator(
  lang: SupportedLanguage = "en",
  key: string,
  params?: Record<string, string | number>
): string {
  const dict = aggregatorDictionaries[lang] || aggregatorDictionaries.en;
  const parts = key.split(".");
  let current: any = dict;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      // Fallback to English
      let fallback: any = aggregatorDictionaries.en;
      for (const fPart of parts) {
        if (fallback && typeof fallback === "object" && fPart in fallback) {
          fallback = fallback[fPart];
        } else {
          return key;
        }
      }
      current = fallback;
      break;
    }
  }

  if (typeof current !== "string") {
    return key;
  }

  let result = current;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      result = result.replace(new RegExp(`{{${k}}}`, "g"), String(v));
    });
  }

  return result;
}
