"use client";

import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Split, Lightbulb, RefreshCw } from 'lucide-react';

interface HelpButtonsProps {
  fiftyFiftyUsed: boolean;
  clueUsed: boolean;
  changeQuestionUsed: boolean;
  onFiftyFifty: () => void;
  onClue: () => void;
  onChangeQuestion: () => void;
  disabled?: boolean;
  hidden?: boolean; // Hide buttons in multiplayer modes
}

export function HelpButtons({
  fiftyFiftyUsed,
  clueUsed,
  changeQuestionUsed,
  onFiftyFifty,
  onClue,
  onChangeQuestion,
  disabled = false,
  hidden = false,
}: HelpButtonsProps) {
  // Don't render anything if hidden
  if (hidden) return null;
  
  return (
    <div className="flex gap-2 justify-center flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={onFiftyFifty}
        disabled={fiftyFiftyUsed || disabled}
        className="flex-1 min-w-[90px] relative"
      >
        <Split className="size-4 mr-1.5" />
        <span>50/50</span>
        {fiftyFiftyUsed && (
          <Badge className="absolute -top-2 -right-2 h-5 px-1.5 text-xs bg-muted text-muted-foreground">
            Used
          </Badge>
        )}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onClue}
        disabled={clueUsed || disabled}
        className="flex-1 min-w-[90px] relative"
      >
        <Lightbulb className="size-4 mr-1.5" />
        <span>Clue</span>
        {clueUsed && (
          <Badge className="absolute -top-2 -right-2 h-5 px-1.5 text-xs bg-muted text-muted-foreground">
            Used
          </Badge>
        )}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onChangeQuestion}
        disabled={changeQuestionUsed || disabled}
        className="flex-1 min-w-[90px] relative"
      >
        <RefreshCw className="size-4 mr-1.5" />
        <span>Skip</span>
        {changeQuestionUsed && (
          <Badge className="absolute -top-2 -right-2 h-5 px-1.5 text-xs bg-muted text-muted-foreground">
            Used
          </Badge>
        )}
      </Button>
    </div>
  );
}
