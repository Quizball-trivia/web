"use client";

import { wlFramePart, wlFramePlace } from "@/lib/avatars/frames";
import { WlFrameAvatar } from "./WlFrame";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";

import { AvatarPreview } from "@/components/AvatarPreview";
import { useLocale } from "@/contexts/LocaleContext";
import { CoinIcon } from "@/features/store/components/CoinIcon";
import { getAvatarPart } from "@/lib/avatars/parts";
import { translatePartName } from "@/lib/avatars/partNames";
import { useGameSounds } from "@/lib/sounds/useGameSounds";
import type { AvatarCustomization } from "@/types/game";

import { useCountUp } from "./useCountUp";
import { WlVictoryPack } from "./WlVictoryPack";
import {
  WL_PACK_NAME_KEY, WL_PLACE_ACCENT, wlBandTitleKey, wlPackPlace,
  type WlRewardItem, type WlRewardReceipt,
} from "./wlRewards";

type Step =
  | { kind: "intro" }
  | { kind: "opening" }
  | { kind: "item"; item: WlRewardItem; index: number }
  | { kind: "coins" }
  | { kind: "summary" };

type EquipState = "idle" | "saving" | "done" | "failed";

interface WlRewardCeremonyProps {
  receipt: WlRewardReceipt;
  open: boolean;
  /** The viewer's saved avatar, so reveals show the item on their own character. */
  customization: AvatarCustomization;
  weekLabel?: string;
  /** Persists the equip through the normal owned-item profile update. */
  /** Equips every item of the pack in one profile save. */
  onEquip?: (items: WlRewardItem[]) => Promise<void>;
  onClose: () => void;
  /** Dev preview override; real use follows the OS setting. */
  forceReducedMotion?: boolean;
}

const OPENING_MS = 1150;
const CONFETTI_COLORS = ["#FFE500", "#38B60E", "#1CB0F6", "#FF6C0A", "#FFD700", "#FFFFFF"];
const PRIMARY_BUTTON =
  "h-12 min-w-[200px] rounded-[14px] bg-brand-green px-8 font-poppins text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-brand-green-deep disabled:opacity-60";
const SECONDARY_BUTTON =
  "h-12 min-w-[200px] rounded-[14px] bg-white/10 px-8 font-poppins text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-white/15";

function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function Burst({ seed, accent }: { seed: number; accent: string }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => {
        const angle = (i / 34) * Math.PI * 2 + rand(seed + i * 7) * 0.3;
        const dist = 120 + rand(seed + i * 7 + 1) * 190;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist * 0.85 + 50 + rand(seed + i * 7 + 2) * 140,
          rotate: rand(seed + i * 7 + 3) * 540 - 270,
          scale: 0.6 + rand(seed + i * 7 + 4) * 0.9,
          color: i % 3 === 0 ? accent : CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          delay: rand(seed + i * 7 + 5) * 0.2,
        };
      }),
    [seed, accent],
  );
  return (
    <>
      {pieces.map((piece, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute left-1/2 top-[38%] h-3 w-2 rounded-[2px]"
          style={{ backgroundColor: piece.color }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0, rotate: 0 }}
          animate={{ x: piece.x, y: piece.y, opacity: [0, 1, 1, 0], scale: piece.scale, rotate: piece.rotate }}
          transition={{ delay: piece.delay, duration: 1.6, ease: [0.12, 0.8, 0.35, 1] }}
        />
      ))}
    </>
  );
}

function Rays({ accent, still }: { accent: string; still: boolean }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[38%] size-[440px] -translate-x-1/2 -translate-y-1/2 opacity-50">
      <motion.div
        className="size-full"
        style={{
          background: `repeating-conic-gradient(${accent}22 0deg 9deg, transparent 9deg 24deg)`,
          maskImage: "radial-gradient(circle, black 18%, transparent 68%)",
          WebkitMaskImage: "radial-gradient(circle, black 18%, transparent 68%)",
        }}
        animate={still ? undefined : { rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function CoinCount({ coins, instant }: { coins: number; instant: boolean }) {
  const value = useCountUp(coins, { instant });
  return <span className="tabular-nums">+{value.toLocaleString()}</span>;
}

/**
 * Reveals a Weekend League reward the server has already granted: pack, then
 * each item, then coins. Skipping or closing at any point loses nothing, and
 * replaying it grants nothing.
 */
export function WlRewardCeremony({
  receipt, open, customization, weekLabel, onEquip, onClose, forceReducedMotion,
}: WlRewardCeremonyProps) {
  const { t } = useLocale();
  const { playSfx } = useGameSounds();
  const osReducedMotion = useReducedMotion();
  const reduced = forceReducedMotion ?? Boolean(osReducedMotion);

  const place = wlPackPlace(receipt);
  const accent = place ? WL_PLACE_ACCENT[place].main : "#FFD700";
  const steps = useMemo<Step[]>(() => {
    if (!place) return [{ kind: "coins" }];
    return [
      { kind: "intro" },
      { kind: "opening" },
      ...receipt.items.map((item, index): Step => ({ kind: "item", item, index })),
      ...(receipt.coins > 0 ? [{ kind: "coins" } as Step] : []),
      { kind: "summary" },
    ];
  }, [place, receipt.items, receipt.coins]);

  const [stepIndex, setStepIndex] = useState(0);
  const [equip, setEquip] = useState<EquipState>("idle");
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLast = stepIndex >= steps.length - 1;

  const advance = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [steps.length]);

  useEffect(() => {
    if (!open || step.kind !== "opening") return;
    const timer = window.setTimeout(advance, reduced ? 350 : OPENING_MS);
    return () => window.clearTimeout(timer);
  }, [open, step.kind, advance, reduced]);

  useEffect(() => {
    if (!open) return;
    if (step.kind === "opening") playSfx("auctionFold");
    if (step.kind === "item") playSfx("auctionWon");
    if (step.kind === "coins") playSfx("auctionBid");
  }, [open, step.kind, playSfx]);

  const hasItems = receipt.items.length > 0;
  const equippedCustomization = useMemo<AvatarCustomization>(
    () => receipt.items.reduce<AvatarCustomization>((c, item) => ({ ...c, [item.slot]: item.avatarPartId }), customization),
    [customization, receipt.items],
  );
  const alreadyWearing = hasItems && receipt.items.every((item) => customization[item.slot] === item.avatarPartId);
  const canEquip = hasItems && Boolean(onEquip) && equip !== "done" && !alreadyWearing;
  const packJersey = receipt.items.find((item) => item.slot === "jersey");
  const wearingPack = (c: AvatarCustomization): AvatarCustomization =>
    (packJersey ? { ...c, jersey: packJersey.avatarPartId } : c);

  const handleEquip = async () => {
    if (!hasItems || !onEquip || equip === "saving") return;
    setEquip("saving");
    try {
      await onEquip(receipt.items);
      setEquip("done");
    } catch {
      setEquip("failed");
    }
  };

  const skip = () => {
    if (!place || step.kind === "summary") onClose();
    else setStepIndex(steps.length - 1);
  };

  const itemName = (item: WlRewardItem) => {
    const frame = wlFramePart(item.avatarPartId);
    if (frame) return t(frame.nameKey);
    const part = getAvatarPart(item.avatarPartId);
    return part ? translatePartName(part.name, t) : item.slug;
  };

  const fade = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 } };

  // Modal focus: remember what had focus and give it back on close; move focus
  // to each step's main action when that step mounts; keep Tab inside.
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const doneRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    return () => {
      restoreFocusTo.current?.focus?.();
      restoreFocusTo.current = null;
    };
  }, [open]);
  // A step's primary button takes focus as it mounts. Doing it from the ref
  // (not from a transition callback) means it runs after the new step is in
  // the document, never on the outgoing one. The first time, it also notes
  // what had focus before the reveal — refs attach before effects run, so an
  // effect would only ever see the reveal's own button.
  const focusOnMount = useCallback((element: HTMLButtonElement | null) => {
    if (!element) return;
    const active = document.activeElement;
    if (restoreFocusTo.current === null && active instanceof HTMLElement
      && active !== document.body && !dialogRef.current?.contains(active)) {
      restoreFocusTo.current = active;
    }
    element.focus();
  }, []);
  // Equip replaces its own button with a label; hand focus to Done.
  useEffect(() => {
    if (equip === "done") doneRef.current?.focus();
  }, [equip]);

  // Keys are handled on the document while open, so they still work if focus
  // has somehow ended up outside the dialog.
  const skipRef = useRef(skip);
  useEffect(() => { skipRef.current = skip; });
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (event.key === "Escape") {
        event.preventDefault();
        skipRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>("button:not([disabled])")]
        .filter((el) => !el.classList.contains("invisible"));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const inside = dialog.contains(active);
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open]);

  if (typeof document === "undefined") return null;

  // Portalled to <body>: the app shell is its own stacking context, and inside
  // it the mobile bottom nav would sit on top of this overlay's buttons.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dialogRef}
          tabIndex={-1}
          className="fixed inset-0 z-[200] overflow-y-auto overflow-x-hidden bg-black/90 outline-none backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          role="dialog"
          aria-modal="true"
          aria-label={t("wlRewards.ceremonyLabel")}
        >
          <div
            className="flex min-h-full items-center justify-center"
            style={{
              paddingTop: "calc(env(safe-area-inset-top) + 64px)",
              paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)",
            }}
          >
          {!(isLast && place) && (
            <button
              type="button"
              onClick={skip}
              className="absolute right-4 z-10 rounded-full bg-white/10 px-4 py-2 font-poppins text-[11px] font-bold uppercase tracking-widest text-white/70 hover:bg-white/15"
              style={{ top: "calc(env(safe-area-inset-top) + 16px)" }}
            >
              {t("wlRewards.skip")}
            </button>
          )}

          <div className="relative flex w-full max-w-sm flex-col items-center px-6 text-center">
            {step.kind !== "intro" && step.kind !== "opening" && <Rays accent={accent} still={reduced} />}

            <AnimatePresence mode="wait">
              {(step.kind === "intro" || step.kind === "opening") && place && (
                <motion.div key="pack" className="flex flex-col items-center" {...fade} transition={{ duration: 0.3 }}>
                  <div className="font-poppins text-[11px] font-bold uppercase tracking-[0.34em] text-white/55">
                    {t("wlRewards.eyebrow")}{weekLabel ? ` · ${weekLabel}` : ""}
                  </div>
                  <h2 className="mt-2 font-poppins text-3xl font-black uppercase leading-tight" style={{ color: accent }}>
                    {t(wlBandTitleKey(receipt))}
                  </h2>
                  <button
                    type="button"
                    onClick={step.kind === "intro" ? advance : undefined}
                    disabled={step.kind !== "intro"}
                    aria-label={t("wlRewards.openPack")}
                    className="relative mt-8"
                  >
                    <WlVictoryPack
                      place={place}
                      state={step.kind === "opening" ? "opening" : "idle"}
                      reducedMotion={reduced}
                      className="w-44 drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
                    />
                    {step.kind === "opening" && !reduced && (
                      <motion.span
                        className="pointer-events-none absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
                        initial={{ scale: 0.2, opacity: 0 }}
                        animate={{ scale: [0.2, 3.2], opacity: [0, 0.85, 0] }}
                        transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
                      />
                    )}
                  </button>
                  <div className="mt-6 font-poppins text-sm font-bold uppercase tracking-wide text-white">
                    {t(WL_PACK_NAME_KEY[place])}
                  </div>
                  <p className={`mt-1 text-sm font-semibold text-white/55 ${step.kind === "opening" ? "invisible" : ""}`}>
                    {t("wlRewards.tapToOpen")}
                  </p>
                  <button
                    type="button"
                    ref={focusOnMount}
                    onClick={advance}
                    disabled={step.kind === "opening"}
                    className={`mt-6 ${PRIMARY_BUTTON} ${step.kind === "opening" ? "invisible" : ""}`}
                  >
                    {t("wlRewards.openPack")}
                  </button>
                </motion.div>
              )}

              {step.kind === "item" && (
                <motion.div key={`item-${step.index}`} className="relative flex flex-col items-center" {...fade} transition={{ duration: 0.35 }}>
                  {!reduced && <Burst seed={step.index + 1} accent={accent} />}
                  <motion.div
                    className="relative rounded-[24px] border-2 bg-store-card px-6 pb-2 pt-6"
                    style={{ borderColor: accent }}
                    initial={reduced ? false : { scale: 0.6, rotate: -6 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 240, damping: 16 }}
                  >
                    {wlFramePlace(step.item.avatarPartId) ? (
                      <div className="pb-4"><WlFrameAvatar place={wlFramePlace(step.item.avatarPartId)!} customization={wearingPack(customization)} size="lg" /></div>
                    ) : (
                      <AvatarPreview customization={{ ...customization, [step.item.slot]: step.item.avatarPartId }} width={210} />
                    )}
                  </motion.div>
                  <div className="mt-6 font-poppins text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: accent }}>
                    {t(step.item.slot === "frame" ? "wlRewards.exclusiveFrame" : "wlRewards.exclusiveJersey")}
                  </div>
                  <h3 className="mt-1 font-poppins text-2xl font-black uppercase leading-tight text-white">
                    {itemName(step.item)}
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-white/60">{t("wlRewards.addedToCollection")}</p>
                  <button type="button" ref={focusOnMount} onClick={advance} className={`mt-7 ${PRIMARY_BUTTON}`}>
                    {t("wlRewards.next")}
                  </button>
                </motion.div>
              )}

              {step.kind === "coins" && (
                <motion.div key="coins" className="relative flex flex-col items-center" {...fade} transition={{ duration: 0.35 }}>
                  {!reduced && <Burst seed={91} accent="#FFD700" />}
                  {!place && (
                    <>
                      <div className="font-poppins text-[11px] font-bold uppercase tracking-[0.34em] text-white/55">
                        {t("wlRewards.eyebrow")}{weekLabel ? ` · ${weekLabel}` : ""}
                      </div>
                      <h2 className="mt-2 font-poppins text-3xl font-black uppercase leading-tight text-brand-gold">
                        {t(wlBandTitleKey(receipt))}
                      </h2>
                      {receipt.finalRank != null && receipt.band !== "participant" && (
                        <div className="mt-1 font-poppins text-sm font-bold uppercase text-white/70">
                          {t("wlRewards.youFinished", { r: receipt.finalRank })}
                        </div>
                      )}
                    </>
                  )}
                  <motion.div
                    className={place ? "" : "mt-8"}
                    initial={reduced ? false : { scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 15 }}
                  >
                    <CoinIcon size={112} />
                  </motion.div>
                  <div className="mt-4 flex items-baseline gap-2 font-poppins text-5xl font-black text-brand-gold">
                    <CoinCount coins={receipt.coins} instant={reduced} />
                  </div>
                  <div className="mt-1 font-poppins text-sm font-bold uppercase tracking-widest text-white/70">
                    {t("wlRewards.coins")}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white/60">{t("wlRewards.addedToWallet")}</p>
                  <button type="button" ref={focusOnMount} onClick={place ? advance : onClose} className={`mt-7 ${PRIMARY_BUTTON}`}>
                    {place ? t("wlRewards.next") : t("wlRewards.collect")}
                  </button>
                </motion.div>
              )}

              {step.kind === "summary" && place && (
                <motion.div key="summary" className="relative flex w-full flex-col items-center" {...fade} transition={{ duration: 0.35 }}>
                  <h2 className="font-poppins text-2xl font-black uppercase" style={{ color: accent }}>
                    {t("wlRewards.summaryTitle")}
                  </h2>
                  <div className="mt-4">
                    {wlFramePlace(equippedCustomization.frame) && receipt.items.some((item) => item.slot === "frame") ? (
                      <WlFrameAvatar place={wlFramePlace(equippedCustomization.frame)!} customization={equippedCustomization} size="lg" />
                    ) : (
                      <AvatarPreview customization={equippedCustomization} width={170} />
                    )}
                  </div>
                  <ul className="mt-4 w-full space-y-2 text-left">
                    {receipt.items.map((item) => (
                      <li key={item.slug} className="flex items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-3">
                        <span className="flex-1 font-poppins text-sm font-bold uppercase text-white">{itemName(item)}</span>
                        <Check className="size-5 text-brand-green-light" strokeWidth={3} />
                      </li>
                    ))}
                    {receipt.coins > 0 && (
                      <li className="flex items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-3">
                        <CoinIcon size={22} />
                        <span className="flex-1 font-poppins text-sm font-bold tabular-nums text-brand-gold">
                          +{receipt.coins.toLocaleString()}
                        </span>
                        <Check className="size-5 text-brand-green-light" strokeWidth={3} />
                      </li>
                    )}
                  </ul>
                  {equip === "failed" && (
                    <p className="mt-3 text-sm font-semibold text-brand-red-light">{t("wlRewards.equipFailed")}</p>
                  )}
                  <div className="mt-6 flex w-full flex-col items-center gap-2.5">
                    {hasItems && (equip === "done" || alreadyWearing) && (
                      <div className="flex h-12 min-w-[200px] items-center justify-center gap-2 rounded-[14px] border-2 border-brand-green-light/60 px-8 font-poppins text-sm font-bold uppercase tracking-wide text-brand-green-light">
                        <Check className="size-4" strokeWidth={3} /> {t("wlRewards.equipped")}
                      </div>
                    )}
                    {canEquip && (
                      <button type="button" ref={focusOnMount} onClick={handleEquip} disabled={equip === "saving"} className={PRIMARY_BUTTON}>
                        {equip === "saving" ? t("wlRewards.equipping") : t("wlRewards.equipNow")}
                      </button>
                    )}
                    <button
                      type="button"
                      ref={(element) => {
                        doneRef.current = element;
                        // Nothing to equip (or already wearing it): Done is the main action.
                        if (element && !canEquip && document.activeElement !== element) element.focus();
                      }}
                      onClick={onClose}
                      className={SECONDARY_BUTTON}
                    >
                      {t("wlRewards.done")}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
