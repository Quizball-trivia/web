"use client";

import { usePathname } from "next/navigation";
import { preload } from "react-dom";
import { wordGameFontPreloads } from "@/lib/word-game-critical-assets";

/** SSR hints on the first visit; route-aware hints after in-app language changes. */
export function WordGameFontPreloads({ initialPathname }: { initialPathname: string }) {
  const pathname = usePathname() ?? initialPathname;
  for (const href of wordGameFontPreloads(pathname)) {
    preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }
  return null;
}
