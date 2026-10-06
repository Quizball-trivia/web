"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "@/contexts/LocaleContext";
import { defaultPartnerTransport, PartnerApiError, type PartnerApiClient, type PartnerTransport } from "./api/partnerApiClient";
import type { RedeemResponse } from "./api/partnerApi.types";
import { toPartnerLocale } from "./partnerCopy";
import { takeLaunchToken } from "./partnerLaunchToken";
import {
  postToPartnerParent,
  type PartnerLaunchFailedReason,
  type PartnerParentMessage,
  type PartnerSessionEndReason,
} from "./partnerMessages";
import { createPartnerSessionCore } from "./partnerSessionCore";

export const PARTNER_QUERY_ROOT = ["partner"] as const;

const REFRESH_LEAD_MS = 60_000;
const MIN_REFRESH_DELAY_MS = 5_000;
const REFRESH_RETRY_MS = 15_000;
export const REDEEM_ATTEMPTS = 3;
const REDEEM_BACKOFF_MS = [1_000, 3_000];
/** Signing in either succeeds within this window or ends with launch_failed/error. */
export const LAUNCH_DEADLINE_MS = 30_000;

export type PartnerSessionState =
  | { status: "redeeming" }
  | { status: "ready"; player: RedeemResponse["player"]; partner: RedeemResponse["partner"] }
  /** Session ended (or no token on load): "Open again from Freecroco". */
  | { status: "relaunch"; reason: Exclude<PartnerSessionEndReason, "blocked"> }
  /** The launch token could not be redeemed: also "Open again from Freecroco". */
  | { status: "launch_failed"; reason: Exclude<PartnerLaunchFailedReason, "player_blocked"> }
  /** Blocked at launch or mid-session: no reopen hint. */
  | { status: "blocked" };

type EndedState = Exclude<PartnerSessionState, { status: "redeeming" | "ready" }>;
type EndMessage = Extract<PartnerParentMessage, { type: "quizball:launch_failed" | "quizball:relaunch_required" }>;

interface PartnerSessionContextValue {
  state: PartnerSessionState;
  api: PartnerApiClient;
  /** Posts quizball:ready once per session, when the game list is on screen. */
  markReady: () => void;
}

const PartnerSessionContext = createContext<PartnerSessionContextValue | null>(null);

const LAUNCH_FAILURE_CODES: readonly PartnerLaunchFailedReason[] = ["token_expired", "token_used", "token_unknown", "player_blocked"];

/** Network failures, 408, 429 and 5xx: the same launch token may still redeem. */
function isTransient(error: unknown): boolean {
  if (!(error instanceof PartnerApiError)) return true;
  return error.status === 408 || error.status === 429 || error.status >= 500;
}

function launchFailureFor(error: unknown): PartnerLaunchFailedReason {
  if (error instanceof PartnerApiError) {
    const known = LAUNCH_FAILURE_CODES.find((code) => code === error.code);
    if (known) return known;
    if (error.status === 400) return "token_unknown";
  }
  return "error";
}

function sessionEndReasonFor(error: PartnerApiError): PartnerSessionEndReason {
  if (error.code === "player_blocked") return "blocked";
  if (error.reason) return error.reason;
  // Defensive only (the backend always sends a reason): "replaced" is the one reason Freecroco does not
  // auto-relaunch on, so an unexpected answer can never start two tabs replacing each other.
  return "replaced";
}

/** The server's Retry-After as sent (never shortened), else the backoff step. */
function retryDelayMs(error: unknown, attempt: number): number {
  const retryAfter = error instanceof PartnerApiError ? error.retryAfterMs : undefined;
  if (retryAfter !== undefined) return retryAfter;
  return REDEEM_BACKOFF_MS[Math.min(attempt - 1, REDEEM_BACKOFF_MS.length - 1)];
}

function endedStateFor(message: EndMessage): EndedState {
  if (message.type === "quizball:launch_failed") {
    return message.reason === "player_blocked" ? { status: "blocked" } : { status: "launch_failed", reason: message.reason };
  }
  return message.reason === "blocked" ? { status: "blocked" } : { status: "relaunch", reason: message.reason };
}

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export function PartnerSessionProvider({
  children,
  transport,
}: {
  children: React.ReactNode;
  /** Tests inject a transport; the app uses the mock or the real API from env. */
  transport?: PartnerTransport;
}) {
  const queryClient = useQueryClient();
  const { setLocale } = useLocale();
  const [state, setState] = useState<PartnerSessionState>({ status: "redeeming" });
  const [core] = useState(() => createPartnerSessionCore(transport ?? defaultPartnerTransport()));
  const { api } = core;

  const refreshTimerRef = useRef<number | null>(null);
  const expiryTimerRef = useRef<number | null>(null);
  const launchTimerRef = useRef<number | null>(null);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  /** No refresh (timer or visibility) before this time: the server's Retry-After or our own retry delay. */
  const refreshNotBeforeRef = useRef(0);
  const refreshRef = useRef<() => void>(() => {});
  const startedRef = useRef(false);
  const mountedRef = useRef(false);
  const endedRef = useRef(false);
  const readyPostedRef = useRef(false);

  // Checked after every await: a late response must not revive a session that ended or a provider that unmounted.
  const isLive = useCallback(() => mountedRef.current && !endedRef.current, []);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = null;
  }, []);

  const clearTimers = useCallback(() => {
    clearRefreshTimer();
    for (const timer of [expiryTimerRef, launchTimerRef]) {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, [clearRefreshTimer]);

  /** Terminal: drops the token and every partner query, shows the end screen, tells the parent once. */
  const endSession = useCallback(
    (message: EndMessage) => {
      if (endedRef.current || !mountedRef.current) return;
      endedRef.current = true;
      core.end();
      clearTimers();
      queryClient.removeQueries({ queryKey: PARTNER_QUERY_ROOT });
      setState(endedStateFor(message));
      postToPartnerParent(message);
    },
    [clearTimers, core, queryClient],
  );

  useEffect(() => {
    core.setSessionEndedListener((error) => endSession({ type: "quizball:relaunch_required", reason: sessionEndReasonFor(error) }));
    return () => core.setSessionEndedListener(() => {});
  }, [core, endSession]);

  const endIfExpired = useCallback(() => {
    if (isLive() && core.hasToken() && Date.now() >= core.expiresAt()) {
      endSession({ type: "quizball:relaunch_required", reason: "expired" });
    }
  }, [core, endSession, isLive]);

  const scheduleRefresh = useCallback(
    (delayMs: number) => {
      clearRefreshTimer();
      if (!isLive()) return;
      refreshTimerRef.current = window.setTimeout(() => refreshRef.current(), Math.max(MIN_REFRESH_DELAY_MS, delayMs));
    },
    [clearRefreshTimer, isLive],
  );

  /** Stores a new session unless it arrived after the end; returns whether it was accepted. */
  const acceptSession = useCallback(
    (session: RedeemResponse): boolean => {
      if (!isLive()) return false;
      const expiresAt = core.accept(session);
      if (expiresAt === null) return false;
      scheduleRefresh(expiresAt - Date.now() - REFRESH_LEAD_MS);
      // Independent of refresh: a hanging or failing refresh can never keep an expired session on screen.
      if (expiryTimerRef.current !== null) window.clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = window.setTimeout(endIfExpired, Math.max(0, expiresAt - Date.now()));
      return true;
    },
    [core, endIfExpired, isLive, scheduleRefresh],
  );

  // One refresh at a time: the timer and the visibility check share the in-flight request.
  const refresh = useCallback((): Promise<void> => {
    if (refreshInFlightRef.current) return refreshInFlightRef.current;
    if (!isLive() || !core.hasToken() || Date.now() < refreshNotBeforeRef.current) return Promise.resolve();
    const run = (async () => {
      try {
        acceptSession(await api.refresh());
      } catch (error) {
        // A refused refresh (401/403) has already ended the session through the client's listener.
        if (!isLive()) return;
        if (Date.now() >= core.expiresAt()) {
          endIfExpired();
          return;
        }
        const delay = (error instanceof PartnerApiError ? error.retryAfterMs : undefined) ?? REFRESH_RETRY_MS;
        refreshNotBeforeRef.current = Date.now() + delay;
        // If the server's wait outlasts the token, the expiry watchdog ends the session instead.
        if (refreshNotBeforeRef.current < core.expiresAt()) scheduleRefresh(delay);
        else clearRefreshTimer();
      } finally {
        refreshInFlightRef.current = null;
      }
    })();
    refreshInFlightRef.current = run;
    return run;
  }, [acceptSession, api, clearRefreshTimer, core, endIfExpired, isLive, scheduleRefresh]);

  useEffect(() => {
    refreshRef.current = () => void refresh();
  }, [refresh]);

  const redeem = useCallback(
    async (token: string) => {
      const deadline = Date.now() + LAUNCH_DEADLINE_MS;
      const failLaunch = (reason: PartnerLaunchFailedReason) => endSession({ type: "quizball:launch_failed", reason });
      // Covers a request that never settles; a late answer after this is discarded by the liveness checks.
      launchTimerRef.current = window.setTimeout(() => failLaunch("error"), LAUNCH_DEADLINE_MS);
      const settle = () => {
        if (launchTimerRef.current !== null) window.clearTimeout(launchTimerRef.current);
        launchTimerRef.current = null;
      };

      // Timers can fire late (background tabs, busy devices), so the deadline is also checked against the clock.
      const overdue = () => {
        if (Date.now() < deadline) return false;
        settle();
        failLaunch("error");
        return true;
      };

      for (let attempt = 1; ; attempt += 1) {
        if (!isLive() || overdue()) return;
        try {
          const session = await api.redeem(token);
          if (!isLive() || overdue()) return;
          if (!acceptSession(session)) return;
          settle();
          setLocale(toPartnerLocale(session.player.language));
          setState({ status: "ready", player: session.player, partner: session.partner });
          return;
        } catch (error) {
          if (!isLive() || overdue()) return;
          if (!isTransient(error)) {
            // A retry after a lost success answers token_used, which correctly asks Freecroco for a new launch.
            settle();
            failLaunch(launchFailureFor(error));
            return;
          }
          const delay = retryDelayMs(error, attempt);
          if (attempt >= REDEEM_ATTEMPTS || Date.now() + delay >= deadline) {
            // Retrying sooner than the server asked would be premature; out of time instead.
            settle();
            failLaunch("error");
            return;
          }
          await sleep(delay);
          if (!isLive()) return;
        }
      }
    },
    [acceptSession, api, endSession, isLive, setLocale],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Strict Mode replays effects synchronously; only a real unmount is still unmounted a microtask later.
      queueMicrotask(() => {
        if (mountedRef.current) return;
        clearTimers();
        core.end();
      });
    };
  }, [clearTimers, core]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const token = takeLaunchToken();
    queueMicrotask(() => {
      // No token on load means the iframe was reloaded (the token is removed right after the first load).
      if (token) void redeem(token);
      else endSession({ type: "quizball:relaunch_required", reason: "reloaded" });
    });
  }, [endSession, redeem]);

  // Background tabs throttle timers; refresh as soon as the page is visible again if expiry is close.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !core.hasToken()) return;
      if (Date.now() >= core.expiresAt()) endIfExpired();
      else if (core.expiresAt() - Date.now() <= REFRESH_LEAD_MS) refreshRef.current();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [core, endIfExpired]);

  const markReady = useCallback(() => {
    if (readyPostedRef.current || endedRef.current) return;
    readyPostedRef.current = true;
    postToPartnerParent({ type: "quizball:ready" });
  }, []);

  const value = useMemo(() => ({ state, api, markReady }), [state, api, markReady]);

  return <PartnerSessionContext.Provider value={value}>{children}</PartnerSessionContext.Provider>;
}

export function usePartnerSession(): PartnerSessionContextValue {
  const value = useContext(PartnerSessionContext);
  if (!value) throw new Error("usePartnerSession must be used inside PartnerSessionProvider");
  return value;
}
