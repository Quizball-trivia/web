'use client';

/**
 * Weekend League question types inside the ორშაბათობა studio (put in order, career path, who am I): the same views
 * the Weekend League plays them with, so typing a name or sorting items works exactly as players already know.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { WlAnswerAck, WlDispatchEventPayload } from '@/lib/realtime/socket.types';
import type { Locale } from '@/lib/i18n/messages';
import { useLocale } from '@/contexts/LocaleContext';
import { QuestionCard } from '@/features/weekend-league/gauntlet/RoundChrome';
import { CareerPathCard } from '@/features/weekend-league/gauntlet/RoundViews';
import { PutInOrderBoard } from '@/features/weekend-league/gauntlet/PutInOrderBoard';
import { GraceReveal, TypedKindQuestion, WhoAmIQuestion } from '@/features/weekend-league/live/WlLiveFlow';

function pick(text: unknown, locale: Locale): string {
  if (typeof text === 'string') return text;
  if (text && typeof text === 'object') {
    const t = text as Record<string, unknown>;
    return String(t[locale] ?? t['ka'] ?? t['en'] ?? '');
  }
  return '';
}

export function WlKindQuestion({ attempt, now, canAnswer, ack, revealed, onAnswer }: {
  attempt: WlDispatchEventPayload;
  /** Server-clock now (ms). */
  now: number;
  /** Registered, not cut, and the window is open. */
  canAnswer: boolean;
  ack: WlAnswerAck | null;
  revealed: boolean;
  onAnswer: (answer: unknown) => void;
}) {
  const { t } = useLocale();
  const locale: Locale = 'ka';
  const nowRef = useRef(now);
  useEffect(() => { nowRef.current = now; }, [now]);
  const serverNow = useCallback(() => nowRef.current, []);
  const q = attempt.question;
  const ready = now >= attempt.playableAt;
  const feedback = ack ? (ack.accepted ? { accepted: true, correct: ack.correct, points: ack.points } : { accepted: false }) : null;
  const locked = !canAnswer || feedback != null || !ready || now >= attempt.deadlineAt;
  const spectator = !canAnswer && !revealed && feedback == null;

  if (attempt.kind === 'put_in_order') {
    const secondsLeft = Math.max(0, Math.ceil((attempt.deadlineAt - now) / 1000));
    return (
      <>
        <QuestionCard>{pick(q['prompt'], locale)}</QuestionCard>
        <GraceReveal ready={ready || revealed}>
          <PutInOrderBoard
            key={attempt.attempt_id}
            items={(Array.isArray(q['items']) ? (q['items'] as Array<Record<string, unknown>>) : []).map((it) => ({
              id: String(it['id'] ?? ''),
              label: pick(it['label'], locale),
              emoji: typeof it['emoji'] === 'string' ? it['emoji'] : null,
            }))}
            locked={locked}
            windowClosing={ready && !revealed && secondsLeft <= 1}
            spectator={!canAnswer}
            correctOrder={Array.isArray(attempt.evaluation?.['order']) ? (attempt.evaluation['order'] as unknown[]).map(String) : null}
            onSubmit={(order) => onAnswer(order)}
          />
        </GraceReveal>
      </>
    );
  }
  if (attempt.kind === 'career_path') {
    return (
      <TypedKindQuestion
        revealed={revealed}
        grace={!ready && !revealed}
        card={(
          <CareerPathCard
            heading={t('weekendLeague.gCareerPrompt')}
            items={(Array.isArray(q['clubs']) ? (q['clubs'] as unknown[]) : []).map((c) => ({
              label: pick(c, locale),
              matchName: pick(c, 'en' as Locale),
            }))}
          />
        )}
        locked={locked}
        spectator={spectator}
        onSubmit={(guess) => onAnswer(guess)}
        feedback={feedback}
        evaluation={attempt.evaluation ?? {}}
        locale={locale}
      />
    );
  }
  return (
    <WhoAmIQuestion
      revealed={revealed}
      grace={!ready && !revealed}
      attempt={attempt}
      locale={locale}
      serverNow={serverNow}
      locked={locked}
      spectator={spectator}
      onSubmit={(guess) => onAnswer({ guess })}
      feedback={feedback}
    />
  );
}
