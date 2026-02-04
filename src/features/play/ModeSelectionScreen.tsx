import { Badge } from '@/components/ui/badge';
import { Trophy, Users, User, Crown, Gamepad2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ModeConfirmModal } from '@/features/play/components/ModeConfirmModal';
import { FriendPlayModal } from '@/features/friend/components/FriendPlayModal';
import { HomeQuickStatsRow } from '@/features/home/components/dashboard/HomeQuickStatsRow';
import { HomeRecentMatches } from '@/features/home/components/dashboard/HomeRecentMatches';
import type { PlayerStats } from '@/types/game';

interface ModeSelectionScreenProps {
  onSelectMode: (mode: 'ranked' | 'friendly' | 'solo') => void;
  ticketsRemaining?: number;
  playerStats: PlayerStats;
}

export function ModeSelectionScreen({ onSelectMode, ticketsRemaining = 10, playerStats }: ModeSelectionScreenProps) {
  const [selectedMode, setSelectedMode] = useState<'ranked' | 'friendly' | 'solo' | null>(null);
  
  const handleConfirm = () => {
    if (!selectedMode) return;
    
    // Friend mode is handled by FriendPlayModal now, so we only handle ranked/solo here
    if (selectedMode !== 'friendly') {
       onSelectMode(selectedMode);
    }
    
    setSelectedMode(null);
  };

  return (
    <div className="container mx-auto max-w-5xl py-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="mb-8">
         <h1 className="text-3xl font-bold flex items-center gap-3">
            <Gamepad2 className="size-8 text-primary" />
            Select Game Mode
         </h1>
      </div>

      <div className="space-y-6">
        {/* Primary: Ranked Mode */}
        <div
          onClick={() => setSelectedMode('ranked')}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setSelectedMode('ranked');
            }
          }}
          role="button"
          tabIndex={0}
          className="w-full text-left group relative overflow-hidden bg-gradient-to-br from-card to-card/50 border-2 border-border hover:border-primary/50 rounded-3xl p-8 transition-all active:scale-[0.99] shadow-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
               <Button size="lg" className="rounded-full px-8 h-12 text-base shadow-lg shadow-primary/20 pointer-events-none">
                  Play Ranked
               </Button>
            </div>
          </div>
        </div>

        {/* Secondary Modes: Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Friendly Mode */}
          <div
            onClick={() => setSelectedMode('friendly')}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSelectedMode('friendly');
              }
            }}
            role="button"
            tabIndex={0}
            className="text-left group relative overflow-hidden bg-card/40 border border-border/60 hover:border-blue-500/50 rounded-2xl p-6 transition-all hover:bg-blue-500/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
             <div className="flex items-start gap-4">
               <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                  <Users className="size-8" />
               </div>
               <div>
                  <h3 className="text-xl font-bold mb-1">Friendly Match</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a private room or join a friend&apos;s game. Friendly matches do not affect RP.
                  </p>
                  <Button variant="outline" size="sm" className="group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-500 transition-colors pointer-events-none">
                     Create / Join Room
                  </Button>
               </div>
             </div>
          </div>

          {/* Solo Mode */}
          <div
            onClick={() => setSelectedMode('solo')}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSelectedMode('solo');
              }
            }}
            role="button"
            tabIndex={0}
            className="text-left group relative overflow-hidden bg-card/40 border border-border/60 hover:border-orange-500/50 rounded-2xl p-6 transition-all hover:bg-orange-500/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
             <div className="flex items-start gap-4">
               <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500 shrink-0">
                  <User className="size-8" />
               </div>
               <div>
                  <h3 className="text-xl font-bold mb-1">Solo</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start your journey from benchwarmer to legend.
                  </p>
                  <Button variant="outline" size="sm" className="group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500 transition-colors pointer-events-none">
                     Start Practice
                  </Button>
               </div>
             </div>
          </div>
        </div>
      </div>
      
      {/* Quick Stats */}
      <section className="mt-8">
        <HomeQuickStatsRow playerStats={playerStats} />
      </section>

      {/* Recent Matches */}
      <section className="mt-8">
        <HomeRecentMatches />
      </section>

      {/* Responsive Confirmation Modal (Ranked/Solo) */}
      <ModeConfirmModal
        mode={selectedMode !== 'friendly' ? selectedMode : null}
        isOpen={!!selectedMode && selectedMode !== 'friendly'}
        onOpenChange={(open) => !open && setSelectedMode(null)}
        onConfirm={handleConfirm}
        ticketsRemaining={ticketsRemaining}
      />

      {/* Friend Play Modal (Create/Join) */}
      <FriendPlayModal
        isOpen={selectedMode === 'friendly'}
        onOpenChange={(open) => !open && setSelectedMode(null)}
      />
    </div>
  );
}
