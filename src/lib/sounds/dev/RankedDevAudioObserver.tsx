'use client';

import { useEffect, useRef } from 'react';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { useDevGameAudio } from './DevGameAudio';

/** Adds only cues that the real ranked sound conductor does not already emit. */
export function RankedDevAudioObserver() {
  const audio = useDevGameAudio();
  const question = useRealtimeMatchStore(s => s.match?.currentQuestion);
  const phase = useRealtimeMatchStore(s => s.match?.currentQuestionPhase);
  const results = useRealtimeMatchStore(s => s.match?.finalResults);
  const self = useRealtimeMatchStore(s => s.selfUserId);
  const emit = useRef(audio?.emit);
  useEffect(() => { emit.current = audio?.emit; }, [audio]);
  useEffect(() => {
    if (!question || phase !== 'playing') return;
    emit.current?.('next');
    let lastSecond = -1;
    const timer = window.setInterval(() => {
      const match = useRealtimeMatchStore.getState().match;
      if (document.hidden || match?.answerAck?.qIndex === question.qIndex || match?.lastRoundResult?.qIndex === question.qIndex) return;
      const seconds = Math.max(0, Math.ceil((Date.parse(question.deadlineAt) - Date.now()) / 1000));
      if (seconds === lastSecond) return;
      lastSecond = seconds;
      if (seconds <= 3) emit.current?.(seconds === 0 ? 'timeout' : 'tick');
    }, 200);
    return () => window.clearInterval(timer);
  }, [question, phase]);
  useEffect(() => {
    if (results) emit.current?.(!results.winnerId ? 'draw' : results.winnerId === self ? 'win' : 'lose');
  }, [results, self]);
  useEffect(() => {
    const submitted = (event: Event) => {
      const detail = (event as CustomEvent<{ event: string }>).detail;
      if (['match:answer', 'match:put_in_order_answer', 'match:countdown_guess', 'match:clues_answer'].includes(detail?.event)) emit.current?.('submit');
    };
    window.addEventListener('dev:socket-emit', submitted);
    return () => window.removeEventListener('dev:socket-emit', submitted);
  }, []);
  return null;
}
