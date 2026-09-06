import { describe, it, expect } from "vitest";
import { translate, translateNamespace } from "@/locales";
import { en } from "@/locales/en";

/**
 * i18n contract tests.
 *
 * The dictionary mixes two placeholder authoring styles — `{{param}}` and
 * `{param}` — and until the interpolation loop handled both, seven keys in
 * each language rendered their placeholders verbatim on screen (FX countdown
 * "Rate expires in {secs}s", Adashi "Cycle #{cycle}", footer "{year}",
 * payments, support, simulator). These tests pin the contract so a regression
 * is caught before it ships.
 */

describe("translate() placeholder interpolation", () => {
  it("interpolates single-brace {param} values (fx.rateExpiresIn)", () => {
    expect(translate("en", "fx.rateExpiresIn", { secs: 42 })).toBe("Rate expires in 42s");
    expect(translate("fr", "fx.rateExpiresIn", { secs: 7 })).toBe("Le taux expire dans 7s");
    expect(translate("ha", "fx.rateExpiresIn", { secs: 7 })).toBe("Farashin zai ƙare nan da 7s");
  });

  it("interpolates multiple params in one string (payments.confirmedDesc)", () => {
    expect(translate("en", "customer.payments.confirmedDesc", { amount: "₦2,000", merchant: "Garba Store" }))
      .toBe("Paid ₦2,000 to Garba Store.");
  });

  it("interpolates Adashi cycle labels (contributionDue / dueOn)", () => {
    expect(translate("en", "customer.adashi.contributionDue", { cycle: 3 })).toBe("Cycle #3 Contribution");
    expect(translate("en", "customer.adashi.dueOn", { day: "Friday" })).toBe("Due on Friday");
  });

  it("leaves no raw placeholder behind for every param-bearing key", () => {
    // Every dictionary string containing {word} or {{word}} must fully
    // interpolate when its params are supplied.
    const flat: Record<string, string> = {};
    const walk = (obj: unknown, prefix = "") => {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object") walk(v, key);
        else if (typeof v === "string") flat[key] = v;
      }
    };
    walk(en);
    const paramKeys = Object.entries(flat).filter(([, v]) => /\{\{?\w+\}?\}/.test(v));
    expect(paramKeys.length).toBeGreaterThan(10); // we know there are 15+
    for (const [key, value] of paramKeys) {
      const params: Record<string, string> = {};
      for (const m of Array.from(value.matchAll(/\{+\s*(\w+)\s*\}+/g))) params[m[1]] = "X";
      const out = translate("en", key, params);
      expect(out, `key "${key}" left a raw placeholder`).not.toMatch(/\{\{?\w+\}?\}/);
    }
  });
});

describe("translate() fallback behaviour", () => {
  it("returns the key itself when it exists in no language", () => {
    expect(translate("en", "no.such.key.exists")).toBe("no.such.key.exists");
  });

  it("falls back to English when the key is missing in the selected language", () => {
    // Every EN key must resolve (possibly via fallback) in FR and HA with a
    // non-key value — the same contract scripts/i18n-parity.mjs enforces.
    expect(translate("ha", "nav.home")).toBe("Gida");
    expect(translate("fr", "nav.home")).toBe("Accueil");
  });

  it("resolves the Adashi nav label in all three languages", () => {
    expect(translate("en", "nav.adashi")).toBe("Adashi");
    expect(translate("fr", "nav.adashi")).toBe("Adashi");
    expect(translate("ha", "nav.adashi")).toBe("Adashi");
  });

  it("labels the transfer fee as included in all three languages", () => {
    expect(translate("en", "transfers.feeIncluded")).toContain("included");
    expect(translate("fr", "transfers.feeIncluded")).toContain("inclus");
    expect(translate("ha", "transfers.feeIncluded")).toBeTruthy();
  });
});

describe("translateNamespace()", () => {
  it("flattens a namespace to dot-notated labels", () => {
    const ns = translateNamespace("en", "customer.adashi");
    expect(ns["customer.adashi.trustedRosca"]).toBe("Trusted Rotating Savings (ROSCA)");
    expect(ns["customer.adashi.contributionDue"]).toBe("Cycle #{cycle} Contribution");
  });

  it("resolves the receipt label map the receipt modal consumes", () => {
    // Regression: getNestedValue returned undefined for namespace OBJECTS,
    // so this map was always empty and the receipt rendered raw keys
    // ("RECEIPT.TITLE", "receipt.to", …) in every language.
    const en = translateNamespace("en", "receipt");
    expect(en["receipt.title"]).toBe("Official Transaction Receipt");
    expect(en["receipt.transactionReference"]).toBe("Transaction Reference");

    const fr = translateNamespace("fr", "receipt");
    expect(Object.keys(fr).length).toBeGreaterThan(10);
    expect(fr["receipt.title"]).not.toBe(en["receipt.title"]); // actually translated

    const ha = translateNamespace("ha", "receipt");
    expect(Object.keys(ha).length).toBeGreaterThan(10);
  });
});
