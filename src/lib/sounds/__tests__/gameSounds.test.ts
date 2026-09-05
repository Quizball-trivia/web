import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    vi.spyOn(window, 'addEventListener');
    vi.spyOn(document, 'addEventListener');
  });

  afterEach(() => {
    for (const [type, listener, options] of vi.mocked(window.addEventListener).mock.calls) {
      window.removeEventListener(type, listener, options);
    }
    for (const [type, listener, options] of vi.mocked(document.addEventListener).mock.calls) {
      document.removeEventListener(type, listener, options);
    }
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not download effects or music when the saved preference is muted', async () => {
    window.localStorage.setItem('quizball_audio_muted', 'true');
    const { preloadAll, preloadBgm, playBgm } = await import('../gameSounds');
    preloadAll();
    preloadBgm('search');
    playBgm('search');
    expect(HowlMock).not.toHaveBeenCalled();
  });

  it('loads deferred music once when the user unmutes', async () => {
    window.localStorage.setItem('quizball_audio_muted', 'true');
    const { playBgm, setMuted } = await import('../gameSounds');
    playBgm('search');
    playBgm('search');
    expect(HowlMock).not.toHaveBeenCalled();
    setMuted(false);
    expect(HowlMock).toHaveBeenCalledTimes(1);
    expect(howlInstances[0]?.config.src).toEqual(['/sounds/quizball-search.mp3']);
    expect(howlInstances[0]?.play).toHaveBeenCalledTimes(1);
  });

  it('does not load stopped deferred music after unmuting', async () => {
    window.localStorage.setItem('quizball_audio_muted', 'true');
    const { playBgm, stopBgm, setMuted } = await import('../gameSounds');
    playBgm('search');
    stopBgm();
    setMuted(false);
    expect(HowlMock).not.toHaveBeenCalled();
  });

  it('only loads the latest deferred track when unmuted', async () => {
    window.localStorage.setItem('quizball_audio_muted', 'true');
    const { playBgm, setMuted } = await import('../gameSounds');
    playBgm('search');
    playBgm('kickoff');
    setMuted(false);
    expect(HowlMock).toHaveBeenCalledTimes(1);
    expect(howlInstances[0]?.config.src).toEqual(['/sounds/gameplay_soundtrack.m4a']);
  });

  it('respects unmuting effects without resuming deferred music', async () => {
    window.localStorage.setItem('quizball_audio_muted', 'true');
    const { playBgm, playSfx, setMuted } = await import('../gameSounds');
    playBgm('search');
    setMuted(false, { resumeBgm: false });
    expect(HowlMock).not.toHaveBeenCalled();
    playSfx('kick');
    expect(howlInstances[0]?.config.src).toEqual(['/sounds/kick.mp3']);
  });

  it('allows an explicit music start after an effects-only unmute', async () => {
    window.localStorage.setItem('quizball_audio_muted', 'true');
    const { playBgm, setMuted } = await import('../gameSounds');
    playBgm('search');
    setMuted(false, { resumeBgm: false });
    playBgm('search');
    expect(HowlMock).toHaveBeenCalledTimes(1);
    expect(howlInstances[0]?.play).toHaveBeenCalledTimes(1);
  });

  it.each(['focus', 'pageshow', 'visibilitychange'])('keeps deferred music off after effects-only unmute and %s', async (eventName) => {
    window.localStorage.setItem('quizball_audio_muted', 'true');
    const { playBgm, setMuted } = await import('../gameSounds');
    playBgm('search');
    setMuted(false, { resumeBgm: false });
    const target = eventName === 'visibilitychange' ? document : window;
    target.dispatchEvent(new Event(eventName));
    expect(HowlMock).not.toHaveBeenCalled();
  });

  it('keeps loaded music paused after effects-only unmute until explicitly started', async () => {
    const { playBgm, setMuted } = await import('../gameSounds');
    playBgm('search');
    const sound = howlInstances[0]!;
    sound.playing.mockReturnValue(true);
    setMuted(true);
    setMuted(false, { resumeBgm: false });
    expect(sound.pause).toHaveBeenCalledTimes(1);
    sound.playing.mockReturnValue(false);
    window.dispatchEvent(new Event('focus'));
    expect(sound.play).toHaveBeenCalledTimes(1);
    playBgm('search');
    expect(sound.play).toHaveBeenCalledTimes(2);
  });

  it.each([false, true])('stops fallback music when switching tracks (muted: %s)', async (muted) => {
    const fallback = { play: vi.fn().mockResolvedValue(undefined), pause: vi.fn(), currentTime: 12 };
    vi.stubGlobal('Audio', vi.fn(function createAudioMock() { return fallback; }));
    HowlMock.mockImplementationOnce(function unavailableHowl() { throw new Error('Howler unavailable'); });
    const { playBgm, setMuted } = await import('../gameSounds');
    playBgm('kickoff');
    expect(fallback.play).toHaveBeenCalledTimes(1);
    if (muted) setMuted(true);
    playBgm('search');
    expect(fallback.pause).toHaveBeenCalledTimes(1);
    expect(fallback.currentTime).toBe(0);
    if (muted) setMuted(false);
    expect(fallback.play).toHaveBeenCalledTimes(1);
    expect(howlInstances[0]?.config.src).toEqual(['/sounds/quizball-search.mp3']);
    expect(howlInstances[0]?.play).toHaveBeenCalledTimes(1);
  });

  it('preserves the active fallback when the same track is requested while muted', async () => {
    const fallback = { play: vi.fn().mockResolvedValue(undefined), pause: vi.fn(), currentTime: 12 };
    vi.stubGlobal('Audio', vi.fn(function createAudioMock() { return fallback; }));
    HowlMock.mockImplementationOnce(function unavailableHowl() { throw new Error('Howler unavailable'); });
    const { playBgm, setMuted } = await import('../gameSounds');
    playBgm('kickoff');
    playBgm('kickoff');
    expect(fallback.play).toHaveBeenCalledTimes(1);
    expect(HowlMock).toHaveBeenCalledTimes(1);
    setMuted(true);
    playBgm('kickoff');
    expect(fallback.pause).not.toHaveBeenCalled();
    expect(fallback.currentTime).toBe(12);
    setMuted(false);
    expect(fallback.play).toHaveBeenCalledTimes(2);
    expect(HowlMock).toHaveBeenCalledTimes(1);
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

  it('plays Auction with the ranked stadium loop while ranked BGM stays globally disabled', async () => {
    const { GAME_SOUND_VOLUME, playBgm } = await import('../gameSounds');

    playBgm('auction');

    expect(HowlMock).toHaveBeenCalledWith(expect.objectContaining({
      loop: true,
      preload: true,
      src: ['/sounds/ranked_demo.mp3'],
      volume: GAME_SOUND_VOLUME.auctionBgm,
    }));
    expect(howlInstances[0]?.play).toHaveBeenCalledTimes(1);
  });

  it('maps Auction bids to the selected money-handling effect at a restrained volume', async () => {
    const { playSfx } = await import('../gameSounds');

    playSfx('auctionBid');

    expect(HowlMock).toHaveBeenCalledWith(expect.objectContaining({
      preload: true,
      src: ['/sounds/auction/mixkit-free/bid-coins-handling.mp3'],
      volume: 0.34,
    }));
    expect(howlInstances[0]?.play).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['auctionClue', '/sounds/auction/mixkit-free/stat-player-select.mp3', 0.3],
    ['auctionFold', '/sounds/auction/mixkit-free/fold-paper-slide.mp3', 0.32],
    ['auctionWarning', '/sounds/auction/mixkit-free/warning-racing-countdown.mp3', 0.28],
    ['auctionReveal', '/sounds/auction/mixkit-free/sold-service-bell.mp3', 0.34],
    ['auctionWon', '/sounds/auction/mixkit-free/won-casino-bling.mp3', 0.3],
    ['auctionFinished', '/sounds/auction/mixkit-free/finish-crowd-ovation.mp3', 0.22],
  ] as const)('maps %s to the approved Auction effect', async (name, src, volume) => {
    const { playSfx } = await import('../gameSounds');

    playSfx(name);

    expect(HowlMock).toHaveBeenCalledWith(expect.objectContaining({
      preload: true,
      src: [src],
      volume,
    }));
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

  it('can unmute sound effects without resuming active BGM', async () => {
    const { playBgm, setMuted } = await import('../gameSounds');

    playBgm('search');
    setMuted(true);
    setMuted(false, { resumeBgm: false });

    expect(howlerMuteMock).toHaveBeenCalledWith(false);
    expect(howlInstances[0]?.play).toHaveBeenCalledTimes(1);
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
