import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ticket, Check } from "lucide-react";

export function FeaturedBundleCard() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl border-2 border-purple-500/30 bg-gradient-to-br from-purple-950/40 to-background shadow-2xl group cursor-pointer hover:border-purple-500/50 transition-all">
      {/* Background FX */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
      <div className="absolute right-0 top-0 size-64 bg-purple-500/20 blur-[100px] animate-pulse" />
      
      <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-center gap-8">
        
        {/* Visual */}
        <div className="shrink-0 relative">
           <div className="size-40 md:size-48 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-400 rotate-3 shadow-lg flex items-center justify-center relative z-10 group-hover:rotate-6 transition-transform duration-500">
               <Ticket className="size-20 text-white drop-shadow-md" />
               <div className="absolute -bottom-4 -right-4 bg-yellow-400 text-black font-black text-xs px-3 py-1 rounded-full shadow-lg border-2 border-white -rotate-6">
                  BEST VALUE
               </div>
           </div>
           <div className="absolute inset-0 bg-purple-500/50 blur-xl scale-90 translate-y-4 -z-10" />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4 text-center md:text-left">
           <div>
              <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                 <Badge className="bg-purple-500 hover:bg-purple-600 border-none uppercase tracking-widest text-[10px]">
                    Pro Starter Pack
                 </Badge>
              </div>
              <h2 className="text-3xl md:text-4xl font-black italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200">
                 Unlock the Arena
              </h2>
              <p className="text-muted-foreground mt-2 max-w-sm">
                 Get <span className="text-foreground font-bold">10 Arena Tickets</span> + <span className="text-yellow-500 font-bold">5,000 Bonus Coins</span> to jumpstart your ranked career.
              </p>
           </div>

           <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm font-medium">
              <div className="flex items-center gap-1.5">
                 <div className="bg-green-500/20 text-green-400 p-0.5 rounded-full"><Check className="size-3" /></div>
                 <span>No Ads / 7 Days</span>
              </div>
              <div className="flex items-center gap-1.5">
                 <div className="bg-green-500/20 text-green-400 p-0.5 rounded-full"><Check className="size-3" /></div>
                 <span>2x XP Boost</span>
              </div>
           </div>
        </div>

        {/* CTA */}
        <div className="shrink-0 flex flex-col gap-2 w-full md:w-auto">
           <Button size="lg" className="h-14 px-8 text-lg font-black uppercase tracking-wide bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border-0 shadow-lg shadow-purple-900/20 transition-all hover:scale-105">
              Unlock Bundle <span className="ml-2 opacity-80 font-medium text-xs line-through">$19.99</span> <span className="ml-2">$9.99</span>
           </Button>
           <p className="text-xs text-center text-muted-foreground">Limited time offer</p>
        </div>

      </div>
    </div>
  );
}
