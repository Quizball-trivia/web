import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrabzonsporQuizCard } from '../TrabzonsporQuizCard';
import {
  TRABZONSPOR_CAMPAIGN_ENDS_AT,
  TRABZONSPOR_QUESTIONS,
  campaignQuizLang,
  correctMaskOf,
  resolveCampaignTrigger,
  scoreOf,
} from '../trabzonsporQuiz';

const analytics = vi.hoisted(() => ({
  view: vi.fn(),
  start: vi.fn(),
  complete: vi.fn(),
  abandon: vi.fn(),
  share: vi.fn(),
  cta: vi.fn(),
}));
const env = vi.hoisted(() => ({
  geoCountry: null as string | null,
  locale: 'en',
  search: '',
  isGuest: true,
  user: null as { country: string | null } | null,
}));
const geoChecks = vi.hoisted(() => vi.fn());

vi.mock('@/lib/analytics/campaign-quiz.analytics', () => ({
  trackCampaignQuizView: analytics.view,
  trackCampaignQuizStart: analytics.start,
  trackCampaignQuizComplete: analytics.complete,
  trackCampaignQuizAbandon: analytics.abandon,
  trackCampaignQuizShare: analytics.share,
  trackCampaignQuizCta: analytics.cta,
}));
vi.mock('@/lib/geo/useGeoEligibility', () => ({
  useGeoEligibility: (options: { enabled: boolean }) => {
    geoChecks(options);
    return { countryCode: env.geoCountry, isGeorgia: false, isGeoExperimentEnabled: false, showBetson: false, source: 'header' };
  },
}));
vi.mock('@/contexts/LocaleContext', () => ({ useLocale: () => ({ locale: env.locale, t: (k: string) => k }) }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(env.search) }));
vi.mock('@/lib/auth/useIsGuest', () => ({ useIsGuest: () => env.isGuest }));
vi.mock('@/stores/authPrompt.store', () => ({ useAuthPromptStore: (select: (s: { open: () => void }) => unknown) => select({ open: vi.fn() }) }));
vi.mock('@/stores/auth.store', () => ({ useAuthStore: (select: (s: { user: typeof env.user }) => unknown) => select({ user: env.user }) }));

const BEFORE_END = TRABZONSPOR_CAMPAIGN_ENDS_AT - 60_000;

describe('Trabzonspor quiz content', () => {
  it('has 2 easy, 4 medium and 4 hard questions in that order, each with one valid answer', () => {
    expect(TRABZONSPOR_QUESTIONS.map((q) => q.difficulty)).toEqual([
      'easy', 'easy', 'medium', 'medium', 'medium', 'medium', 'hard', 'hard', 'hard', 'hard',
    ]);
    for (const q of TRABZONSPOR_QUESTIONS) {
      expect(q.options).toHaveLength(4);
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(4);
      expect(new Set(q.options.map((o) => o.tr)).size).toBe(4);
      expect(q.prompt.tr && q.prompt.en && q.fact.tr && q.fact.en).toBeTruthy();
    }
    expect(new Set(TRABZONSPOR_QUESTIONS.map((q) => q.answerIndex)).size).toBeGreaterThan(2);
  });

  it('scores answers and builds the per-question mask', () => {
    const allRight = TRABZONSPOR_QUESTIONS.map((q) => q.answerIndex);
    expect(scoreOf(allRight)).toBe(10);
    const firstWrong = [(allRight[0]! + 1) % 4, ...allRight.slice(1)];
    expect(scoreOf(firstWrong)).toBe(9);
    expect(correctMaskOf(firstWrong.slice(0, 3))).toBe('011');
  });
});

describe('who sees the campaign', () => {
  const base = { live: true, geoCountry: null, profileCountry: null, locale: 'en', hasLink: false };

  it('shows to Turkey by IP, by profile country, on the Turkish site, or with the link', () => {
    expect(resolveCampaignTrigger({ ...base, geoCountry: 'TR' })).toBe('geo');
    expect(resolveCampaignTrigger({ ...base, profileCountry: 'TR' })).toBe('profile');
    expect(resolveCampaignTrigger({ ...base, locale: 'tr' })).toBe('locale');
    expect(resolveCampaignTrigger({ ...base, hasLink: true })).toBe('link');
    expect(resolveCampaignTrigger({ ...base, geoCountry: 'GE' })).toBeNull();
  });

  it('hides everywhere once the campaign ends', () => {
    expect(resolveCampaignTrigger({ ...base, live: false, geoCountry: 'TR' })).toBeNull();
  });

  it('speaks Turkish to Turkish visitors even on the English site', () => {
    expect(campaignQuizLang('en', 'geo')).toBe('tr');
    expect(campaignQuizLang('en', 'link')).toBe('en');
    expect(campaignQuizLang('tr', 'link')).toBe('tr');
  });
});

describe('TrabzonsporQuizCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(BEFORE_END);
    Object.assign(env, { geoCountry: null, locale: 'en', search: '', isGuest: true, user: null });
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('renders nothing once the campaign has ended', () => {
    vi.setSystemTime(TRABZONSPOR_CAMPAIGN_ENDS_AT);
    env.geoCountry = 'TR';
    const { container } = render(<TrabzonsporQuizCard />);
    expect(container).toBeEmptyDOMElement();
    expect(geoChecks).toHaveBeenLastCalledWith({ enabled: false });
  });

  it('renders nothing for a visitor outside Turkey', () => {
    env.geoCountry = 'GE';
    const { container } = render(<TrabzonsporQuizCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('plays all ten questions and reports the score once', () => {
    env.geoCountry = 'TR';
    render(<TrabzonsporQuizCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Oyna' }));
    expect(analytics.start).toHaveBeenCalledWith(expect.objectContaining({ trigger: 'geo', lang: 'tr', attempt: 1 }));

    TRABZONSPOR_QUESTIONS.forEach((q, i) => {
      const pickIndex = i === 0 ? (q.answerIndex + 1) % 4 : q.answerIndex;
      fireEvent.click(screen.getByRole('button', { name: q.options[pickIndex]!.tr }));
      fireEvent.click(screen.getByRole('button', { name: i === 9 ? 'Sonucu gör' : 'Sonraki soru' }));
    });

    expect(screen.getByText('Gerçek bordo-mavili')).toBeInTheDocument();
    expect(analytics.complete).toHaveBeenCalledTimes(1);
    expect(analytics.complete).toHaveBeenCalledWith(expect.objectContaining({ score: 9, total: 10, correctMask: '0111111111', attempt: 1 }));
    expect(JSON.parse(window.localStorage.getItem('qb_campaign_trabzonspor_2026_10')!)).toEqual({ best: 9, plays: 1, starts: 1 });
    expect((analytics.complete.mock.calls[0]![0] as { attemptId: string }).attemptId).toBe((analytics.start.mock.calls[0]![0] as { attemptId: string }).attemptId);
  });

  it('ignores a second tap on the same question', () => {
    env.geoCountry = 'TR';
    render(<TrabzonsporQuizCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Oyna' }));
    const q = TRABZONSPOR_QUESTIONS[0]!;
    fireEvent.click(screen.getByRole('button', { name: q.options[q.answerIndex]!.tr }));
    expect(screen.getByRole('button', { name: q.options[(q.answerIndex + 1) % 4]!.tr })).toBeDisabled();
  });

  it('reports an abandon when the visitor leaves mid-quiz', () => {
    env.geoCountry = 'TR';
    const { unmount } = render(<TrabzonsporQuizCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Oyna' }));
    const q = TRABZONSPOR_QUESTIONS[0]!;
    fireEvent.click(screen.getByRole('button', { name: q.options[q.answerIndex]!.tr }));
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    unmount();
    expect(analytics.abandon).toHaveBeenCalledTimes(1);
    expect(analytics.abandon).toHaveBeenCalledWith(expect.objectContaining({ answered: 1, correctMask: '1' }));
  });

  it('ends an attempt once on pagehide, resets the card, and numbers the next attempt', () => {
    env.geoCountry = 'TR';
    render(<TrabzonsporQuizCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Oyna' }));
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    expect(analytics.abandon).toHaveBeenCalledTimes(1);
    expect(analytics.abandon).toHaveBeenCalledWith(expect.objectContaining({ attempt: 1, answered: 0 }));

    fireEvent.click(screen.getByRole('button', { name: 'Oyna' }));
    expect(analytics.start).toHaveBeenLastCalledWith(expect.objectContaining({ attempt: 2 }));
    expect(analytics.complete).not.toHaveBeenCalled();
  });

  it('keeps the language and trigger an attempt started with when geo resolves mid-quiz', () => {
    env.search = 'campaign=trabzonspor';
    const { rerender } = render(<TrabzonsporQuizCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(analytics.start).toHaveBeenCalledWith(expect.objectContaining({ trigger: 'link', lang: 'en' }));
    env.geoCountry = 'TR';
    rerender(<TrabzonsporQuizCard />);
    expect(screen.getByText(TRABZONSPOR_QUESTIONS[0]!.prompt.en)).toBeInTheDocument();
  });

  it('numbers attempts from shared storage so a second tab does not reuse attempt 1, and ties events by attempt id', () => {
    env.geoCountry = 'TR';
    render(<TrabzonsporQuizCard />);
    render(<TrabzonsporQuizCard />);
    const [tabA, tabB] = screen.getAllByRole('button', { name: 'Oyna' });
    fireEvent.click(tabA!);
    fireEvent.click(tabB!);
    const [first, second] = analytics.start.mock.calls.map(([p]) => p as { attempt: number; attemptId: string });
    expect([first!.attempt, second!.attempt]).toEqual([1, 2]);
    expect(first!.attemptId).toBeTruthy();
    expect(first!.attemptId).not.toBe(second!.attemptId);
  });

  it('counts a view only once at least half of the card is on screen', () => {
    let fire: (entries: Partial<IntersectionObserverEntry>[]) => void = () => {};
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: (entries: Partial<IntersectionObserverEntry>[]) => void) { fire = cb; }
      observe() {}
      disconnect() {}
    });
    env.geoCountry = 'TR';
    render(<TrabzonsporQuizCard />);
    act(() => fire([{ isIntersecting: true, intersectionRatio: 0.01 }]));
    expect(analytics.view).not.toHaveBeenCalled();
    act(() => fire([{ isIntersecting: true, intersectionRatio: 0.6 }]));
    act(() => fire([{ isIntersecting: true, intersectionRatio: 1 }]));
    expect(analytics.view).toHaveBeenCalledTimes(1);
    expect(analytics.view).toHaveBeenCalledWith(expect.objectContaining({ trigger: 'geo', lang: 'tr' }));
    vi.unstubAllGlobals();
  });

  it('opens from the campaign link in English for a visitor abroad and keeps it for the visit', () => {
    env.search = 'campaign=trabzonspor';
    const { unmount } = render(<TrabzonsporQuizCard />);
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    unmount();
    env.search = '';
    render(<TrabzonsporQuizCard />);
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });
});
