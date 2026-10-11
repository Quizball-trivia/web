"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const EmptyCardArt = () => null;
const DemoModeArt = dynamic(() => import("@/features/demos/DemoModeArt")
  .then((module) => module.DemoModeArt)
  .catch((error: unknown) => {
    // Artwork is decorative. A failed code chunk must not break the card's
    // server-rendered label/link, or the rest of the game page.
    console.warn("Related-game artwork could not load.", error);
    return EmptyCardArt;
  }), { ssr: false });

/** Keep decorative, below-the-fold related artwork off the critical network path. */
export function DeferredCardArt({ slug, sizes, className }: { slug: string; sizes: string; className?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setNearViewport(true), 0);
      return () => window.clearTimeout(timer);
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: "200px" });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className="size-full">
      {nearViewport && <DemoModeArt slug={slug} sizes={sizes} className={className} />}
    </div>
  );
}
