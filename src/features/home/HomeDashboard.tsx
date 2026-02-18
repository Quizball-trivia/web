
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PlayerStats } from '@/types/game';
import { HomePlayHero } from './components/dashboard/HomePlayHero';
import { HomeRightRail } from './components/dashboard/HomeRightRail';
import { HomeEventTeaser } from './components/dashboard/HomeEventTeaser';
import { useGameSessionStore } from '@/stores/gameSession.store';
import { QUESTION_COUNT } from '@/lib/constants/game';
import { ModeConfirmModal } from '@/features/play/components/ModeConfirmModal';
import { FriendPlayModal } from '@/features/friend/components/FriendPlayModal';
import { useMatchStatsSummary } from '@/lib/queries/stats.queries';

interface HomeDashboardProps {
  playerStats: PlayerStats;
  dailyChallengesCompleted: Map<string, number>;
}

export function HomeDashboard({
  playerStats,
  dailyChallengesCompleted,
}: HomeDashboardProps) {
  const router = useRouter();
  const startSession = useGameSessionStore((state) => state.startSession);
  const { data: matchStatsSummary = null } = useMatchStatsSummary();
  
  const [showRankedModal, setShowRankedModal] = useState(false);
  const [showFriendModal, setShowFriendModal] = useState(false);

  // handleSelectChallenge is no longer used, removing it.
  // const handleSelectChallenge = () => {
  //   router.push('/daily/challenges');
  // };

  const handleStartRanked = () => {
    startSession({
      mode: 'ranked',
      matchType: 'ranked',
      questionCount: QUESTION_COUNT,
    });
    router.push('/game');
  };

  return (
    <div className="container mx-auto max-w-7xl animate-in fade-in duration-500">
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
        {/* LEFT COLUMN: Main Content */}
        <div className="space-y-8 min-w-0">
           {/* A) HERO PLAY SECTION */}
           <section>
              <HomePlayHero 
                 playerStats={playerStats} 
                 rankedGamesPlayed={matchStatsSummary?.ranked?.gamesPlayed ?? null}
                 onStartRanked={() => setShowRankedModal(true)} 
                 onOpenFriend={() => setShowFriendModal(true)}
              />
           </section>

           {/* B) BELOW-FOLD SECONDARY CONTENT */}
           {/* The original structure had a malformed HomeFeaturedChallenge and a duplicate div.
               Assuming the intent was to have a section for other widgets or just the Event Teaser.
               Removing the malformed HomeFeaturedChallenge and the duplicate div. */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-8">
              {/* Optional: Add other widgets here if needed, or leave empty for now */}
           </div>

            {/* Event Teaser */}
            <HomeEventTeaser />
        </div>

        {/* RIGHT COLUMN: Status Rail (Desktop Only) */}
        <aside className="hidden lg:block space-y-6 pt-2">
           <HomeRightRail 
             dailyChallengesCompleted={dailyChallengesCompleted}
             onOpenFriend={() => setShowFriendModal(true)} 
           />
        </aside>
      </div>

      {/* Ranked Mode Confirmation Modal */}
      <ModeConfirmModal
        mode="ranked"
        isOpen={showRankedModal}
        onOpenChange={setShowRankedModal}
        onConfirm={() => {
          setShowRankedModal(false);
          handleStartRanked();
        }}
        ticketsRemaining={playerStats.tickets ?? 10}
      />

      {/* Friend Play Modal */}
      <FriendPlayModal
        isOpen={showFriendModal}
        onOpenChange={setShowFriendModal}
      />
    </div>
  );
}
