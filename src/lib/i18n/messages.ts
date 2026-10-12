import en from "@/messages/en.json";
import es from "@/messages/es.json";
import ka from "@/messages/ka.json";
import tr from "@/messages/tr.json";

import type { Locale } from "./locale-config";
export { LOCALES, isSupportedLocale, normalizeLocale, type Locale } from "./locale-config";

export const messages = { en, ka, es, tr } as const;

type Primitive = string | number | boolean | null;
type DotPrefix<TPrefix extends string, TKey extends string> = TPrefix extends "" ? TKey : `${TPrefix}.${TKey}`;

type DotNestedKeys<TValue, TPrefix extends string = ""> = TValue extends Primitive
  ? never
  : {
      [TKey in Extract<keyof TValue, string>]: TValue[TKey] extends Primitive
        ? DotPrefix<TPrefix, TKey>
        : DotNestedKeys<TValue[TKey], DotPrefix<TPrefix, TKey>>;
    }[Extract<keyof TValue, string>];

export type MessageKey = DotNestedKeys<typeof en>;

function getMessageValue(locale: Locale, key: MessageKey): string | undefined {
  const parts = key.split(".");
  let value: unknown = messages[locale];

  for (const part of parts) {
    if (!value || typeof value !== "object" || !(part in value)) {
      return undefined;
    }
    value = (value as Record<string, unknown>)[part];
  }

  return typeof value === "string" ? value : undefined;
}

export function translate(locale: Locale, key: MessageKey, params?: Record<string, string | number>): string {
  const template = getMessageValue(locale, key) ?? getMessageValue("en", key) ?? key;
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}
