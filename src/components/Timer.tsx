"use client";

import { useEffect } from 'react';
import { Progress } from './ui/progress';
import { Clock } from 'lucide-react';

interface TimerProps {
  timeRemaining: number;
  maxTime: number;
  onTimeUp: () => void;
  onTick: (time: number) => void;
  isActive: boolean;
}

export function Timer({ timeRemaining, maxTime, onTimeUp, onTick, isActive }: TimerProps) {
  useEffect(() => {
    if (!isActive || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      const newTime = timeRemaining - 1;
      onTick(newTime);
      
      if (newTime <= 0) {
        onTimeUp();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, isActive, onTimeUp, onTick]);

  const percentage = (timeRemaining / maxTime) * 100;
  const isLowTime = percentage < 25;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className={`size-5 ${isLowTime ? 'text-destructive' : 'text-muted-foreground'}`} />
          <span className={`${isLowTime ? 'text-destructive' : ''}`}>
            {timeRemaining}s
          </span>
        </div>
      </div>
      <Progress 
        value={percentage} 
        className={`h-2 ${isLowTime ? '[&>div]:bg-destructive' : ''}`}
      />
    </div>
  );
}
