"use client";

import dictionary from "@/messages/es.json";
import { Providers, type ProvidersProps } from "./providers";

export function LocaleAssetProviders(props: ProvidersProps) {
  // Caller data still wins. A persistent entry must never seed ES as another
  // locale if a router refresh changes the root's initialization props.
  return <Providers {...props} initialMessages={props.initialMessages ?? (props.initialLocale === "es" ? dictionary : undefined)} />;
}
