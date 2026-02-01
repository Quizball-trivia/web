import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { Coins, Ticket } from "lucide-react";

export interface BundleProps {
  id: string;
  title: string;
  amount: number;
  bonus?: number;
  price: string;
  currencyType: 'coins' | 'tickets';
  imageColor?: string;
  isPopular?: boolean;
}

export function BundleCard({ title, amount, bonus, price, currencyType, isPopular }: BundleProps) {
  return (
    <div className={cn(
       "group relative flex flex-col p-1 rounded-2xl transition-all hover:scale-[1.02]",
       isPopular ? "bg-gradient-to-b from-yellow-500 to-orange-600 shadow-lg shadow-orange-500/20" : "bg-border hover:bg-primary/50"
    )}>
       {isPopular && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-sm z-10">
             Most Popular
          </div>
       )}
       
       <div className="flex-1 flex flex-col items-center bg-card rounded-xl p-4 h-full relative overflow-hidden">
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="mb-4 relative">
             <div className={cn(
                "size-16 rounded-full flex items-center justify-center shadow-inner",
                currencyType === 'coins' ? "bg-yellow-500/10" : "bg-purple-500/10"
             )}>
                {currencyType === 'coins' ? 
                   <Coins className="size-8 text-yellow-500 fill-yellow-500" /> :
                   <Ticket className="size-8 text-purple-500 fill-purple-500" />
                }
             </div>
             {bonus && (
                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-card">
                   +{bonus}%
                </div>
             )}
          </div>

          <div className="text-center space-y-0.5 mb-4">
             <div className="text-2xl font-black tabular-nums">{amount.toLocaleString()}</div>
             <div className="text-xs font-bold uppercase text-muted-foreground">{title}</div>
          </div>

          <Button 
             variant={isPopular ? "default" : "secondary"} 
             className={cn("w-full font-bold", isPopular && "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 border-0")}
          >
             {price}
          </Button>
       </div>
    </div>
  );
}
