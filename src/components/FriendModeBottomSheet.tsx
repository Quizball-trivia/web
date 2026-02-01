import { Sheet, SheetContent, SheetTitle, SheetDescription } from './ui/sheet';
import { Badge } from './ui/badge';
import { Users, Brain, Zap, Swords } from 'lucide-react';

interface FriendModeBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectGameMode: (mode: 'multipleChoice' | 'buzzerBattle') => void;
}

export function FriendModeBottomSheet({
  open,
  onOpenChange,
  onSelectGameMode
}: FriendModeBottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl px-6">
        <SheetTitle className="sr-only">Play with a Friend - Choose Game Mode</SheetTitle>
        <SheetDescription className="sr-only">
          Select how you want to challenge your friend - Multiple Choice or Buzzer Battle mode.
        </SheetDescription>
        
        <div className="pb-4">
          {/* Header */}
          <div className="flex items-center gap-4 mb-4">
            <div className="size-16 rounded-xl bg-gradient-to-br from-primary/30 to-green-600/30 flex items-center justify-center shrink-0 border border-primary/30 shadow-lg shadow-primary/20">
              <Users className="size-8 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent">
                  Play with a Friend
                </h2>
                <Badge className="bg-gradient-to-r from-primary to-green-600 text-white text-xs px-2 py-0.5 border-0">
                  <Swords className="size-3 mr-1" />
                  Casual
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Choose your game mode
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Select a game mode to challenge your friend. You&apos;ll choose a category next.
          </p>

          {/* Game Mode Options */}
          <div className="space-y-3">
            {/* Multiple Choice */}
            <button
              onClick={() => {
                onSelectGameMode('multipleChoice');
                onOpenChange(false);
              }}
              className="w-full group relative overflow-hidden bg-gradient-to-br from-primary/10 to-green-600/10 border-2 border-primary/40 rounded-xl p-4 transition-all active:scale-[0.98] hover:shadow-lg hover:shadow-primary/30 hover:border-primary text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/5 to-green-600/0 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative flex items-center gap-3">
                <div className="size-12 rounded-lg bg-gradient-to-br from-primary/20 to-green-600/20 flex items-center justify-center shrink-0 border border-primary/30">
                  <Brain className="size-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-base bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent">
                      Multiple Choice
                    </span>
                    <Badge className="bg-primary/20 text-primary text-xs px-2 py-0.5 border border-primary/30">
                      QuizBall
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Classic 1v1 quiz with 10 questions
                  </p>
                </div>
              </div>
            </button>

            {/* Buzzer Battle */}
            <button
              onClick={() => {
                onSelectGameMode('buzzerBattle');
                onOpenChange(false);
              }}
              className="w-full group relative overflow-hidden bg-gradient-to-br from-orange-500/10 to-red-600/10 border-2 border-orange-500/40 rounded-xl p-4 transition-all active:scale-[0.98] hover:shadow-lg hover:shadow-orange-500/30 hover:border-orange-500 text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/0 via-orange-500/5 to-red-600/0 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative flex items-center gap-3">
                <div className="size-12 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-600/20 flex items-center justify-center shrink-0 border border-orange-400/30">
                  <Zap className="size-6 text-orange-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-base bg-gradient-to-r from-orange-300 to-red-400 bg-clip-text text-transparent">
                      Buzzer Battle
                    </span>
                    <Badge className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 border border-orange-500/30">
                      Fast-Paced
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Race to buzz first and answer
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
