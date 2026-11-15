"use client";

import dictionary from "@/messages/el.json";
import { Providers, type ProvidersProps } from "./providers";

export function LocaleAssetProviders(props: ProvidersProps) {
  return <Providers {...props} initialMessages={props.initialMessages ?? (props.initialLocale === "el" ? dictionary : undefined)} />;
}
