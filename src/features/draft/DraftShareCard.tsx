"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Download, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GreenButton, QuietButton, poppins } from "@/features/wordgames/ui";
import type { DraftText } from "./draft.copy";
import { effective, type Pick, type Slot } from "./draft.rules";

const W = 1080, H = 1350;
const FONT = "Poppins, sans-serif";
const surname = (name: string) => name.split(" ").slice(1).join(" ") || name;

export interface ShareCardData {
  brand: readonly [string, string]; number: number; league: string; mode: string; record: string; finish: string; position: string; perfect: boolean;
  slots: Slot[]; picks: (Pick | null)[]; academy: string; cta: string; link: string;
}

const token = (name: string) => `hsl(${getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()})`;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fitText(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxWidth: number) {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (ctx.measureText(text).width > maxWidth && s > 16) { s -= 2; ctx.font = `${weight} ${s}px ${FONT}`; }
}

/** The picture people post: the record first, then the XI on our pitch. Without names it shows only rating dots, so a challenge is not spoiled. */
export async function drawShareCard(canvas: HTMLCanvasElement, d: ShareCardData, showNames: boolean) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  await Promise.all([document.fonts.load(`900 40px Poppins`), document.fonts.load(`700 40px Poppins`)]).catch(() => undefined);
  const turf = await loadImage("/assets/stadium-green-vertical.webp").catch(() => null);
  const page = token("surface-page"), blue = token("brand-blue"), green = token("brand-green"), lime = token("brand-green-light"), yellow = token("brand-yellow"), red = token("brand-red-soft");
  canvas.width = W; canvas.height = H;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = page;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "left";
  ctx.font = `900 40px ${FONT}`;
  ctx.fillStyle = "white";
  ctx.fillText(`${d.brand[0]} `.toUpperCase(), 60, 84);
  const left = ctx.measureText(`${d.brand[0]} `.toUpperCase()).width;
  ctx.fillStyle = lime;
  ctx.fillText(d.brand[1].toUpperCase(), 60 + left, 84);
  ctx.textAlign = "right";
  ctx.font = `700 30px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText(`#${d.number} · ${d.mode}`, W - 60, 84);

  const panel = d.perfect ? yellow : blue;
  ctx.fillStyle = panel;
  ctx.beginPath();
  ctx.roundRect(60, 120, W - 120, 290, 40);
  ctx.fill();
  const onPanel = d.perfect ? page : "white";
  ctx.textAlign = "center";
  ctx.fillStyle = onPanel;
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText(d.league.toUpperCase(), W / 2, 178);
  fitText(ctx, d.record, 900, 130, W - 200);
  ctx.fillText(d.record, W / 2, 300);
  fitText(ctx, `${d.finish} · ${d.position}`, 700, 38, W - 200);
  ctx.fillText(`${d.finish} · ${d.position}`, W / 2, 370);

  const top = 440, pitchH = 740;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(60, top, W - 120, pitchH, 32);
  ctx.clip();
  if (turf) ctx.drawImage(turf, 60, top, W - 120, pitchH);
  else { ctx.fillStyle = green; ctx.fillRect(60, top, W - 120, pitchH); }
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(60, top, W - 120, pitchH);
  ctx.restore();

  d.slots.forEach((slot, i) => {
    const p = d.picks[i];
    const x = 60 + ((W - 120) * slot.x) / 100, y = top + (pitchH * slot.y) / 100;
    const r = effective(p);
    const academy = !p || p.academy;
    ctx.beginPath();
    ctx.arc(x, y, 46, 0, Math.PI * 2);
    ctx.fillStyle = academy ? "rgba(255,255,255,0.35)" : r >= 85 ? yellow : r >= 75 ? green : blue;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "white";
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.font = `900 36px ${FONT}`;
    ctx.fillStyle = !academy && r >= 85 ? page : "white";
    ctx.fillText(String(r), x, y + 13);
    if (showNames) {
      const name = academy ? d.academy : surname(p!.player.name);
      const from = academy ? "" : `${p!.club} ${p!.season}`;
      fitText(ctx, name, 700, 26, 180);
      const nameFont = ctx.font;
      const nameW = ctx.measureText(name).width;
      fitText(ctx, from, 500, 18, 180);
      const fromFont = ctx.font;
      const w = Math.max(nameW, ctx.measureText(from).width) + 24;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y + 50, w, from ? 60 : 38, 14);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = nameFont;
      ctx.fillText(name, x, y + 78);
      if (from) { ctx.font = fromFont; ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillText(from, x, y + 102); }
    }
  });

  ctx.textAlign = "center";
  fitText(ctx, d.cta, 900, 44, W - 120);
  ctx.fillStyle = lime;
  ctx.fillText(d.cta, W / 2, 1250);
  ctx.font = `700 32px ${FONT}`;
  ctx.fillStyle = "white";
  ctx.fillText(d.link, W / 2, 1300);
  ctx.fillStyle = red;
  ctx.fillRect(0, H - 8, W / 3, 8);
  ctx.fillStyle = yellow;
  ctx.fillRect(W / 3, H - 8, W / 3, 8);
  ctx.fillStyle = green;
  ctx.fillRect((W * 2) / 3, H - 8, W / 3, 8);
}

/** Sheets close on Escape like any dialog. */
export function useEscape(onClose: () => void): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

export function ShareSheet({ c, data, text, defaultNames, onDone, onClose }: { c: DraftText; data: ShareCardData; text: string; defaultNames: boolean; onDone: (how: "share" | "save" | "copy") => void; onClose: () => void }) {
  useEscape(onClose);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [names, setNames] = useState(defaultNames);
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (canvas.current) void drawShareCard(canvas.current, data, names); }, [data, names]);

  const [failed, setFailed] = useState(false);
  const blob = () => new Promise<Blob | null>((resolve) => { if (canvas.current) canvas.current.toBlob(resolve, "image/png"); else resolve(null); });
  const save = async () => {
    try {
      const b = await blob();
      if (!b) { setFailed(true); return; }
      setFailed(false);
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url;
      a.download = "football-draft.png";
      a.click();
      URL.revokeObjectURL(url);
      onDone("save");
    } catch { setFailed(true); }
  };
  const share = async () => {
    try {
      const b = await blob();
      const file = b ? new File([b], "football-draft.png", { type: "image/png" }) : null;
      if (!file) { setFailed(true); return; }
      if (navigator.canShare?.({ files: [file] })) {
        setFailed(false);
        await navigator.share({ files: [file], text });
        onDone("share");
        return;
      }
      await save();
    } catch (e) {
      // Closing the system sheet is a choice, not a failure.
      if (!(e instanceof DOMException && e.name === "AbortError")) setFailed(true);
    }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setFailed(false); onDone("copy"); } catch { setFailed(true); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" role="dialog" aria-modal aria-label={c.shareTitle} onClick={onClose}>
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface-card p-4 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-center text-sm font-black uppercase" style={poppins}>{c.shareTitle}</h2>
        <canvas ref={canvas} width={W} height={H} role="img" aria-label={text} className="mx-auto mt-3 h-auto max-h-[52vh] w-auto max-w-full rounded-2xl" />
        <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2.5 text-sm font-semibold">
          <span className="min-w-0">{c.shareNames}<span className="block text-xs font-medium text-white/70">{names ? c.shareNamesOn : c.shareNamesOff}</span></span>
          <input id="draft-share-names" type="checkbox" checked={names} onChange={(e) => setNames(e.target.checked)} className="size-5 shrink-0 accent-brand-green" />
        </label>
        <GreenButton onClick={() => void share()} className="mt-3 flex items-center justify-center gap-2"><Share2 className="size-4" aria-hidden />{c.share}</GreenButton>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <QuietButton onClick={() => void save()} className="flex items-center justify-center gap-2"><Download className="size-4" aria-hidden />{c.shareSave}</QuietButton>
          <QuietButton onClick={() => void copy()} className={cn("flex items-center justify-center gap-2", copied && "text-brand-green-light")}><Copy className="size-4" aria-hidden />{copied ? c.shareCopied : c.shareCopy}</QuietButton>
        </div>
        {failed && <p role="alert" className="mt-2 text-center text-xs font-semibold text-brand-red-light">{c.shareFailed}</p>}
        <QuietButton onClick={onClose} className="mt-2">{c.close}</QuietButton>
      </div>
    </div>
  );
}
