'use client';

import { type ComponentProps } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LiveSpecialQuestionPanel } from './LiveSpecialQuestionPanel';
import { PossessionFeed } from './PossessionFeed';
import { PossessionQuestionPanel } from './PossessionQuestionPanel';
import { RoundTransitionOverlay } from './RoundTransitionOverlay';
import type { TransitionSnapshot } from '../realtimePossession.helpers';

type PossessionFeedProps = ComponentProps<typeof PossessionFeed>;
type MultipleChoiceQuestionProps = ComponentProps<typeof PossessionQuestionPanel>;
type SpecialQuestionProps = ComponentProps<typeof LiveSpecialQuestionPanel>;

export type PossessionQuestionAreaContent =
  | { kind: 'multipleChoice'; props: MultipleChoiceQuestionProps }
  | { kind: 'special'; props: SpecialQuestionProps }
  | { kind: 'empty' };

export interface PossessionQuestionAreaModel {
  feed: PossessionFeedProps;
  content: PossessionQuestionAreaContent;
  showRoundTransition: boolean;
  showPenaltyTransition: boolean;
  transitionSnapshot: TransitionSnapshot;
}

interface PossessionQuestionAreaProps {
  model: PossessionQuestionAreaModel;
}

export function PossessionQuestionArea({ model }: PossessionQuestionAreaProps) {
  const {
    feed,
    content,
    showRoundTransition,
    showPenaltyTransition,
    transitionSnapshot,
  } = model;

  const hideQuestionContent = showRoundTransition || showPenaltyTransition;

  return (
    <>
      <PossessionFeed {...feed} />

      <div className="relative min-h-[30rem] md:min-h-[34rem] lg:min-h-[38rem]">
        <motion.div
          animate={{ opacity: hideQuestionContent ? 0 : 1 }}
          transition={{ duration: hideQuestionContent ? 0 : 0.8 }}
          initial={false}
          aria-hidden={hideQuestionContent}
          className={hideQuestionContent ? 'pointer-events-none' : ''}
        >
          {content.kind === 'multipleChoice' ? (
            <PossessionQuestionPanel {...content.props} />
          ) : content.kind === 'special' ? (
            <LiveSpecialQuestionPanel {...content.props} />
          ) : null}
        </motion.div>

        <AnimatePresence>
          {(showRoundTransition || showPenaltyTransition) && (
            <RoundTransitionOverlay
              title={transitionSnapshot.title}
              categoryName={transitionSnapshot.categoryName}
              subtitle={transitionSnapshot.subtitle}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
