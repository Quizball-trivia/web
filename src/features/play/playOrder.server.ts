import { after } from "next/server";
import { API_BASE_URL } from "@/lib/config";
import { timeoutSignal } from "@/lib/timeoutSignal";
import { parsePlayPopularity } from "./playCatalog";
import { createPlayOrderLoader } from "./playOrderLoader";

const READ_TIMEOUT_MS = 2_500;

/**
 * The Play page's order and new marks, decided on the server so the first paint already has them (nothing moves
 * after the page loads). Any failure to read the numbers leaves the hand-made order; it never fails or holds up
 * a page.
 */
export const loadPlayOrder = createPlayOrderLoader(
  async () => {
    // Not through Next's fetch cache: it keeps only successes and drops the time limit when it refreshes.
    const response = await fetch(`${API_BASE_URL}/api/v1/guest/play-popularity`, { cache: "no-store", signal: timeoutSignal(READ_TIMEOUT_MS) });
    return response.ok ? parsePlayPopularity(await response.json()) : null;
  },
  {
    // The refresh usually finishes after the page has been sent.
    keepAlive: (work) => {
      try { after(() => work); } catch { /* not inside a request: nothing to hold open */ }
    },
  },
);
