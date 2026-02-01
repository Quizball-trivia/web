import { Badge } from './ui/badge';
import { Trophy, Users, User, Crown, Gamepad2 } from 'lucide-react';
import { RankedModeBottomSheet } from './RankedModeBottomSheet';
import { FriendModeBottomSheet } from './FriendModeBottomSheet';
import { useState } from 'react';
import { Button } from './ui/button';

interface ModeSelectionScreenProps {
  onSelectMode: (mode: 'ranked' | 'friendly' | 'solo') => void;
  onSelectFriendGameMode: (mode: 'multipleChoice' | 'buzzerBattle') => void;
  ticketsRemaining?: number;
}

export function ModeSelectionScreen({ onSelectMode, onSelectFriendGameMode, ticketsRemaining = 10 }: ModeSelectionScreenProps) {
  const [isRankedSheetOpen, setIsRankedSheetOpen] = useState(false);
  const [isFriendSheetOpen, setIsFriendSheetOpen] = useState(false);
  
  const handleRankedPlay = () => {
    setIsRankedSheetOpen(false);
    onSelectMode('ranked');
  };

  return (
    <div className="container mx-auto max-w-5xl py-8 animate-in fade-in duration-500">
      
      {/* Header not needed as sidebar already says "Play" and tab is active, but a subtle title helps */}
      <div className="mb-8">
         <h1 className="text-3xl font-bold flex items-center gap-3">
            <Gamepad2 className="size-8 text-primary" />
            Select Game Mode
         </h1>
      </div>

      <div className="space-y-6">
        {/* Primary: Ranked Mode */}
        <div
          onClick={() => setIsRankedSheetOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setIsRankedSheetOpen(true);
            }
          }}
          role="button"
          tabIndex={0}
          className="w-full text-left group relative overflow-hidden bg-gradient-to-br from-card to-card/50 border-2 border-border hover:border-primary/50 rounded-3xl p-8 transition-all active:scale-[0.99] shadow-xl"
        >
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative flex items-center gap-8">
            <div className="size-24 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-600/20 flex items-center justify-center shrink-0 border border-yellow-500/30">
              <Trophy className="size-12 text-yellow-500" />
            </div>
            
            <div className="flex-1">
               <div className="flex items-center gap-3 mb-2">
                 <h2 className="text-3xl font-bold">Ranked Match</h2>
                 <Badge variant="default" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20">
                    <Crown className="size-3 mr-1" />
                    Competitive
                 </Badge>
               </div>
               <p className="text-lg text-muted-foreground max-w-xl">
                 Compete for Rank Points (RP) and climb the global leaderboards. Win to promote to higher divisions.
               </p>
               
               <div className="flex gap-4 mt-6">
                  <div className="text-sm font-medium px-3 py-1 rounded-full bg-background/50 border border-border">
                     1v1 Duel
                  </div>
                  <div className="text-sm font-medium px-3 py-1 rounded-full bg-background/50 border border-border">
                     +5–15 RP / Win
                  </div>
               </div>
            </div>
            
            <div className="hidden md:block">
               <Button size="lg" className="rounded-full px-8 h-12 text-base shadow-lg shadow-primary/20">
                  Play Ranked
               </Button>
            </div>
          </div>
        </div>

        {/* Secondary Modes: Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Friendly Mode */}
          <div
            onClick={() => setIsFriendSheetOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setIsFriendSheetOpen(true);
              }
            }}
            role="button"
            tabIndex={0}
            className="text-left group relative overflow-hidden bg-card/40 border border-border/60 hover:border-blue-500/50 rounded-2xl p-6 transition-all hover:bg-blue-500/5"
          >
             <div className="flex items-start gap-4">
               <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                  <Users className="size-8" />
               </div>
               <div>
                  <h3 className="text-xl font-bold mb-1">Play vs Friend</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a private room or join a friend&apos;s game. Friendly matches do not affect RP.
                  </p>
                  <Button variant="outline" size="sm" className="group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-500 transition-colors">
                     Create / Join Room
                  </Button>
               </div>
             </div>
          </div>

          {/* Solo Mode */}
          <div
            onClick={() => onSelectMode('solo')}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectMode("solo");
              }
            }}
            role="button"
            tabIndex={0}
            className="text-left group relative overflow-hidden bg-card/40 border border-border/60 hover:border-green-500/50 rounded-2xl p-6 transition-all hover:bg-green-500/5"
          >
             <div className="flex items-start gap-4">
               <div className="p-3 rounded-xl bg-green-500/10 text-green-500 shrink-0">
                  <User className="size-8" />
               </div>
               <div>
                  <h3 className="text-xl font-bold mb-1">Solo Practice</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Relax and practice your trivia skills against the AI. Great for warming up.
                  </p>
                  <Button variant="outline" size="sm" className="group-hover:bg-green-500 group-hover:text-white group-hover:border-green-500 transition-colors">
                     Start Practice
                  </Button>
               </div>
             </div>
          </div>
        </div>
      </div>
      
      {/* Ranked Mode Bottom Sheet */}
      <RankedModeBottomSheet
        open={isRankedSheetOpen}
        onOpenChange={setIsRankedSheetOpen}
        onPlay={handleRankedPlay}
        ticketsRemaining={ticketsRemaining}
      />
      
      {/* Friend Mode Bottom Sheet */}
      <FriendModeBottomSheet
        open={isFriendSheetOpen}
        onOpenChange={setIsFriendSheetOpen}
        onSelectGameMode={onSelectFriendGameMode}
      />
    </div>
  );
}
