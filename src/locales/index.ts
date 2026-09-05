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

// Flatten a nested object namespace into a flat dot-notated record, e.g.
// { receipt: { title: "x" } } -> { "receipt.title": "x" }.
function flattenNamespace(
  namespace: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(namespace)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") {
      Object.assign(out, flattenNamespace(value as Record<string, unknown>, fullKey));
    } else if (typeof value === "string") {
      out[fullKey] = value;
    }
  }
  return out;
}

/**
 * Resolve an entire i18n namespace (e.g. "receipt") to a flat label map, with
 * English fallback for any missing keys. Useful for passing a batch of labels
 * to a component that renders keys directly (e.g. the receipt renderer).
 */
export function translateNamespace(
  lang: SupportedLanguage,
  namespace: string,
): Record<string, string> {
  const dictionary = (translations[lang] || translations.en) as Record<string, unknown>;
  const nsObj = getNestedValue(dictionary as unknown as Record<string, unknown>, namespace);
  const flat =
    nsObj && typeof nsObj === "object"
      ? flattenNamespace(nsObj as unknown as Record<string, unknown>, namespace)
      : {};

  // English fallback for keys missing in the selected language.
  if (lang !== "en") {
    const enNsObj = getNestedValue(
      (translations.en as Record<string, unknown>) as unknown as Record<string, unknown>,
      namespace,
    );
    const enFlat =
      enNsObj && typeof enNsObj === "object"
        ? flattenNamespace(enNsObj as unknown as Record<string, unknown>, namespace)
        : {};
    for (const [key, value] of Object.entries(enFlat)) {
      if (flat[key] === undefined) flat[key] = value;
    }
  }
  return flat;
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

  // Interpolate {{param}} variables. Both brace styles are supported: the
  // dictionary mixes `{{param}}` and single-brace `{param}` authors (footer
  // copyright year, FX rate countdown, Adashi cycle labels, payment and
  // support strings). Before the single-brace pass existed, those keys
  // rendered their placeholder verbatim on screen — e.g. "Rate expires in
  // {secs}s" — because the `{{param}}` pattern never matched.
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      const value = String(paramValue);
      text = text.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, "g"), value);
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), value);
    }
  }

  return text;
}
