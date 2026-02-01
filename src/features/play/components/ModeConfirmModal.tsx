import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, User, Crown, Ticket, Ban } from "lucide-react";
import { useIsMobile } from "@/components/ui/use-mobile";
import { cn } from "@/components/ui/utils";

interface ModeConfirmModalProps {
  mode: 'ranked' | 'friendly' | 'solo' | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  ticketsRemaining?: number;
}

export function ModeConfirmModal({
  mode,
  isOpen,
  onOpenChange,
  onConfirm,
  ticketsRemaining = 0,
}: ModeConfirmModalProps) {
  const isMobile = useIsMobile();
  const isRanked = mode === 'ranked';
  
  if (!mode) return null;

  // Mode Configuration
  const config = {
    ranked: {
      title: "Ranked Match",
      icon: Trophy,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
      description: "Compete for Rank Points (RP) and climb the leaderboards.",
      entryCost: 1,
      stats: [
        { label: "Format", value: "1v1 Duel" },
        { label: "Duration", value: "~2 min" },
        { label: "Questions", value: "10" },
      ]
    },
    friendly: {
      title: "Friendly Match",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      description: "Play against a friend. No RP at stake.",
      entryCost: 0,
      stats: [
        { label: "Format", value: "1v1" },
        { label: "Duration", value: "Variable" },
        { label: "Custom", value: "Yes" },
      ]
    },
    solo: {
      title: "Solo Practice",
      icon: User,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      description: "Practice your skills against the AI.",
      entryCost: 0,
      stats: [
        { label: "Format", value: "Solo" },
        { label: "Speed", value: "Self-paced" },
        { label: "XP", value: "Earned" },
      ]
    }
  }[mode];

  const hasTickets = ticketsRemaining >= (config.entryCost || 0);

  const Content = (
    <div className="space-y-6">
       {/* Header Icon */}
       <div className="flex flex-col items-center text-center space-y-2">
          <div className={cn("size-16 rounded-2xl flex items-center justify-center mb-2 border", config.bgColor, config.color, config.borderColor)}>
             <config.icon className="size-8" />
          </div>
          {isRanked && (
             <Badge variant="outline" className="border-yellow-500/50 text-yellow-500 bg-yellow-500/5">
                <Crown className="size-3 mr-1" />
                Competitive
             </Badge>
          )}
          <p className="text-muted-foreground text-sm max-w-xs">{config.description}</p>
       </div>

       {/* Stats Grid */}
       <div className="grid grid-cols-3 gap-2">
          {config.stats.map((stat) => (
             <div key={stat.label} className="bg-muted/50 rounded-lg p-2 text-center border border-border/50">
                <div className="text-[10px] uppercase text-muted-foreground">{stat.label}</div>
                <div className="font-semibold text-sm">{stat.value}</div>
             </div>
          ))}
       </div>

       {/* Entry Cost */}
       {config.entryCost > 0 && (
          <div className={cn(
             "rounded-xl p-4 border flex items-center justify-between",
             hasTickets ? "bg-card border-border" : "bg-red-500/10 border-red-500/20"
          )}>
             <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-background flex items-center justify-center border border-border">
                   <Ticket className={cn("size-5", hasTickets ? "text-primary" : "text-red-500")} />
                </div>
                <div>
                   <div className="font-bold text-sm">Entry Cost</div>
                   <div className="text-xs text-muted-foreground flex items-center gap-1">
                      {config.entryCost} Ticket
                      <span className="text-border">|</span>
                      You have: <span className={cn(hasTickets ? "text-primary" : "text-red-500")}>{ticketsRemaining}</span>
                   </div>
                </div>
             </div>
             {!hasTickets && (
                <Badge variant="destructive" className="flex items-center gap-1">
                   <Ban className="size-3" />
                   No Tickets
                </Badge>
             )}
          </div>
       )}

       {/* Actions */}
       <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
             Cancel
          </Button>
          <Button 
             size="lg" 
             onClick={onConfirm} 
             disabled={!hasTickets}
             className={cn("font-bold text-base", isRanked ? "shadow-lg shadow-yellow-500/20" : "")}
          >
             Start Match
          </Button>
       </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl border-t border-border/50">
          <SheetHeader className="mb-4 text-left">
            <SheetTitle className="text-xl flex items-center gap-2">
               {config.title}
            </SheetTitle>
          </SheetHeader>
          {Content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-center hidden">Confirm {config.title}</DialogTitle>
          <div className="text-center font-bold text-xl">{config.title}</div>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
}
