import { motion } from 'motion/react';

interface MinimalPlayerScoresProps {
  yourAvatar?: string;
  yourScore?: number;
  opponentAvatar: string;
  opponentName?: string;
  opponentScore: number;
  // Alternative prop names for QuizBall and quizball
  playerAvatar?: string;
  playerScore?: number;
  playerUsername?: string;
  opponentUsername?: string;
}

export function MinimalPlayerScores({
  yourAvatar,
  yourScore,
  opponentAvatar,
  opponentScore,
  playerAvatar,
  playerScore,
}: MinimalPlayerScoresProps) {
  // Use the alternative prop names if provided
  const finalYourAvatar = playerAvatar || yourAvatar || '⚽';
  const finalYourScore = playerScore !== undefined ? playerScore : (yourScore || 0);
  const isAhead = finalYourScore > opponentScore;
  const isTied = finalYourScore === opponentScore;

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 bg-card/80 backdrop-blur-sm border-b sticky top-0 z-20">
      {/* Your Profile */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="text-xl">{finalYourAvatar}</div>
          {isAhead && !isTied && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 bg-green-500 rounded-full size-2"
            />
          )}
        </div>
        <motion.div
          className={`font-semibold text-lg ${
            isAhead && !isTied
              ? 'text-green-600 dark:text-green-400'
              : isTied
              ? 'text-yellow-600 dark:text-yellow-400'
              : ''
          }`}
          key={finalYourScore}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500 }}
        >
          {finalYourScore}
        </motion.div>
      </div>

      {/* VS Divider */}
      <div className="text-[10px] text-muted-foreground font-semibold px-2">VS</div>

      {/* Opponent Profile */}
      <div className="flex items-center gap-2">
        <motion.div
          className={`font-semibold text-lg ${
            !isAhead && !isTied
              ? 'text-red-600 dark:text-red-400'
              : isTied
              ? 'text-yellow-600 dark:text-yellow-400'
              : ''
          }`}
          key={opponentScore}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500 }}
        >
          {opponentScore}
        </motion.div>
        <div className="relative">
          <div className="text-xl">{opponentAvatar}</div>
          {!isAhead && !isTied && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -left-0.5 bg-red-500 rounded-full size-2"
            />
          )}
        </div>
      </div>
    </div>
  );
}
