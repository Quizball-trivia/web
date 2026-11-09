"use client";

import { useCallback, useRef } from "react";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import type { PartnerGameId } from "../api/partnerApi.types";
import { PartnerGameHost } from "./PartnerGameHost";
import { partnerGameRegistry } from "./registry";

/** Below this a phone's text gets too small to read: the screen scrolls instead. */
const MIN_FIT_ZOOM = 0.72;

/**
 * Phones and tablets: scales the game down just enough to fit the frame's height, so a screen never needs scrolling
 * whatever the device or the partner's own header. Wide frames keep each game's own layout.
 */
function useFitFrameHeight(enabled: boolean) {
  const cleanup = useRef<(() => void) | null>(null);
  return useCallback(
    (el: HTMLDivElement | null) => {
      cleanup.current?.();
      cleanup.current = null;
      if (!el || !enabled || typeof ResizeObserver === "undefined" || typeof MutationObserver === "undefined") return;
      let frame = 0;
      const fit = () => {
        frame = 0;
        // Measured from unscaled, in one task (no paint between), so a shorter next screen grows back. Repeated because
        // scaling down widens the layout, and boards sized by their width grow taller again.
        el.style.zoom = "";
        const root = document.scrollingElement;
        if (!root) return;
        let zoom = 1;
        for (let attempt = 0; attempt < 6 && zoom > MIN_FIT_ZOOM; attempt += 1) {
          const overflow = root.scrollHeight - window.innerHeight;
          if (overflow <= 0) break;
          const shown = el.getBoundingClientRect().height;
          zoom = Math.max(MIN_FIT_ZOOM, zoom * (shown / (shown + overflow)));
          el.style.zoom = String(zoom);
        }
      };
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(fit);
      };
      const resize = new ResizeObserver(schedule);
      resize.observe(el);
      const mutations = new MutationObserver(schedule);
      mutations.observe(el, { childList: true, subtree: true });
      window.addEventListener("resize", schedule);
      fit();
      cleanup.current = () => {
        cancelAnimationFrame(frame);
        resize.disconnect();
        mutations.disconnect();
        window.removeEventListener("resize", schedule);
        el.style.zoom = "";
      };
    },
    [enabled],
  );
}

export function PartnerGamePage({ gameId }: { gameId: PartnerGameId }) {
  const fitRef = useFitFrameHeight(!useIsDesktop());
  // Wide frames: start screens use up to 1024 px; each game's board keeps the width it was designed for.
  return (
    <div ref={fitRef} className="mx-auto flex w-full max-w-3xl flex-1 flex-col lg:max-w-5xl">
      <PartnerGameHost gameId={gameId} registry={partnerGameRegistry} />
    </div>
  );
}
