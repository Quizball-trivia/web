"use client";

import dynamic from "next/dynamic";

// A server-side dynamic reference can preload this dataset on unrelated game
// pages. Load it only when a FIFA tile actually mounts in the browser.
const FifaModeArt = dynamic(() => import("./FifaModeArt").then((m) => m.FifaModeArt), { ssr: false });

export function FifaModeArtLazy(props: { slug: string; className?: string; glyph?: boolean }) {
  return <FifaModeArt {...props} />;
}
