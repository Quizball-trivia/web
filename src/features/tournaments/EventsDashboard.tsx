import { EventsStatusStrip } from './components/EventsStatusStrip';
import { FeaturedEventCard } from './components/FeaturedEventCard';
import { EventListRow } from './components/EventListRow';
import type { Tournament } from './TournamentsScreen';
import { Sheet, SheetContent, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Coins, Trophy, Calendar, Zap, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface EventsDashboardProps {
  playerCoins: number;
  playerRankPoints: number;
  playerTier: string;
  tournaments: Tournament[];
  onEnterTournament: (tournament: Tournament) => void;
}

export function EventsDashboard({ 
  playerCoins, 
  playerRankPoints, 
  playerTier, 
  tournaments,
  onEnterTournament 
}: EventsDashboardProps) {
  const [selectedEvent, setSelectedEvent] = useState<Tournament | null>(null);

  // Group tournaments
  const featuredEvent = tournaments.find(t => t.type === 'seasonal') || tournaments[0];
  const weeklyEvents = tournaments.filter(t => t.type === 'weekly' && t.id !== featuredEvent.id);
  const monthlyEvents = tournaments.filter(t => t.type === 'monthly' && t.id !== featuredEvent.id);
  
  // Handlers
  const handleSelectEvent = (event: Tournament) => setSelectedEvent(event);
  const handleCloseSheet = () => setSelectedEvent(null);
  const handleEnter = (event: Tournament) => {
    onEnterTournament(event);
    handleCloseSheet();
  };

  const isEligible = (event: Tournament) => {
     return playerCoins >= event.entryCoins && playerRankPoints >= event.minRank;
  };

  return (
    <div className="container mx-auto max-w-5xl space-y-8 animate-in fade-in duration-500 py-6">
      
      {/* 1. Header & Status */}
      <div className="space-y-6">
         <div className="flex items-center gap-3">
             <Trophy className="size-8 text-primary" />
             <h1 className="text-3xl font-bold">Events & Tournaments</h1>
         </div>
         <EventsStatusStrip 
            playerCoins={playerCoins} 
            playerRankPoints={playerRankPoints} 
            playerTier={playerTier} 
         />
      </div>

      {/* 2. Featured Event */}
      <section>
         <div className="flex items-center gap-2 mb-4 px-1">
            <Zap className="size-5 text-yellow-500" />
            <h3 className="font-bold text-lg uppercase tracking-wide text-muted-foreground">Featured Event</h3>
         </div>
         {featuredEvent && (
            <FeaturedEventCard 
               event={featuredEvent} 
               playerRankPoints={playerRankPoints}
               playerCoins={playerCoins}
               onEnter={handleEnter}
            />
         )}
      </section>

      {/* 3. Event Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
         {/* Weekly */}
         <section className="space-y-4">
             <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h3 className="font-bold text-lg flex items-center gap-2">
                   <Calendar className="size-5 text-blue-500" />
                   Weekly Schedule
                </h3>
             </div>
             <div className="space-y-2">
                {weeklyEvents.map(event => (
                   <EventListRow 
                      key={event.id} 
                      event={event} 
                      playerRankPoints={playerRankPoints}
                      onSelect={handleSelectEvent}
                   />
                ))}
             </div>
         </section>

         {/* Monthly */}
         <section className="space-y-4">
             <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h3 className="font-bold text-lg flex items-center gap-2">
                   <Trophy className="size-5 text-purple-500" />
                   Monthly Majors
                </h3>
             </div>
             <div className="space-y-2">
                {monthlyEvents.map(event => (
                   <EventListRow 
                      key={event.id} 
                      event={event} 
                      playerRankPoints={playerRankPoints}
                      onSelect={handleSelectEvent}
                   />
                ))}
             </div>
         </section>
      </div>

      {/* 4. Details Sheet */}
      <Sheet open={!!selectedEvent} onOpenChange={(open) => !open && handleCloseSheet()}>
         <SheetContent className="w-full sm:max-w-md border-l border-border bg-card p-0 flex flex-col h-full">
            {selectedEvent && (
               <>
                  <div className={`h-32 w-full bg-gradient-to-br ${
                     selectedEvent.type === 'weekly' ? 'from-blue-600 to-cyan-600' :
                     selectedEvent.type === 'monthly' ? 'from-purple-600 to-pink-600' :
                     'from-yellow-500 to-orange-600'
                  } relative flex items-end p-6`}>
                     <div className="absolute inset-0 bg-black/20" />
                     <div className="text-white relative z-10 w-full">
                        <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 mb-2">
                           {selectedEvent.type}
                        </Badge>
                        <SheetTitle className="text-2xl font-bold text-white">{selectedEvent.name}</SheetTitle>
                     </div>
                  </div>

                  <div className="p-6 flex-1 overflow-y-auto space-y-6">
                     <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
                        <div>
                           <div className="text-sm text-muted-foreground mb-1">Total Prize Pool</div>
                           <div className="text-2xl font-bold text-yellow-500">{selectedEvent.prizePool}</div>
                        </div>
                        <div className="text-right">
                           <div className="text-sm text-muted-foreground mb-1">Ends In</div>
                           <div className="text-xl font-mono">{selectedEvent.endsIn}</div>
                        </div>
                     </div>

                     <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2 text-sm uppercase text-muted-foreground">Rewards Breakdown</h4>
                        <div className="space-y-2">
                           {Object.entries(selectedEvent.rewards).map(([place, reward]) => (
                               <div key={place} className="flex justify-between items-center text-sm p-3 rounded bg-card border border-border/50">
                                   <span className="capitalize font-medium text-muted-foreground">{place} Place</span>
                                   <span className="font-bold">{reward}</span>
                               </div>
                           ))}
                        </div>
                     </div>

                     <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2 text-sm uppercase text-muted-foreground">Participation</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                               <span>Registered Players</span>
                               <span>{selectedEvent.participants} / {selectedEvent.maxParticipants}</span>
                            </div>
                            <Progress value={(selectedEvent.participants / selectedEvent.maxParticipants) * 100} className="h-2" />
                        </div>
                     </div>
                  </div>

                  <SheetFooter className="p-6 border-t border-border mt-auto bg-card/50">
                     <div className="w-full space-y-4">
                        {!isEligible(selectedEvent) && (
                           <div className="flex gap-2 items-start p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-500">
                              <AlertCircle className="size-4 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                 <p className="font-bold">Requirements Not Met</p>
                                 <ul className="list-disc pl-4 space-y-1 text-xs opacity-90">
                                    {playerRankPoints < selectedEvent.minRank && (
                                       <li>You need {selectedEvent.minRank} Rank Points (Currently: {playerRankPoints})</li>
                                    )}
                                    {playerCoins < selectedEvent.entryCoins && (
                                       <li>You need {selectedEvent.entryCoins} Coins (Currently: {playerCoins})</li>
                                    )}
                                 </ul>
                              </div>
                           </div>
                        )}
                        
                        <Button 
                           className="w-full h-12 text-lg font-bold" 
                           disabled={!isEligible(selectedEvent)}
                           onClick={() => handleEnter(selectedEvent)}
                        >
                           {isEligible(selectedEvent) ? (
                              <>Join Tournament ({selectedEvent.entryCoins} <Coins className="size-4 ml-1" />)</>
                           ) : 'Locked'}
                        </Button>
                     </div>
                  </SheetFooter>
               </>
            )}
         </SheetContent>
      </Sheet>
    </div>
  );
}
