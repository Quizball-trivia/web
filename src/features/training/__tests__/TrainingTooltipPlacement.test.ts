import { describe, expect, it } from 'vitest';
import { placeCard, staticCardTop, type TooltipBounds } from '../components/TrainingTooltip';

// 360×640 phone with a 24px status-bar inset and a 20px home-indicator inset,
// minus the 12px edge margin on each side.
const SMALL_PHONE: TooltipBounds = { vw: 360, top: 24 + 12, bottom: 640 - 20 - 12 };
const TALL_PHONE: TooltipBounds = { vw: 390, top: 47 + 12, bottom: 844 - 34 - 12 };

const bottomOf = (card: { top?: unknown }, cardH: number) => Number(card.top) + cardH;

describe('TrainingTooltip placement', () => {
  it('flips above a mid-screen target when a tall card would hang off the bottom', () => {
    // Auction turn timer: top-right of the lot card, roughly mid-screen on a small phone.
    const timer = { left: 300, top: 330, width: 44, height: 44 };
    // The old fixed 240px estimate put a card this tall below the timer, past the screen edge.
    const cardH = 260;

    const placement = placeCard(timer, SMALL_PHONE, cardH);

    expect(placement?.caretSide).toBe('bottom');
    expect(Number(placement!.card.top)).toBeGreaterThanOrEqual(SMALL_PHONE.top);
    expect(bottomOf(placement!.card, cardH)).toBeLessThanOrEqual(SMALL_PHONE.bottom);
  });

  it('keeps the card below a top target when it fits whole', () => {
    const squads = { left: 8, top: 60, width: 344, height: 120 };

    const placement = placeCard(squads, TALL_PHONE, 260);

    expect(placement?.caretSide).toBe('top');
    expect(bottomOf(placement!.card, 260)).toBeLessThanOrEqual(TALL_PHONE.bottom);
  });

  it('gives up anchoring when neither side fits, so the clamped static slot is used', () => {
    const lotCard = { left: 8, top: 200, width: 344, height: 300 };

    expect(placeCard(lotCard, SMALL_PHONE, 280)).toBeNull();
  });

  it('clamps the static slots inside the safe area', () => {
    const cardH = 420;
    for (const position of ['top', 'center', 'bottom'] as const) {
      const top = staticCardTop(position, SMALL_PHONE, cardH);
      expect(top).toBeGreaterThanOrEqual(SMALL_PHONE.top);
      expect(top + cardH).toBeLessThanOrEqual(SMALL_PHONE.bottom);
    }
  });

  it('keeps the legacy 96px offsets when the card fits', () => {
    expect(staticCardTop('top', TALL_PHONE, 240)).toBe(TALL_PHONE.top + 96);
    expect(staticCardTop('bottom', TALL_PHONE, 240)).toBe(TALL_PHONE.bottom - 96 - 240);
  });
});
