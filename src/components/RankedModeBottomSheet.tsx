import { Sheet, SheetContent, SheetTitle, SheetDescription } from './ui/sheet';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Trophy, Ticket, Crown, Zap, TrendingUp, Users } from 'lucide-react';

interface RankedModeBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlay: () => void;
  ticketsRemaining: number;
}

export function RankedModeBottomSheet({
  open,
  onOpenChange,
  onPlay,
  ticketsRemaining
}: RankedModeBottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl px-6">
        <SheetTitle className="sr-only">Ranked Mode Details</SheetTitle>
        <SheetDescription className="sr-only">
          Learn about Ranked mode and start your competitive match. Costs 1 ticket to play.
        </SheetDescription>
        
        <div className="pb-4">
          {/* Header */}
          <div className="flex items-center gap-4 mb-4">
            <div className="size-16 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-600/30 flex items-center justify-center shrink-0 border border-amber-400/30 shadow-lg shadow-amber-500/20">
              <Trophy className="size-8 text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
                  Ranked Mode
                </h2>
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs px-2 py-0.5 border-0">
                  <Crown className="size-3 mr-1" />
                  Competitive
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Test your skills against real opponents
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-2.5 mb-4">
            <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg border">
              <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <Zap className="size-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm mb-0.5">Strategic Category Blocking</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  4 random categories appear - each player blocks 1, then compete in the remaining 2
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg border">
              <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="size-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm mb-0.5">Division-Based Ranking</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Win to gain points, lose to drop. Climb from Division 10 to Elite status
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg border">
              <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <Users className="size-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm mb-0.5">Real-Time 1v1 Matches</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Face opponents of similar skill in fast-paced 10-question matches
                </p>
              </div>
            </div>
          </div>

          {/* Cost & Tickets */}
          <div className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-600/10 rounded-xl border-2 border-amber-500/30 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Ticket className="size-5 text-amber-500" />
                <span className="text-sm">Entry Cost</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-amber-500/30">
                <Ticket className="size-4 text-amber-500" />
                <span className="font-bold text-amber-500">1</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Your Tickets</span>
              <span className={ticketsRemaining > 0 ? 'text-primary' : 'text-red-500'}>
                {ticketsRemaining} / 10
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-amber-500/20">
              <p className="text-xs text-muted-foreground">
                💡 Tickets reset daily. Play strategically to maximize your climbs!
              </p>
            </div>
          </div>

          {/* Play Button */}
          <Button 
            className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30 text-base"
            onClick={onPlay}
            disabled={ticketsRemaining <= 0}
          >
            <Trophy className="size-5 mr-2" />
            {ticketsRemaining > 0 ? (
              <>
                <span>Play Ranked</span>
                <div className="flex items-center gap-0.5 ml-2 px-2 py-0.5 rounded-md bg-black/20 border border-white/20">
                  <Ticket className="size-3.5" />
                  <span className="text-sm">1</span>
                </div>
              </>
            ) : (
              'No Tickets Remaining'
            )}
          </Button>

          {ticketsRemaining <= 0 && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              Come back tomorrow for fresh tickets!
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
