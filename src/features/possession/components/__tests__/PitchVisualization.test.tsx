import { render, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// AvatarDisplay loads SVG/Image components that vitest doesn't resolve well.
// Stub it to a div so each PitchVisualization render is cheap and deterministic.
vi.mock('@/components/AvatarDisplay', () => ({
  AvatarDisplay: ({ className }: { className?: string }) => (
    <div data-testid="avatar" className={className} />
  ),
}));

// BarBattleOverlay reads from the realtime match store. We're not asserting
// anything about its internals here — just verifying PitchVisualization
// passes the `battle` prop through when it's set. Render to a marker node.
vi.mock('../BarBattleOverlay', () => ({
  BarBattleOverlay: () => <g data-testid="bar-battle" />,
}));

import { PitchVisualization } from '../PitchVisualization';
import { usePitchSceneModel } from '../pitch/usePitchSceneModel';

// ---------------------------------------------------------------------------
// Render helper — defaults are tuned to the most common production call.
// ---------------------------------------------------------------------------

type Props = Parameters<typeof PitchVisualization>[0];

function renderPitch(overrides: Partial<Props> = {}) {
  const props: Props = {
    playerPosition: 50,
    playerAvatarUrl: '',
    opponentAvatarUrl: '',
    playerName: 'P',
    opponentName: 'O',
    ...overrides,
  };
  const utils = render(<PitchVisualization {...props} />);
  return { ...utils, container: utils.container as HTMLElement };
}

function $$(container: HTMLElement, selector: string): Element[] {
  return Array.from(container.querySelectorAll(selector));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PitchVisualization — idle / open-play render', () => {
  it('renders the possession field svg with the data hook the bar-battle overlay relies on', () => {
    const { container } = renderPitch();
    const field = container.querySelector('svg[data-pitch-field="possession"]');
    expect(field).not.toBeNull();
  });

  it('renders the possession-track ball-center marker', () => {
    const { container } = renderPitch();
    expect(container.querySelector('[data-pitch-ball-center="true"]')).not.toBeNull();
  });

  it('renders both player and opponent avatar marker hooks in idle state', () => {
    const { container } = renderPitch();
    const avatars = $$(container, '[data-pitch-avatar]').map(
      (el) => el.getAttribute('data-pitch-avatar'),
    );
    expect(avatars).toContain('player');
    expect(avatars).toContain('opponent');
  });

  it('renders the unified ball when hideBall is not set', () => {
    const { container } = renderPitch();
    // Idle render uses the HTML actors path with a ball img; cover both.
    const ballImgs = container.querySelectorAll('img[alt=""]');
    expect(ballImgs.length).toBeGreaterThan(0);
  });

  it('hides the ball entirely when hideBall is true', () => {
    const { container } = renderPitch({ hideBall: true });
    const ballImgs = container.querySelectorAll('img[alt=""]');
    expect(ballImgs.length).toBe(0);
  });
});

describe('PitchVisualization — penalty branches', () => {
  const penaltyBase = {
    penaltyMode: { isPlayerShooter: true, result: null, phase: 'setup' as const },
    zoomToGoal: true,
    targetGoal: 'right' as const,
  };

  it('omits the possession track when penaltyMode is active', () => {
    const { container } = renderPitch(penaltyBase);
    // The Live Score Tracker block renders a possession bar background rect at
    // x=15 y=70 width=470 height=90. Penalty mode short-circuits before it.
    const possessionBg = container.querySelector('rect[x="15"][y="70"][width="470"][height="90"]');
    expect(possessionBg).toBeNull();
  });

  it('still renders player + opponent avatar hooks during penalty setup', () => {
    const { container } = renderPitch(penaltyBase);
    const avatars = $$(container, '[data-pitch-avatar]').map(
      (el) => el.getAttribute('data-pitch-avatar'),
    );
    expect(avatars).toContain('player');
    expect(avatars).toContain('opponent');
  });

  it('renders the penalty goal net ripple when result is goal', () => {
    const { container } = renderPitch({
      penaltyMode: { isPlayerShooter: true, result: 'goal', phase: 'result' },
      targetGoal: 'right',
    });
    // The pen-net pattern is the only one rendered in goal-result mode.
    expect(container.querySelector('pattern[id$="-penNet"]')).not.toBeNull();
  });

  it('does not throw on a saved penalty against the left goal', () => {
    expect(() =>
      renderPitch({
        penaltyMode: { isPlayerShooter: false, result: 'saved', phase: 'result' },
        targetGoal: 'left',
      }),
    ).not.toThrow();
  });
});

describe('PitchVisualization — shot branches', () => {
  it('renders the field without throwing for a pending shot', () => {
    const { container } = renderPitch({
      shotMode: { result: 'pending', ballOriginX: 250, isPlayerAttacker: true },
      targetGoal: 'right',
    });
    expect(container.querySelector('svg[data-pitch-field="possession"]')).not.toBeNull();
  });

  it('renders the shot goal net ripple', () => {
    const { container } = renderPitch({
      shotMode: { result: 'goal', ballOriginX: 250, isPlayerAttacker: true, variant: 2 },
      targetGoal: 'right',
    });
    // Same pattern key as penalty — verifies the AnimatePresence ripple branch
    // ran without throwing.
    expect(container.querySelector('pattern[id$="-penNet"]')).not.toBeNull();
  });

  it('handles a saved shot for the defending player without throwing', () => {
    expect(() =>
      renderPitch({
        shotMode: { result: 'saved', ballOriginX: 250, isPlayerAttacker: false, variant: 1 },
        targetGoal: 'left',
      }),
    ).not.toThrow();
  });

  it('handles a missed shot variant', () => {
    expect(() =>
      renderPitch({
        shotMode: { result: 'miss', ballOriginX: 250, isPlayerAttacker: true, variant: 1 },
        targetGoal: 'right',
      }),
    ).not.toThrow();
  });

  it('renders the simple-shot ball variant when simpleShotAnimation is true', () => {
    const { container } = renderPitch({
      shotMode: { result: 'goal', ballOriginX: 250, isPlayerAttacker: true, shotId: 'a' },
      targetGoal: 'right',
      simpleShotAnimation: true,
    });
    expect(container.querySelectorAll('img[alt=""]').length).toBeGreaterThan(0);
  });

  it('animates simple goal shots straight into the goal before the reset', () => {
    const { result } = renderHook(() => usePitchSceneModel({
      playerPosition: 50,
      playerAvatarUrl: '',
      opponentAvatarUrl: '',
      playerName: 'P',
      opponentName: 'O',
      shotMode: { result: 'goal', ballOriginX: 250, isPlayerAttacker: true, shotId: 'a' },
      targetGoal: 'right',
      simpleShotAnimation: true,
    }));

    const top = result.current.ballActorPosition?.top;
    expect(Array.isArray(top)).toBe(true);
    const topFrames = top as string[];
    expect(topFrames).toHaveLength(2);
    expect(Number.parseFloat(topFrames[1])).toBeLessThan(Number.parseFloat(topFrames[0]));
  });
});

describe('PitchVisualization — orientation + mirror + barBattle', () => {
  it('renders the portrait viewBox when orientation is portrait', () => {
    const { container } = renderPitch({ orientation: 'portrait' });
    const svg = container.querySelector('svg[data-pitch-field="possession"]');
    expect(svg?.getAttribute('viewBox')).toBe('-30 0 290 500');
  });

  it('renders the landscape viewBox by default', () => {
    const { container } = renderPitch();
    const svg = container.querySelector('svg[data-pitch-field="possession"]');
    expect(svg?.getAttribute('viewBox')).toBe('0 -30 500 290');
  });

  it('mounts the bar-battle slot when a battle prop is supplied', () => {
    const { container } = renderPitch({
      barBattle: {
        key: 1,
        phase: 'both-score',
        playerBars: 10,
        opponentBars: 0,
        playerPoints: 100,
        opponentPoints: 0,
        remainingDelta: 10,
        dividerX: 250,
      },
      barBattleVariant: 'friendly_possession',
    });
    expect(container.querySelector('[data-testid="bar-battle"]')).not.toBeNull();
  });

  it('does not mount the bar-battle slot when no battle prop is supplied', () => {
    const { container } = renderPitch();
    expect(container.querySelector('[data-testid="bar-battle"]')).toBeNull();
  });

  it('renders mirrored + left-goal combo without throwing', () => {
    expect(() =>
      renderPitch({
        mirrored: true,
        targetGoal: 'left',
        shotMode: { result: 'pending', ballOriginX: 250, isPlayerAttacker: true },
      }),
    ).not.toThrow();
  });

  it('uses the centered possession track bound when centerPossessionTrack is true (default)', () => {
    const { container } = renderPitch();
    // The track background rect spans x=15..485 when centered, x=15..470 when not.
    const trackBgs = $$(container, 'rect[x="15"][y="70"][height="90"]');
    expect(trackBgs.length).toBeGreaterThan(0);
    expect(trackBgs[0].getAttribute('width')).toBe('470');
  });
});

describe('PitchVisualization — scoped SVG ids', () => {
  it('uses an explicit SVG id prefix when provided', () => {
    const { container } = renderPitch({ svgIdPrefix: 'test-pitch' });

    expect(container.querySelector('#test-pitch-fieldClip')).toBeInTheDocument();
    expect(container.querySelector('image')?.getAttribute('clip-path')).toBe('url(#test-pitch-fieldClip)');
  });

  it('uses unique scoped ids per instance so multiple pitches do not clash', () => {
    const { container } = render(
      <>
        <PitchVisualization
          playerPosition={50}
          playerAvatarUrl=""
          opponentAvatarUrl=""
        />
        <PitchVisualization
          playerPosition={50}
          playerAvatarUrl=""
          opponentAvatarUrl=""
        />
      </>,
    );
    const ids = Array.from(container.querySelectorAll('filter'))
      .map((el) => el.id)
      .filter(Boolean);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
