import { beforeEach, describe, expect, it, vi } from 'vitest';

const howlerVolumeMock = vi.hoisted(() => vi.fn());
const howlerMuteMock = vi.hoisted(() => vi.fn());
const howlInstances = vi.hoisted(() => [] as Array<{
  config: Record<string, unknown>;
  fade: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  once: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
  playing: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  unload: ReturnType<typeof vi.fn>;
  volume: ReturnType<typeof vi.fn>;
}>);
const HowlMock = vi.hoisted(() => vi.fn(function createHowlMock(config: Record<string, unknown>) {
  let currentVolume = config.volume;
  const instance = {
    config,
    fade: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    play: vi.fn(() => 1),
    playing: vi.fn(() => false),
    stop: vi.fn(),
    unload: vi.fn(),
    volume: vi.fn((nextVolume?: number) => {
      if (typeof nextVolume === 'number') {
        currentVolume = nextVolume;
        return instance;
      }
      return currentVolume;
    }),
  };
  howlInstances.push(instance);
  return instance;
}));

vi.mock('howler', () => ({
  Howl: HowlMock,
  Howler: {
    mute: howlerMuteMock,
    volume: howlerVolumeMock,
  },
}));

describe('gameSounds', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    howlInstances.length = 0;
  });

  it('uses lowered gameplay SFX volume for one-shot sounds', async () => {
    const { GAME_SOUND_VOLUME, playSfx } = await import('../gameSounds');

    expect(GAME_SOUND_VOLUME.sfx).toBe(0.3);

    playSfx('kick');

    expect(HowlMock).toHaveBeenCalledWith(expect.objectContaining({
      preload: true,
      src: ['/sounds/kick.mp3'],
      volume: 0.3,
    }));
    expect(howlInstances[0]?.play).toHaveBeenCalledTimes(1);
  });

  it('uses lowered kickoff soundtrack volume', async () => {
    const { GAME_SOUND_VOLUME, playBgm } = await import('../gameSounds');

    expect(GAME_SOUND_VOLUME.kickoffBgm).toBe(0.32);

    playBgm('kickoff');

    expect(HowlMock).toHaveBeenCalledWith(expect.objectContaining({
      format: ['m4a'],
      html5: true,
      loop: true,
      preload: true,
      src: ['/sounds/gameplay_soundtrack.m4a'],
      volume: 0.32,
    }));
    expect(howlInstances[0]?.volume).toHaveBeenCalledWith(0.32);
    expect(howlInstances[0]?.play).toHaveBeenCalledTimes(1);
  });
});
