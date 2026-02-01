"use client";

import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Zap, Swords } from 'lucide-react';

interface ShowdownScreenProps {
  playerUsername: string;
  playerAvatar: string;
  opponentUsername: string;
  opponentAvatar: string;
  matchType: 'ranked' | 'friendly';
  onComplete: () => void;
}

export function ShowdownScreen({
  playerUsername,
  playerAvatar,
  opponentUsername,
  opponentAvatar,
  matchType,
  onComplete,
}: ShowdownScreenProps) {
  useEffect(() => {
    // Auto-proceed after 3 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5" />
      
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Match Type Badge */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <Badge 
            variant={matchType === 'ranked' ? 'default' : 'outline'}
            className="text-sm px-4 py-1.5"
          >
            {matchType === 'ranked' ? '🏆 RANKED MATCH' : '👥 FRIENDLY MATCH'}
          </Badge>
        </motion.div>

        {/* Players Showdown */}
        <div className="flex items-center justify-between gap-4 mb-8">
          {/* Player 1 */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
            className="flex-1 flex flex-col items-center"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="text-7xl mb-3 drop-shadow-lg"
            >
              {playerAvatar}
            </motion.div>
            <div className="text-center">
              <div className="font-medium mb-1">{playerUsername}</div>
              <div className="text-xs text-muted-foreground">You</div>
            </div>
          </motion.div>

          {/* VS Symbol */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            className="flex flex-col items-center"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/50"
            >
              <Swords className="size-8 text-primary-foreground" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-xs text-muted-foreground mt-2"
            >
              VS
            </motion.div>
          </motion.div>

          {/* Player 2 (Opponent) */}
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
            className="flex-1 flex flex-col items-center"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
                delay: 0.5
              }}
              className="text-7xl mb-3 drop-shadow-lg"
            >
              {opponentAvatar}
            </motion.div>
            <div className="text-center">
              <div className="font-medium mb-1">{opponentUsername}</div>
              <div className="text-xs text-muted-foreground">Opponent</div>
            </div>
          </motion.div>
        </div>

        {/* Match Info */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center space-y-2"
        >
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Zap className="size-4" />
            <span className="text-sm">Best of 3 Rounds</span>
          </div>
          
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-sm text-primary"
          >
            Preparing match...
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Lightning effects */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
        className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/20 rounded-full blur-3xl"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
        className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-primary/20 rounded-full blur-3xl"
      />
    </div>
  );
}
