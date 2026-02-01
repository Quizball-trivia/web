import { useRouter } from 'next/navigation';
import type { PlayerStats } from '@/types/game';
import { HomePlayHero } from './components/dashboard/HomePlayHero';
import { HomeQuickStatsRow } from './components/dashboard/HomeQuickStatsRow';
import { HomeFeaturedChallenge } from './components/dashboard/HomeFeaturedChallenge';
import { HomeRecentMatches } from './components/dashboard/HomeRecentMatches';
import { HomeEventTeaser } from './components/dashboard/HomeEventTeaser';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HomeDashboardProps {
  playerStats: PlayerStats;
  dailyChallengesCompleted: Map<string, number>;
}

export function HomeDashboard({
  playerStats,
  dailyChallengesCompleted,
}: HomeDashboardProps) {
  const router = useRouter();

  // TODO: Move to store-based sheet in later checkpoint
  const handleSelectChallenge = () => {
    // Previously opened sheet - now just navigate
    router.push('/play');
  };


  return (
    <div className="container mx-auto max-w-6xl space-y-8 animate-in fade-in duration-500">
      
      {/* A) HERO PLAY SECTION */}
      <section>
         <HomePlayHero playerStats={playerStats} />
      </section>

      {/* B) QUICK PROGRESS STRIP */}
      <section>
         <HomeQuickStatsRow playerStats={playerStats} />
      </section>

      {/* C) BELOW-FOLD SECONDARY CONTENT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
         {/* Left Column */}
         <div className="space-y-8">
            <HomeFeaturedChallenge 
               dailyChallengesCompleted={dailyChallengesCompleted} 
               onSelectChallenge={handleSelectChallenge} 
            />
            
            {/* Daily Spin Small Link */}
            <div className="flex justify-center">
               <Button 
                 variant="ghost" 
                 size="sm" 
                 className="text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10 gap-2"
                 onClick={() => router.push('/daily/rewards')}
               >
                 <Sparkles className="size-4" />
                 Spin Daily Wheel
               </Button>
            </div>
         </div>

         {/* Right Column */}
         <div className="space-y-8">
            <HomeRecentMatches />
         </div>
      </div>

       {/* Event Teaser */}
       <HomeEventTeaser />
    </div>
  );
}
