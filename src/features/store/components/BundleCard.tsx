import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Coins, Ticket } from "lucide-react";
import { motion } from "motion/react";

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
  const isCoin = currencyType === 'coins';

  return (
    <motion.div
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="relative"
    >
      {isPopular && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full shadow-md shadow-orange-500/30 z-10 tracking-wider">
          Most Popular
        </div>
      )}

      <div className={cn(
        "relative flex flex-col items-center rounded-2xl border-2 border-b-4 bg-[#1B2F36] p-5 h-full overflow-hidden transition-colors",
        isPopular
          ? "border-orange-500/60 border-b-orange-600"
          : isCoin
            ? "border-yellow-500/20 border-b-yellow-500/40 hover:border-yellow-500/40"
            : "border-purple-500/20 border-b-purple-500/40 hover:border-purple-500/40"
      )}>
        {/* Background glow */}
        <div className={cn(
          "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-32 rounded-full blur-[60px] opacity-30",
          isPopular ? "bg-orange-500" : isCoin ? "bg-yellow-500" : "bg-purple-500"
        )} />

        {/* Icon */}
        <div className="relative mb-3">
          <div className={cn(
            "size-16 rounded-2xl flex items-center justify-center border-2 border-b-4 transition-colors",
            isCoin
              ? "bg-yellow-500/10 border-yellow-500/30 border-b-yellow-600/30"
              : "bg-purple-500/10 border-purple-500/30 border-b-purple-600/30"
          )}>
            {isCoin
              ? <Coins className="size-8 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
              : <Ticket className="size-8 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
            }
          </div>
          {bonus && (
            <div className="absolute -bottom-1.5 -right-1.5 bg-[#58CC02] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-[#1B2F36] shadow-md">
              +{bonus}%
            </div>
          )}
        </div>

        {/* Amount */}
        <div className="text-center mb-4">
          <div className="text-2xl font-black font-fun tabular-nums tracking-tight">{amount.toLocaleString()}</div>
          <div className="text-[11px] font-bold uppercase text-[#56707A] tracking-wider mt-0.5">{title}</div>
        </div>

        {/* Price Button */}
        <Button
          className={cn(
            "w-full font-black text-sm rounded-xl border-b-4 active:border-b-0 active:mt-1 transition-all",
            isPopular
              ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 border-orange-700 text-white"
              : "bg-[#1CB0F6] hover:bg-[#1CB0F6]/90 border-[#1890CC] text-white"
          )}
        >
          {price}
        </Button>
      </div>
    </motion.div>
  );
}
