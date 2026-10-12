import en from "@/messages/en.json";
import type { Locale } from "./locale-config";
import type { MessageKey } from "./messages";

export type MessageDictionary = Readonly<Record<string, unknown>>;

// Immutable, locale-keyed assets only; never store account/request state here.
const dictionaries: Partial<Record<Locale, MessageDictionary>> = { en };
const pending: Partial<Record<Locale, Promise<MessageDictionary>>> = {};
const loaders = {
  es: () => import("@/messages/es.json").then((module) => module.default),
  ka: () => import("@/messages/ka.json").then((module) => module.default),
  tr: () => import("@/messages/tr.json").then((module) => module.default),
};

export function cachedLocaleMessages(locale: Locale): MessageDictionary | undefined {
  return dictionaries[locale];
}

export function primeLocaleMessages(locale: Locale, dictionary: MessageDictionary): void {
  // Server-selected messages belong to the render's props until hydration.
  if (typeof window !== "undefined") dictionaries[locale] = dictionary;
}

export function loadLocaleMessages(locale: Locale): Promise<MessageDictionary> {
  const cached = dictionaries[locale];
  if (cached) return Promise.resolve(cached);
  if (pending[locale]) return pending[locale];
  if (locale === "en") return Promise.resolve(en);
  const request = loaders[locale]().then((dictionary) => {
    dictionaries[locale] = dictionary;
    return dictionary;
  }).finally(() => { delete pending[locale]; });
  pending[locale] = request;
  return request;
}

function messageValue(dictionary: MessageDictionary | undefined, key: MessageKey): string | undefined {
  let value: unknown = dictionary;
  for (const part of key.split(".")) {
    if (!value || typeof value !== "object" || !(part in value)) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return typeof value === "string" ? value : undefined;
}

export function translateDictionary(dictionary: MessageDictionary | undefined, key: MessageKey, params?: Record<string, string | number>): string {
  const template = messageValue(dictionary, key) ?? messageValue(en, key) ?? key;
  return params ? template.replace(/\{(\w+)\}/g, (match, name: string) => params[name] === undefined ? match : String(params[name])) : template;
}

/** For non-React consumers, e.g. realtime toasts after the locale provider loads. */
export function translate(locale: Locale, key: MessageKey, params?: Record<string, string | number>): string {
  return translateDictionary(dictionaries[locale], key, params);
}
