import { SupportedLanguage } from "@/types/customer";
import { en } from "./en";
import { fr } from "./fr";
import { ha } from "./ha";

const regionalDictionaries: Record<string, any> = { en, fr, ha };

export function translateRegional(
  lang: SupportedLanguage = "en",
  key: string,
  params?: Record<string, string | number>,
): string {
  const dict = regionalDictionaries[lang] || regionalDictionaries.en;
  const parts = key.split(".");
  let current: any = dict;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      current = undefined;
      break;
    }
  }
  if (typeof current !== "string") {
    // Fall back to English rather than emitting a raw key.
    let fb: any = regionalDictionaries.en;
    for (const part of parts) {
      if (fb && typeof fb === "object" && part in fb) fb = fb[part];
      else return key;
    }
    return typeof fb === "string" ? fb : key;
  }
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      // Accept both {{k}} and single-brace {k} placeholder styles.
      current = current
        .replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), String(v))
        .replace(new RegExp(`(?<![{}])\\{\\s*${k}\\s*\\}(?![}])`, "g"), String(v));
    });
  }
  return current;
}
