import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gamepad2, Trophy, Coins, Star } from "lucide-react";
import { WorldEventCard, WorldEventProps } from "./components/WorldEventCard";
import { ChallengeTierCard } from "./components/ChallengeTierCard";
import { QuestPathWidget } from "./components/QuestPathWidget";
import { logger } from "@/utils/logger";

const BOSS_EVENT_EXPIRY = new Date(Date.now() + 1000 * 60 * 60 * 48); // 48h


  export const CHALLENGES = [
    {
       id: '1', title: "Money Drop", tier: 'bronze' as const, status: 'open' as const, rewards: "100 RP + Bronze Pack"
    },
    {
       id: '2', title: "Countdown", tier: 'silver' as const, status: 'locked' as const, rewards: "250 RP + Silver Pack", requirement: "Level 10 Required"
    },
    {
       id: '3', title: "Put in Order", tier: 'gold' as const, status: 'locked' as const, rewards: "500 RP + Gold Pack", requirement: "Gold Rank Required"
    },
    {
       id: '4', title: "Clues", tier: 'platinum' as const, status: 'locked' as const, rewards: "1000 RP + Platinum Pack", requirement: "Invite Only"
    },
  ];

export function GameHubScreen() {
  
  // Mock World Event
  const BOSS_EVENT: WorldEventProps = {
    title: "The Golden Boot",
    description: "Score 50 goals across all ranked matches this weekend to unlock the exclusive 'Striker' badge and a share of the 1M RP prize pool.",
    expiryDate: BOSS_EVENT_EXPIRY,
    totalParticipants: 12450,
    maxParticipants: 20000,
    // entryRequirement: {
    //   type: 'rank',
    //   value: 'Gold III',
    //   label: 'Reach Gold III',
    //   met: false, // Locked state demo
    // },
    userProgress: { // Active state demo
       current: 32,
       total: 50,
       label: "Goals Scored"
    },
    rewards: [
       { label: "1M RP Pool", icon: <Coins className="size-5 text-yellow-500" /> },
       { label: "Striker Badge", icon: <Badge className="bg-red-500 h-5 w-5 p-0" /> },
    ]
  };

  // Mock Quests
  const QUESTS = [
    { id: '1', label: "Reach Gold II", subLabel: "Earn 150 more RP", status: 'active' as const, progress: 65 },
    { id: '2', label: "Weekend Warrior", subLabel: "Complete 5 daily challenges", status: 'locked' as const },
    { id: '3', label: "Newcomer", subLabel: "Complete tutorial", status: 'completed' as const },
  ];

  // Mock Challenges


  return (
    <div className="min-h-screen bg-background pb-20">
       
       {/* Top Navigation / Header */}
       <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="container mx-auto max-w-5xl py-4 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <Gamepad2 className="size-6 text-primary" />
                <h1 className="text-xl font-black uppercase tracking-tight">Game Hub</h1>
             </div>
             
             <div className="flex items-center gap-4 text-sm font-medium">
                <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
                   <Coins className="size-4 text-yellow-500" /> 1,250 RP
                </div>
             </div>
          </div>
          
          {/* Personal Quest Path */}
          <QuestPathWidget steps={QUESTS} />
       </div>

       <div className="container mx-auto max-w-5xl py-8 space-y-12">
          
          {/* Hero: World Event */}
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                   <Star className="size-5 text-yellow-500 fill-current" /> 
                   World Event
                </h2>
                <Button variant="link" className="text-muted-foreground">View Past Events</Button>
             </div>
             <WorldEventCard {...BOSS_EVENT} />
          </section>

          {/* Body: Challenges */}
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
             <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                   <Trophy className="size-5 text-primary" /> 
                   Weekly Challenges
                </h2>
                <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded">
                   Resets in 3d 12h
                </span>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CHALLENGES.map(challenge => (
                  <ChallengeTierCard 
                     key={challenge.id} 
                     item={challenge} 
                     onEnter={(id) => logger.info("Challenge enter", { id })} 
                  />
                ))}
             </div>
          </section>

       </div>
    </div>
  );
}
