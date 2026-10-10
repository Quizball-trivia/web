"use client";

import { useEffect, useRef, useState } from "react";
import { DemoModeArt } from "@/features/demos/DemoModeArt";

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
