import { beforeEach, describe, expect, it, vi } from 'vitest';

const howlerVolumeMock = vi.hoisted(() => vi.fn());
const howlerMuteMock = vi.hoisted(() => vi.fn());
const howlInstances = vi.hoisted(() => [] as Array<{
  config: Record<string, unknown>;
  fade: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  once: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
  playing: ReturnType<typeof vi.fn>;
  state: ReturnType<typeof vi.fn>;
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
    pause: vi.fn(),
    play: vi.fn(() => 1),
    playing: vi.fn(() => false),
    state: vi.fn(() => 'loaded'),
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
    window.localStorage.clear();
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

  it('uses a louder volume for ranked correct-answer sounds', async () => {
    const { playSfx } = await import('../gameSounds');

    playSfx('correctRanked');

    expect(HowlMock).toHaveBeenCalledWith(expect.objectContaining({
      preload: true,
      src: ['/sounds/correct_ranked.mp3'],
      volume: 0.45,
    }));
    expect(howlInstances[0]?.play).toHaveBeenCalledTimes(1);
  });

  it('uses lowered kickoff soundtrack volume', async () => {
    const { GAME_SOUND_VOLUME, playBgm } = await import('../gameSounds');

    expect(GAME_SOUND_VOLUME.kickoffBgm).toBe(0.01);

    playBgm('kickoff');

    expect(HowlMock).toHaveBeenCalledWith(expect.objectContaining({
      format: ['m4a'],
      loop: true,
      preload: true,
      src: ['/sounds/gameplay_soundtrack.m4a'],
      volume: 0.01,
    }));
    expect(HowlMock).toHaveBeenCalledWith(expect.not.objectContaining({
      html5: true,
    }));
    expect(howlInstances[0]?.volume).toHaveBeenCalledWith(0.01);
    expect(howlInstances[0]?.play).toHaveBeenCalledTimes(1);
  });

  it('uses minimal matchmaking search music volume', async () => {
    const { GAME_SOUND_VOLUME, playBgm } = await import('../gameSounds');

    expect(GAME_SOUND_VOLUME.searchBgm).toBe(0.025);

    playBgm('search');

    expect(HowlMock).toHaveBeenCalledWith(expect.objectContaining({
      loop: true,
      preload: true,
      src: ['/sounds/quizball-search.mp3'],
      volume: 0.025,
    }));
    expect(HowlMock).toHaveBeenCalledWith(expect.not.objectContaining({
      html5: true,
    }));
    expect(howlInstances[0]?.volume).toHaveBeenCalledWith(0.025);
    expect(howlInstances[0]?.play).toHaveBeenCalledTimes(1);
  });

  it('does not queue duplicate BGM plays for the same active track', async () => {
    const { playBgm } = await import('../gameSounds');

    playBgm('search');
    playBgm('search');

    expect(HowlMock).toHaveBeenCalledTimes(1);
    expect(howlInstances[0]?.play).toHaveBeenCalledTimes(1);
  });

  it('reasserts active BGM playback after unmuting if it is no longer playing', async () => {
    const { playBgm, setMuted } = await import('../gameSounds');

    playBgm('search');
    setMuted(true);
    setMuted(false);

    expect(howlerMuteMock).toHaveBeenCalledWith(true);
    expect(howlerMuteMock).toHaveBeenCalledWith(false);
    expect(howlInstances[0]?.play).toHaveBeenCalledTimes(2);
  });

  it('persists the global mute preference across module reloads', async () => {
    const { setMuted } = await import('../gameSounds');

    setMuted(true);
    expect(window.localStorage.getItem('quizball_audio_muted')).toBe('true');

    vi.resetModules();
    const { isMuted, playSfx } = await import('../gameSounds');

    expect(isMuted()).toBe(true);
    expect(howlerMuteMock).toHaveBeenCalledWith(true);

    playSfx('kick');

    expect(HowlMock).not.toHaveBeenCalledWith(expect.objectContaining({
      src: ['/sounds/kick.mp3'],
    }));
  });

  it('does not start one-shot effects while the tab is hidden', async () => {
    const visibilitySpy = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    const { playSfx } = await import('../gameSounds');

    try {
      playSfx('kick');
    } finally {
      visibilitySpy.mockRestore();
    }

    expect(HowlMock).not.toHaveBeenCalled();
  });
});
