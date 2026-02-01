import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Coins, Ticket, Plus } from "lucide-react";

interface WalletSectionProps {
  coins: number;
  tickets: number;
}

export function WalletSection({ coins, tickets }: WalletSectionProps) {
  // Mock progress logic
  const nextTicketCost = 500;
  const progress = Math.min((coins / nextTicketCost) * 100, 100);

  return (
    <div className="w-full bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-20">
       <div className="container mx-auto max-w-5xl py-3 px-4 flex items-center justify-between">
          
          {/* Left: Balances */}
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border border-border">
                <Coins className="size-4 text-yellow-500 fill-yellow-500" />
                <span className="font-bold tabular-nums">{coins.toLocaleString()}</span>
                <Button size="icon" variant="ghost" className="size-5 rounded-full hover:bg-yellow-500/20 -mr-1">
                   <Plus className="size-3" />
                </Button>
             </div>
             
             <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border border-border">
                <Ticket className="size-4 text-purple-500 fill-purple-500" />
                <span className="font-bold tabular-nums">{tickets}</span>
                <Button size="icon" variant="ghost" className="size-5 rounded-full hover:bg-purple-500/20 -mr-1">
                   <Plus className="size-3" />
                </Button>
             </div>
          </div>

          {/* Right: Progress Context (Desktop mostly) */}
          <div className="hidden md:flex items-center gap-3">
             <div className="text-right">
                <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-0.5">
                   Next Arena Entry
                </div>
                <Progress value={progress} className="h-1.5 w-32 bg-muted" />
             </div>
             <div className="size-8 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/50">
                <Ticket className="size-4 text-purple-500" />
             </div>
          </div>

       </div>
    </div>
  );
}
