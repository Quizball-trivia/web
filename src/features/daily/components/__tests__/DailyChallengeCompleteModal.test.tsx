import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const copy: Record<string, string> = {
  'dailyGames.challengeComplete': 'Challenge Complete!',
  'dailyGames.correctAnswers': 'Correct Answers',
  'dailyGames.completionGreat': 'Great job — see you tomorrow!',
  'dailyGames.dayStreak': '{count}-day streak',
  'dailyGames.streakProgress': 'Seven-day streak progress',
  'dailyGames.tomorrowsStreakReward': "Tomorrow's streak reward",
  'dailyGames.tomorrowCoinReward': '+{count} coins after one more Daily Challenge',
  'dailyGames.keepStreakTomorrow': 'Come back tomorrow',
  'dailyGames.remindMeTomorrow': 'Remind me tomorrow',
  'dailyGames.reminderSetTomorrow': 'Reminder set for tomorrow',
  'dailyGames.savingReminder': 'Setting reminder...',
  'dailyGames.reminderSaveFailed': 'Reminder failed',
  'dailyGames.backToChallenges': 'Back to Challenges',
};

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const template = copy[key] ?? key;
      return template.replace(/\{(\w+)\}/g, (match, name) => String(params?.[name] ?? match));
    },
  }),
}));

import { DailyChallengeCompleteModal, DailyChallengeCompleteModalContent } from '../DailyChallengeCompleteModal';

describe('DailyChallengeCompleteModalContent comeback treatment', () => {
  it('shows real server values and schedules the reminder through its callback', async () => {
    const onReminder = vi.fn().mockResolvedValue(undefined);
    render(
      <DailyChallengeCompleteModalContent
        title="Countdown"
        correct={4}
        total={5}
        onDone={vi.fn()}
        comebackCta={{
          streakDays: 3,
          tomorrowBonusCoins: 250,
          remindersEnabled: true,
          reminderScheduled: false,
          onReminder,
        }}
      />,
    );

    expect(screen.getByText('3-day streak')).toBeInTheDocument();
    expect(screen.getByText('+250 coins after one more Daily Challenge')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /remind me tomorrow/i }));
    await waitFor(() => expect(onReminder).toHaveBeenCalledTimes(1));
  });

  it('does not offer a reminder when delivery is disabled by the backend', () => {
    render(
      <DailyChallengeCompleteModalContent
        title="Countdown"
        correct={4}
        total={5}
        onDone={vi.fn()}
        comebackCta={{
          streakDays: 1,
          tomorrowBonusCoins: 0,
          remindersEnabled: false,
          reminderScheduled: false,
          onReminder: vi.fn(),
        }}
      />,
    );

    expect(screen.queryByRole('button', { name: /remind me tomorrow/i })).not.toBeInTheDocument();
  });
});

describe('DailyChallengeCompleteModal practice rounds', () => {
  it('finishes immediately without rendering the member modal', async () => {
    const onDone = vi.fn();
    const { container, rerender } = render(
      <DailyChallengeCompleteModal open practice title="Countdown" correct={3} total={5} onDone={onDone} />,
    );
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(onDone).toHaveBeenCalledWith();
    expect(container).toBeEmptyDOMElement();
    // A re-render with the same open state does not finish twice.
    rerender(<DailyChallengeCompleteModal open practice title="Countdown" correct={3} total={5} onDone={onDone} />);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('shows a coins score instead of correct answers when the game is scored in coins', () => {
    render(
      <DailyChallengeCompleteModalContent
        title="Money Drop"
        correct={0}
        total={0}
        scoreLabel="Coins Earned"
        scoreValue="250,000 coins"
        onDone={vi.fn()}
      />,
    );
    expect(screen.getByText('Coins Earned')).toBeInTheDocument();
    expect(screen.getByText('250,000 coins')).toBeInTheDocument();
    expect(screen.queryByText('Correct Answers')).toBeNull();
  });

  it('stays closed while not open', () => {
    const onDone = vi.fn();
    render(<DailyChallengeCompleteModal open={false} practice title="Countdown" correct={3} total={5} onDone={onDone} />);
    expect(onDone).not.toHaveBeenCalled();
  });
});
