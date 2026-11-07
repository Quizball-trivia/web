import { describe, expect, it } from "vitest";

import en from "@/messages/en.json";
import es from "@/messages/es.json";
import fr from "@/messages/fr.json";
import ka from "@/messages/ka.json";
import ru from "@/messages/ru.json";
import tr from "@/messages/tr.json";

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

  it("en.json and es.json have identical key sets", () => {
    const enKeys = flatten(en).sort();
    const esKeys = flatten(es).sort();
    expect(esKeys).toEqual(enKeys);
  });

  it("en.json and tr.json have identical key sets", () => {
    const enKeys = flatten(en).sort();
    const trKeys = flatten(tr).sort();
    expect(trKeys).toEqual(enKeys);
  });

  it("en.json and fr.json have identical key sets", () => {
    expect(flatten(fr).sort()).toEqual(flatten(en).sort());
  });

  it("no fr.json value is empty, and each keeps the English edge spaces", () => {
    for (const key of flatten(fr)) {
      const value = getByPath(fr, key);
      expect(typeof value === "string" && value.trim().length > 0, `fr.json missing or empty translation for ${key}`).toBe(true);
      const english = String(getByPath(en, key));
      expect(String(value).match(/^\s*/)?.[0], `${key} leading space`).toBe(english.match(/^\s*/)?.[0]);
      expect(String(value).match(/\s*$/)?.[0], `${key} trailing space`).toBe(english.match(/\s*$/)?.[0]);
    }
  });

  it("fr.json stays in Latin script and follows French typography", () => {
    for (const key of flatten(fr)) {
      const value = String(getByPath(fr, key));
      expect(value, key).not.toMatch(/[\u0370-\u03FF\u0400-\u052F\u1800-\u18AF\u10A0-\u10FF]/);
      expect(value, `${key} straight apostrophe`).not.toMatch(/\p{L}'\p{L}/u);
      expect(value, `${key} plain space before a mark`).not.toMatch(/ [;:!?»]|« /);
    }
  });

  it("en.json and ru.json have identical key sets", () => {
    expect(flatten(ru).sort()).toEqual(flatten(en).sort());
  });

  it("no ru.json value is empty", () => {
    for (const key of flatten(ru)) {
      const value = getByPath(ru, key);
      expect(
        typeof value === "string" && value.length > 0,
        `ru.json missing or empty translation for ${key}`,
      ).toBe(true);
    }
  });

  it("no tr.json value is empty", () => {
    for (const key of flatten(tr)) {
      const value = getByPath(tr, key);
      expect(
        typeof value === "string" && value.length > 0,
        `tr.json missing or empty translation for ${key}`,
      ).toBe(true);
    }
  });

  it.each([
    ["ka", ka],
    ["es", es],
    ["tr", tr],
    ["ru", ru],
    ["fr", fr],
  ] as const)("%s.json keeps every {placeholder} of the English source", (_name, catalog) => {
    const placeholders = (value: unknown) =>
      (typeof value === "string" ? value.match(/\{\w+\}/g) ?? [] : []).slice().sort();
    for (const key of flatten(en)) {
      expect(placeholders(getByPath(catalog, key)), key).toEqual(placeholders(getByPath(en, key)));
    }
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

  it("no es.json value is empty", () => {
    for (const key of flatten(es)) {
      const value = getByPath(es, key);
      expect(
        typeof value === "string" && value.length > 0,
        `es.json missing or empty translation for ${key}`,
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
