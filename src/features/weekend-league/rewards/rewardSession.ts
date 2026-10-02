"use client";

import { useSyncExternalStore } from "react";

/**
 * Presentation-only coordination for reward reveals in this browser. Nothing
 * here decides what a player owns: the server already granted the reward. It
 * only keeps one reveal on screen at a time, remembers what was closed, and
 * knows when a just-finished tournament still owes this player a receipt.
 */

const DISMISSED_KEY = "qb_wl_reward_dismissed";
const EXPECTING_KEY = "qb_wl_reward_expecting";
const EXPECT_TTL_MS = 10 * 60_000;
const CHANNEL = "qb-wl-rewards";

const inlineOwners = new Map<string, number>();
let dismissed: Set<string> | null = null;
let expecting: Map<string, number> | null = null;
/** Receipts the server has confirmed as seen during this page's life. */
const acknowledged = new Set<string>();
/** Podium badge ceremonies the player has closed on this page. */
const badgesDismissed = new Set<string>();
let activeClaim: { receiptId: string; token: string } | null = null;

const listeners = new Set<() => void>();
let version = 0;
function publish() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function readSession<T>(key: string, fallback: T): T {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeSession(key: string, value: unknown) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be blocked; the in-memory copy still covers this page.
  }
}

function dismissedSet(): Set<string> {
  if (!dismissed) dismissed = new Set(typeof window === "undefined" ? [] : readSession<string[]>(DISMISSED_KEY, []));
  return dismissed;
}
function expectingMap(): Map<string, number> {
  if (!expecting) {
    expecting = new Map(Object.entries(typeof window === "undefined" ? {} : readSession<Record<string, number>>(EXPECTING_KEY, {})));
  }
  return expecting;
}

let channel: BroadcastChannel | null | undefined;
function broadcast(): BroadcastChannel | null {
  if (channel !== undefined) return channel;
  channel = null;
  if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
    try {
      channel = new BroadcastChannel(CHANNEL);
      // A reveal closed in another tab closes here too.
      channel.onmessage = (event: MessageEvent<{ dismissed?: string }>) => {
        const id = event.data?.dismissed;
        if (typeof id === "string") rewardSession.receiveDismissal(id);
      };
    } catch {
      channel = null;
    }
  }
  return channel;
}

export const rewardSession = {
  /** The final result screen offers this tournament's reward itself. */
  ownInline(tournamentId: string): () => void {
    inlineOwners.set(tournamentId, (inlineOwners.get(tournamentId) ?? 0) + 1);
    publish();
    return () => {
      const left = (inlineOwners.get(tournamentId) ?? 1) - 1;
      if (left > 0) inlineOwners.set(tournamentId, left);
      else inlineOwners.delete(tournamentId);
      publish();
    };
  },
  isInlineOwned(tournamentId: string): boolean {
    return inlineOwners.has(tournamentId);
  },

  /** Closed by the player. Survives a failed acknowledgement and a remount. */
  dismiss(receiptId: string): void {
    if (!rewardSession.receiveDismissal(receiptId)) return;
    broadcast()?.postMessage({ dismissed: receiptId });
  },
  /** Closed in another tab: remembered here as well, so a reload of this tab
   *  cannot replay it if the acknowledgement never reached the server. */
  receiveDismissal(receiptId: string): boolean {
    if (dismissedSet().has(receiptId)) return false;
    dismissedSet().add(receiptId);
    writeSession(DISMISSED_KEY, [...dismissedSet()].slice(-50));
    publish();
    return true;
  },
  isDismissed(receiptId: string): boolean {
    return dismissedSet().has(receiptId);
  },

  /** The server accepted the acknowledgement: never send it again from here,
   *  whatever a later (possibly lagging) fetch says. */
  markAcknowledged(receiptId: string): void {
    acknowledged.add(receiptId);
  },
  isAcknowledged(receiptId: string): boolean {
    return acknowledged.has(receiptId);
  },

  /** A tournament just finished for this player; its receipt is on the way. */
  expect(tournamentId: string): void {
    if (expectingMap().has(tournamentId)) return;
    expectingMap().set(tournamentId, Date.now() + EXPECT_TTL_MS);
    writeSession(EXPECTING_KEY, Object.fromEntries(expectingMap()));
    publish();
  },
  fulfil(tournamentId: string): void {
    if (!expectingMap().delete(tournamentId)) return;
    writeSession(EXPECTING_KEY, Object.fromEntries(expectingMap()));
    publish();
  },
  /** Tournaments still owed a receipt. Pure: safe to call while rendering. */
  expected(now = Date.now()): string[] {
    return [...expectingMap()].filter(([, expiresAt]) => expiresAt > now).map(([tournamentId]) => tournamentId);
  },
  /** Drops expectations past their time and tells subscribers, so whoever is
   *  polling for them stops. Call from timers and effects, never from render. */
  pruneExpected(now = Date.now()): void {
    let changed = false;
    for (const [tournamentId, expiresAt] of [...expectingMap()]) {
      if (expiresAt <= now) {
        expectingMap().delete(tournamentId);
        changed = true;
      }
    }
    if (!changed) return;
    writeSession(EXPECTING_KEY, Object.fromEntries(expectingMap()));
    publish();
  },

  /** The player closed a podium badge ceremony; the reward reveal may follow,
   *  whether or not that badge's own acknowledgement reached the server. */
  noteBadgeDismissed(awardId: string): void {
    if (badgesDismissed.has(awardId)) return;
    badgesDismissed.add(awardId);
    publish();
  },
  isBadgeDismissed(awardId: string): boolean {
    return badgesDismissed.has(awardId);
  },

  /** Only one reveal may be on screen in this page. */
  claim(receiptId: string, token: string): boolean {
    if (activeClaim && activeClaim.token !== token) return false;
    if (!activeClaim || activeClaim.receiptId !== receiptId) {
      activeClaim = { receiptId, token };
      publish();
    }
    return true;
  },
  release(token: string): void {
    if (activeClaim?.token !== token) return;
    activeClaim = null;
    publish();
  },
  claimedBy(): string | null {
    return activeClaim?.token ?? null;
  },
  /** The receipt this token is revealing, if it holds the slot. */
  claimedReceipt(token: string): string | null {
    return activeClaim?.token === token ? activeClaim.receiptId : null;
  },

  /** Test hook: forget everything, as a fresh browser session would. */
  resetForTests(): void {
    inlineOwners.clear();
    acknowledged.clear();
    dismissed = null;
    expecting = null;
    badgesDismissed.clear();
    activeClaim = null;
    publish();
  },
};

function subscribe(listener: () => void) {
  broadcast();
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Re-renders the caller whenever the session state changes. */
export function useRewardSessionVersion(): number {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}
