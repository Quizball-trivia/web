'use client';

/** Daily challenges reused from Quizball (demo sessions, no auth) inside
 *  the TD shell: Put in Order and Career Path mount the actual game
 *  components with our own back/complete handling; Guess the Goal mounts
 *  its self-contained mini-game. Games keep their internal look for now
 *  (full Betsson reskin is a follow-up); the shell chrome is TD. */

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { PutInOrderGame } from '@/features/daily/PutInOrderGame';
import { CareerPathGame } from '@/features/daily/CareerPathGame';
import { buildDemoDailySession } from '@/features/demos/data/demoDailySessions';
import { TD } from '../lib/copy';
import { TD_DISPLAY } from './brand';

export type TdDailyType = 'putInOrder' | 'careerPath';

export function TdDailyGame({ type, onExit }: { type: TdDailyType; onExit: () => void }) {
  const [attempt, setAttempt] = useState(0);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const session = useMemo(() => buildDemoDailySession(type, 'ka'), [type]);

  if (finalScore !== null) {
    return (
      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-6 px-6">
        <motion.div
          initial={{ scale: 0.7, rotate: -4, opacity: 0 }}
          animate={{ scale: 1, rotate: -2, opacity: 1 }}
          transition={{ type: 'spring', damping: 12 }}
          className="flex flex-col items-center gap-2 rounded-[14px] px-10 py-6"
          style={{ background: 'var(--td-orange)', boxShadow: '7px 7px 0 #000' }}
        >
          <span className="text-sm" style={{ ...TD_DISPLAY, color: 'rgba(0,0,0,0.65)' }}>
            {TD.dailyYourScore}
          </span>
          <span className="text-5xl" style={{ ...TD_DISPLAY, color: '#0d0d0d' }}>
            {finalScore}
          </span>
        </motion.div>
        <div className="flex gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setFinalScore(null);
              setAttempt((n) => n + 1);
            }}
            className="rounded-[12px] px-7 py-3.5 text-sm"
            style={{ ...TD_DISPLAY, background: 'var(--td-orange)', color: '#0d0d0d', boxShadow: '5px 5px 0 #000' }}
          >
            {TD.playAgain}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onExit}
            className="rounded-[12px] px-7 py-3.5 text-sm"
            style={{ ...TD_DISPLAY, background: 'var(--td-charcoal)', color: 'var(--td-white)', boxShadow: '5px 5px 0 #000' }}
          >
            {TD.backHome}
          </motion.button>
        </div>
      </div>
    );
  }

  const gameProps = { onBack: onExit, onComplete: (score: number) => setFinalScore(score) };
  return (
    <div className="relative z-10 min-h-dvh">
      {session.challengeType === 'putInOrder' ? (
        <PutInOrderGame key={attempt} session={session} {...gameProps} />
      ) : session.challengeType === 'careerPath' ? (
        <CareerPathGame key={attempt} session={session} {...gameProps} />
      ) : null}
    </div>
  );
}
