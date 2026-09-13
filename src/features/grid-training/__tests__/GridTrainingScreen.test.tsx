import { StrictMode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';
import { GridTrainingScreen } from '../GridTrainingScreen';
import { GRID_TRAINING_BOT_THINK_MS, GRID_TRAINING_COUNTDOWN_MS, GRID_TRAINING_FEEDBACK_MS, GRID_TRAINING_MATCHED_MS, GRID_TRAINING_SEARCH_MS } from '../data/gridTrainingScript';

const trackEvent = vi.fn();
const fetchSpy = vi.fn();
vi.mock('@/lib/posthog', () => ({ trackEvent: (...args: unknown[]) => trackEvent(...args) }));
vi.mock('@/contexts/LocaleContext', () => ({ useLocale: () => ({ locale: 'en', t: (key: string) => key }) }));
vi.mock('@/contexts/PlayerContext', () => ({ usePlayer: () => ({ player: { username: 'Taz', avatar: 'avatar-1', level: 3 } }) }));
vi.mock('@/lib/football-grid/typeahead', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/football-grid/typeahead')>();
  return { ...actual, loadGridTypeaheadRoster: () => { fetchSpy(); return Promise.resolve([]); } };
});
Element.prototype.scrollIntoView = vi.fn();
// jsdom ships no matchMedia; the shell's mobile hook needs one.
window.matchMedia = ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;

const tick = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};
const gotIt = () => act(() => { fireEvent.click(screen.getByText('training.gotIt')); });
const tooltip = (title: string) => screen.queryByText(title);

describe('GridTrainingScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    trackEvent.mockClear();
    fetchSpy.mockClear();
    useAuthStore.setState({ status: 'authenticated', user: { id: 'user-1' } } as never);
  });
  afterEach(() => vi.useRealTimers());

  it('walks search → showdown → kickoff → board → first claim with real tooltips, then Escape skips', async () => {
    const onComplete = vi.fn();
    render(<GridTrainingScreen onComplete={onComplete} />);
    expect(trackEvent).toHaveBeenCalledWith('training_started', { game: 'grid', access: 'member' });
    expect(tooltip('training.tipGridMatchmakingTitle')).toBeInTheDocument();
    await tick(GRID_TRAINING_SEARCH_MS * 3);
    expect(tooltip('training.tipGridShowdownTitle')).toBeNull(); // search held under the tooltip
    gotIt();
    await tick(GRID_TRAINING_SEARCH_MS + GRID_TRAINING_MATCHED_MS);
    expect(tooltip('training.tipGridShowdownTitle')).toBeInTheDocument();
    await tick(6_000); // showdown's own clock finishes; the countdown waits for GOT IT
    expect(screen.queryByTestId('grid-training')).toBeInTheDocument();
    gotIt();
    await tick(500);
    await tick(GRID_TRAINING_COUNTDOWN_MS);
    // Board + your turn explained in order; the guided centre cell is the only live one.
    expect(tooltip('training.tipGridBoardTitle')).toBeInTheDocument();
    gotIt();
    expect(tooltip('training.tipGridYourTurnTitle')).toBeInTheDocument();
    gotIt();
    const cells = screen.getAllByRole('button', { name: /×/ });
    expect(cells.filter((cell) => !(cell as HTMLButtonElement).disabled)).toHaveLength(1);
    act(() => { fireEvent.click(screen.getByLabelText('Manchester United × France')); });
    await tick(400); // the sheet settles before it is explained
    expect(tooltip('training.tipGridAnswerTitle')).toBeInTheDocument();
    gotIt();
    const input = screen.getByRole('combobox');
    act(() => { fireEvent.change(input, { target: { value: 'Pogba' } }); });
    expect(screen.getByRole('option', { name: /Paul Pogba/ })).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled(); // the fixture roster, never the network
    // Escape with suggestions open only closes them; a second Escape closes the sheet. Neither skips.
    act(() => { fireEvent.keyDown(input, { key: 'Escape' }); });
    expect(screen.queryByRole('option', { name: /Paul Pogba/ })).toBeNull();
    expect(onComplete).not.toHaveBeenCalled();
    act(() => { fireEvent.keyDown(input, { key: 'Escape' }); });
    expect(onComplete).not.toHaveBeenCalled();
    act(() => { fireEvent.click(screen.getByLabelText('Manchester United × France')); });
    await tick(400);
    act(() => { fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Pogba' } }); });
    act(() => { fireEvent.submit(screen.getByRole('combobox').closest('form')!); });
    expect(tooltip('training.tipGridClaimedTitle')).toBeInTheDocument();
    gotIt();
    await tick(GRID_TRAINING_FEEDBACK_MS + GRID_TRAINING_BOT_THINK_MS);
    expect(tooltip('training.tipGridOpponentTurnTitle')).toBeInTheDocument();
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('training_skipped', { game: 'grid', stage: 'turn' });
    expect(JSON.parse(localStorage.getItem('quizball_training_grid_complete') ?? 'null')).toEqual({ 'user-1': true });
  });

  it('survives StrictMode effect replay: the search still resolves after GOT IT', async () => {
    render(<StrictMode><GridTrainingScreen onComplete={vi.fn()} /></StrictMode>);
    expect(tooltip('training.tipGridMatchmakingTitle')).toBeInTheDocument();
    gotIt();
    await tick(GRID_TRAINING_SEARCH_MS + GRID_TRAINING_MATCHED_MS);
    expect(tooltip('training.tipGridShowdownTitle')).toBeInTheDocument();
  });

  it('marks the guest slot on skip', () => {
    useAuthStore.setState({ status: 'unauthenticated', user: null } as never);
    const onComplete = vi.fn();
    render(<GridTrainingScreen onComplete={onComplete} variant="guest" />);
    act(() => { fireEvent.click(screen.getByText('training.skipTraining')); });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('quizball_training_grid_complete') ?? 'null')).toEqual({ guest: true });
  });
});
