"use client";

import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';

interface BuzzerPlayer {
  id: string;
  username: string;
  avatar: string;
}

interface BuzzerShowdownScreenProps {
  players: BuzzerPlayer[];
  matchType: 'ranked' | 'friendly';
  currentPlayerId: string;
  onComplete: () => void;
}

export function BuzzerShowdownScreen({
  players,
  matchType,
  currentPlayerId,
  onComplete,
}: BuzzerShowdownScreenProps) {
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

        {/* Title */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-6"
        >
          <h2 className="text-xl font-semibold mb-1">4-Player Battle</h2>
          <p className="text-sm text-muted-foreground">First to buzz in wins!</p>
        </motion.div>

        {/* 4 Players Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {players.map((player, index) => {
            const isCurrentPlayer = player.id === currentPlayerId;
            const delays = [0.4, 0.5, 0.6, 0.7];
            
            return (
              <motion.div
                key={player.id}
                initial={{ 
                  scale: 0.5, 
                  opacity: 0,
                  rotate: index % 2 === 0 ? -10 : 10
                }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  rotate: 0
                }}
                transition={{ 
                  delay: delays[index],
                  type: "spring",
                  stiffness: 150
                }}
                className={`flex flex-col items-center p-4 rounded-xl border-2 ${
                  isCurrentPlayer 
                    ? 'bg-primary/10 border-primary' 
                    : 'bg-card/50 border-border'
                }`}
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.05, 1],
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse",
                    delay: index * 0.3
                  }}
                  className="text-5xl mb-2 drop-shadow-lg"
                >
                  {player.avatar}
                </motion.div>
                <div className="text-center">
                  <div className="font-medium text-sm mb-0.5 truncate max-w-[120px]">
                    {player.username}
                  </div>
                  {isCurrentPlayer && (
                    <div className="text-xs text-primary font-semibold">You</div>
                  )}
                  {!isCurrentPlayer && (
                    <div className="text-xs text-muted-foreground">
                      Player {index + 1}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Match Info */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center space-y-2"
        >
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Zap className="size-4" />
            <span className="text-sm">10 Questions</span>
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
