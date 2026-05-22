import { describe, expect, it } from "vitest";

import en from "@/messages/en.json";
import ka from "@/messages/ka.json";

function flatten(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === "object" && v !== null ? flatten(v, key) : [key];
  });
}

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (typeof acc === "object" && acc !== null && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

describe("i18n message parity", () => {
  it("en.json and ka.json have identical key sets", () => {
    const enKeys = flatten(en).sort();
    const kaKeys = flatten(ka).sort();
    expect(kaKeys).toEqual(enKeys);
  });

  it("no ka.json value is empty", () => {
    for (const key of flatten(ka)) {
      const value = getByPath(ka, key);
      expect(
        typeof value === "string" && value.length > 0,
        `ka.json missing or empty translation for ${key}`,
      ).toBe(true);
    }
  });

  it("no en.json value is empty", () => {
    for (const key of flatten(en)) {
      const value = getByPath(en, key);
      expect(
        typeof value === "string" && value.length > 0,
        `en.json missing or empty value for ${key}`,
      ).toBe(true);
    }
  });
});
