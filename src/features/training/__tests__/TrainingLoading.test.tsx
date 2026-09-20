import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrainingMatchScreen } from '../TrainingMatchScreen';
import { TRAINING_QUESTIONS } from '../data/trainingQuestions';

const mocks = vi.hoisted(() => ({
  categories: vi.fn(), questions: vi.fn(), markComplete: vi.fn(), pause: vi.fn(),
  refetchCategories: vi.fn(), refetchQuestions: vi.fn(),
}));
vi.mock('@/lib/queries/categories.queries', () => ({ useCategoriesList: mocks.categories }));
vi.mock('@/lib/queries/questions.queries', () => ({ useQuestionsList: mocks.questions }));
vi.mock('@/lib/usePreloadImages', () => ({ usePreloadImages: vi.fn() }));
vi.mock('../hooks/useTrainingCompletion', () => ({ useTrainingCompletion: () => ({ markComplete: mocks.markComplete }) }));
vi.mock('../hooks/useTrainingTooltips', () => ({ useTrainingTooltips: () => ({ isPaused: false, activeTooltip: null }) }));
vi.mock('../hooks/useTrainingMatch', () => ({ useTrainingMatch: (paused: boolean) => { mocks.pause(paused); return { state: { stage: 'matchmaking' } }; } }));
vi.mock('../lib/trainingRealtimeSim', () => ({ resetTrainingMatch: vi.fn() }));
vi.mock('../components/TrainingMatchmakingStage', () => ({ TrainingMatchmakingStage: () => <div>Tutorial running</div> }));
vi.mock('../components/TrainingShowdownStage', () => ({ TrainingShowdownStage: () => null }));
vi.mock('../components/TrainingBanningStage', () => ({ TrainingBanningStage: () => null }));
vi.mock('../components/TrainingPlayingStage', () => ({ TrainingPlayingStage: () => null }));
vi.mock('../components/TrainingHalftimeStage', () => ({ TrainingHalftimeStage: () => null }));
vi.mock('../components/TrainingPenaltiesStage', () => ({ TrainingPenaltiesStage: () => null }));
vi.mock('../components/TrainingResultsStage', () => ({ TrainingResultsStage: () => null }));
vi.mock('../components/TrainingTooltip', () => ({ TrainingTooltip: () => null }));
const categories = ['premier-league', 'world-cup', 'champios-leage'].map((slug, i) => ({ id: String(i), slug, name: slug, imageUrl: '/category.png' }));
const pending = () => ({ isError: false, isFetched: false, isSuccess: false, isFetching: true, refetch: mocks.refetchQuestions });

beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  mocks.categories.mockReturnValue({ ...pending(), data: { items: categories }, isSuccess: true, isFetched: true, isFetching: false, refetch: mocks.refetchCategories });
  mocks.questions.mockReturnValue(pending());
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('tutorial loading recovery', () => {
  it('offers retry on a failed question request and resumes when real questions arrive', () => {
    mocks.questions.mockReturnValue({ ...pending(), isError: true, isFetching: false });
    const props = { onComplete: vi.fn() };
    const view = render(<TrainingMatchScreen {...props} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load');
    expect(mocks.pause).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mocks.refetchQuestions).toHaveBeenCalledTimes(2);
    expect(mocks.refetchCategories).toHaveBeenCalledTimes(1);
    mocks.questions.mockReturnValue({ ...pending(), data: { items: TRAINING_QUESTIONS }, isSuccess: true, isFetched: true, isFetching: false });
    view.rerender(<TrainingMatchScreen {...props} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Tutorial running')).toBeInTheDocument();
    expect(mocks.markComplete).not.toHaveBeenCalled();
  });
  it('bounds a hung request and exits without marking the tutorial complete', () => {
    const exit = vi.fn(); render(<TrainingMatchScreen onComplete={exit} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(30_000));
    fireEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }));
    expect(exit).toHaveBeenCalledOnce(); expect(mocks.markComplete).not.toHaveBeenCalled();
  });
  it('Escape after a load failure exits without persisting completion', () => {
    mocks.questions.mockReturnValue({ ...pending(), isError: true, isFetching: false });
    const exit = vi.fn(); render(<TrainingMatchScreen onComplete={exit} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(exit).toHaveBeenCalledOnce(); expect(mocks.markComplete).not.toHaveBeenCalled();
  });
  it('handles an empty successful question pool instead of waiting forever', () => {
    mocks.questions.mockReturnValue({ ...pending(), data: { items: [] }, isSuccess: true, isFetched: true, isFetching: false });
    render(<TrainingMatchScreen onComplete={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
  it('handles a failed category request and does not fetch questions without category IDs', () => {
    mocks.categories.mockReturnValue({ ...pending(), isError: true, isFetching: false, refetch: mocks.refetchCategories });
    render(<TrainingMatchScreen onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mocks.refetchCategories).toHaveBeenCalledOnce();
    expect(mocks.refetchQuestions).not.toHaveBeenCalled();
  });
  it('keeps explicit offline tutorial overrides playable without waiting on APIs', () => {
    mocks.questions.mockReturnValue({ ...pending(), isError: true, isFetching: false });
    render(<TrainingMatchScreen onComplete={vi.fn()} questionsOverride={TRAINING_QUESTIONS} banCategoriesOverride={categories} />);
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Tutorial running')).toBeInTheDocument();
  });
});
