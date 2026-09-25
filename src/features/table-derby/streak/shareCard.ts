/** Renders the streak result as a 1080×1350 PNG (4:5, fits Instagram,
 *  Facebook and stories with a crop) for REQ.1.10 sharing. Drawn on a
 *  canvas so it works offline; fonts are awaited first so Georgian text
 *  doesn't fall back mid-render. */

import { TD } from '../lib/copy';

const W = 1080;
const H = 1350;
const ORANGE = '#f15a22';
const BG = '#0d0e0f';
const DISPLAY = '"Noto Sans Georgian", "Poppins", sans-serif';

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function renderStreakCard({ score, best, isRecord }: { score: number; best: number; isRecord: boolean }): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  await Promise.all([
    document.fonts.load(`900 120px ${DISPLAY}`),
    document.fonts.load(`700 48px ${DISPLAY}`),
    document.fonts.load(`600 30px ${DISPLAY}`),
  ]).catch(() => undefined);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // ground + a diagonal orange band (show key-art nod, flat)
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, 690);
  ctx.rotate((-6 * Math.PI) / 180);
  ctx.fillStyle = ORANGE;
  ctx.fillRect(-W, -260, W * 2, 520);
  ctx.restore();

  const logo = await loadImage('/assets/table-derby/logo-paper.svg');
  if (logo) {
    const lw = 360;
    const lh = (logo.height / logo.width) * lw || 240;
    ctx.drawImage(logo, (W - lw) / 2, 70, lw, lh);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `700 46px ${DISPLAY}`;
  ctx.fillText(TD.streakTitle, W / 2, 372);

  // the number, on the band
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 300px ${DISPLAY}`;
  ctx.fillText(String(score), W / 2, 800);
  ctx.fillStyle = '#0d0d0d';
  ctx.font = `700 50px ${DISPLAY}`;
  ctx.fillText(TD.streakInARow, W / 2, 880);

  if (isRecord) {
    const label = TD.streakNewRecord;
    ctx.font = `700 40px ${DISPLAY}`;
    const tw = ctx.measureText(label).width + 64;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect((W - tw) / 2, 990, tw, 76, 38);
    ctx.fill();
    ctx.fillStyle = '#0d0d0d';
    ctx.fillText(label, W / 2, 1042);
  } else if (best > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `600 38px ${DISPLAY}`;
    ctx.fillText(`${TD.streakBest}: ${best}`, W / 2, 1042);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = `600 28px ${DISPLAY}`;
  ctx.fillText(`${TD.poweredByQuizball.toUpperCase()}  ·  BETSSON.SPORT`, W / 2, H - 80);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

/** Native share sheet with the image when the browser supports it; else a download. */
export async function shareStreakCard(blob: Blob, score: number): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], `table-derby-streak-${score}.png`, { type: 'image/png' });
  const text = TD.streakShareText(score);
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}
