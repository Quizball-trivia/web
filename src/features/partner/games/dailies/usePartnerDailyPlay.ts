"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { PartnerApiError } from "../../api/partnerApiClient";
import { toPartnerLocale } from "../../partnerCopy";
import type { PartnerGameApi } from "../../game-kit/types";
import type { PartnerDailyAnswerResult, PartnerDailyPlay } from "./dailyPlay.types";

/** A v4 UUID (the server requires one) also where crypto.randomUUID is missing (older Safari, plain http). */
function newStartId(): string {
  const webCrypto: Crypto = globalThis.crypto;
  if (typeof webCrypto.randomUUID === "function") return webCrypto.randomUUID();
  const bytes = webCrypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b: number) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export type DailyPlayStatus = "loading" | "intro" | "starting" | "playing" | "error";

/**
 * Drives one server-authoritative daily play: the server holds the set, the deadlines and the score; this hook only
 * mirrors the current item and runs the visible countdown from the server's `remainingMs` (so the device clock never
 * matters). Calls are serialised: a slow answer can never race the next one.
 */
export function usePartnerDailyPlay(api: PartnerGameApi) {
  const { locale } = useLocale();
  const lang = toPartnerLocale(locale);
  const [status, setStatus] = useState<DailyPlayStatus>("loading");
  const [play, setPlay] = useState<PartnerDailyPlay | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  // Bumped when a failed call made us re-read the play: boards and one-shot timers start over from the server state.
  const [epoch, setEpoch] = useState(0);
  const deadlineRef = useRef(0);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  // One id per screen visit: a retried start returns the same play instead of using another.
  const [startId] = useState(newStartId);
  const playRef = useRef<PartnerDailyPlay | null>(null);

  const accept = useCallback((next: PartnerDailyPlay) => {
    playRef.current = next;
    deadlineRef.current = performance.now() + next.remainingMs;
    setTimeLeft(Math.ceil(next.remainingMs / 1000));
    setPlay(next);
    setStatus("playing");
  }, []);

  const serial = useCallback(<T,>(run: () => Promise<T>): Promise<T> => {
    const result = queueRef.current.then(run, run);
    queueRef.current = result.catch(() => undefined);
    return result;
  }, []);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const { play: open } = await api.get<{ play: PartnerDailyPlay | null }>(`play?locale=${lang}`);
      if (open) accept(open);
      else setStatus("intro");
    } catch (error) {
      setErrorCode(error instanceof PartnerApiError ? error.code : "network");
      setStatus("error");
    }
  }, [api, accept, lang]);

  useEffect(() => {
    void load();
    // Loaded once per visit; a language switch re-renders text from the next response.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** After a failed call the server state is the truth: re-read it, or show the error screen. */
  const recover = useCallback(async (error: unknown) => {
    setEpoch((n) => n + 1);
    const current = playRef.current;
    if (current) {
      try {
        const { play: fresh } = await api.get<{ play: PartnerDailyPlay | null }>(`play?playId=${current.playId}&locale=${lang}`);
        if (fresh) {
          accept(fresh);
          return;
        }
      } catch {
        // fall through to the error screen
      }
    }
    setErrorCode(error instanceof PartnerApiError ? error.code : "network");
    setStatus("error");
  }, [api, accept, lang]);

  /** Re-reads the play. Once an item's time and the server's grace have run out, this read is what closes it. */
  const refresh = useCallback(
    () =>
      serial(async () => {
        const current = playRef.current;
        if (!current || current.state !== "playing") return;
        try {
          const { play: fresh } = await api.get<{ play: PartnerDailyPlay | null }>(`play?playId=${current.playId}&locale=${lang}`);
          if (fresh) accept(fresh);
        } catch (error) {
          await recover(error);
        }
      }),
    [api, accept, recover, serial, lang],
  );

  const start = useCallback(async () => {
    setStatus("starting");
    try {
      const { play: started } = await api.post<{ play: PartnerDailyPlay }>("start", { startId, locale: lang });
      accept(started);
    } catch (error) {
      setErrorCode(error instanceof PartnerApiError ? error.code : "network");
      setStatus("error");
    }
  }, [api, accept, lang, startId]);

  // Both calls name the item as it was when the player acted, so a queued repeat is stale on the server instead of
  // acting on the item that opened meanwhile.
  const answer = useCallback(
    <F,>(input: unknown) => {
      const target = playRef.current;
      return serial(async (): Promise<PartnerDailyAnswerResult<unknown, unknown, F> | null> => {
        const current = playRef.current;
        if (!target || !current || current.state !== "playing" || current.index !== target.index) return null;
        setBusy(true);
        try {
          const result = await api.post<PartnerDailyAnswerResult<unknown, unknown, F>>("answer", {
            playId: current.playId,
            index: target.index,
            answer: input,
            locale: lang,
          });
          accept(result.play);
          return result;
        } catch (error) {
          await recover(error);
          return null;
        } finally {
          setBusy(false);
        }
      });
    },
    [api, accept, recover, serial, lang],
  );

  const next = useCallback(() => {
    const target = playRef.current;
    return serial(async () => {
        const current = playRef.current;
        if (!target || !current || current.state !== "playing" || current.index !== target.index) return;
        setBusy(true);
        try {
          const { play: moved } = await api.post<{ play: PartnerDailyPlay }>("next", { playId: current.playId, index: target.index, locale: lang });
          accept(moved);
        } catch (error) {
          await recover(error);
        } finally {
          setBusy(false);
        }
      });
  }, [api, accept, recover, serial, lang]);

  const quit = useCallback(
    () =>
      serial(async () => {
        const current = playRef.current;
        if (!current || current.state !== "playing") return;
        try {
          const { play: ended } = await api.post<{ play: PartnerDailyPlay }>("quit", { playId: current.playId, locale: lang });
          accept(ended);
        } catch (error) {
          await recover(error);
        }
      }),
    [api, accept, recover, serial, lang],
  );

  const ticking = status === "playing" && play?.state === "playing" && !play.resolved;
  useEffect(() => {
    if (!ticking) return;
    const id = window.setInterval(() => {
      setTimeLeft(Math.max(0, Math.ceil((deadlineRef.current - performance.now()) / 1000)));
    }, 250);
    return () => window.clearInterval(id);
  }, [ticking, play?.index]);

  return { status, play, errorCode, busy, timeLeft, epoch, lang, load, start, answer, next, quit, refresh };
}

export type PartnerDailyController = ReturnType<typeof usePartnerDailyPlay>;
