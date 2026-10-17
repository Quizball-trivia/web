"use client";

import dictionary from "@/messages/ru.json";
import { Providers, type ProvidersProps } from "./providers";

export function LocaleAssetProviders(props: ProvidersProps) {
  return <Providers {...props} initialMessages={props.initialMessages ?? (props.initialLocale === "ru" ? dictionary : undefined)} />;
}
