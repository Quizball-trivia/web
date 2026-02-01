import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/utils";
import type { CategorySummary } from "@/lib/domain";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { Lock, Check, Users, Flame, Star } from "lucide-react";

export interface CategoryGameCardProps {
  category: CategorySummary;
  state: 'default' | 'selected' | 'banned' | 'opponent-banned';
  onClick?: () => void;
  disabled?: boolean;
}

export function CategoryGameCard({ category, state, onClick, disabled }: CategoryGameCardProps) {
  const isBanned = state === 'banned' || state === 'opponent-banned';
  const isSelected = state === 'selected';
  
  return (
    <div 
      onClick={!disabled ? onClick : undefined}
      className={cn(
        "group relative w-full aspect-[4/5] rounded-lg overflow-hidden border-2 transition-all duration-300",
        disabled ? "cursor-default grayscale opacity-60" : "cursor-pointer hover:scale-105 hover:shadow-xl hover:shadow-primary/20",
        state === 'default' && "border-border hover:border-primary/50",
        state === 'selected' && "border-green-500 shadow-lg shadow-green-500/20 scale-105",
        state === 'banned' && "border-red-500 opacity-80",
        state === 'opponent-banned' && "border-red-500 opacity-80",
      )}
    >
      {/* Background Image - Object Cover to prevent shift */}
      <div className="absolute inset-0 bg-muted">
        {category.imageUrl ? (
           <ImageWithFallback 
              src={category.imageUrl} 
              alt={category.name} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
           />
        ) : (
           <div className="w-full h-full flex items-center justify-center bg-card text-4xl">
              {category.icon || "⚽"}
           </div>
        )}
      </div>

      {/* Gradient Overlay for Text Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 p-3 flex flex-col justify-end">
         
         {/* Top Tags */}
         <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
            {category.trending && (
               <Badge className="bg-orange-500 hover:bg-orange-600 border-0 text-[9px] px-1 py-0 h-auto">
                  <Flame className="size-2.5 mr-0.5 fill-white" /> HOT
               </Badge>
            )}
            {category.new && (
               <Badge className="bg-blue-500 hover:bg-blue-600 border-0 text-[9px] px-1 py-0 h-auto">
                  NEW
               </Badge>
            )}
         </div>

         {/* Title area */}
         <div className="space-y-0.5">
            <h3 className="text-sm font-black text-white leading-tight drop-shadow-md line-clamp-2">
               {category.name}
            </h3>
            
            <div className="flex items-center gap-2 text-[9px] font-medium text-white/80">
               <span className="flex items-center gap-0.5">
                  <Users className="size-2.5" /> {(category.totalPlayers || 1200).toLocaleString()}
               </span>
               <span className="flex items-center gap-0.5">
                  <Star className="size-2.5 text-yellow-400 fill-yellow-400" /> 4.8
               </span>
            </div>
         </div>
      </div>

      {/* State Overlays */}
      {isBanned && (
         <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
            <div className="bg-red-600 text-white px-3 py-1 rounded font-bold uppercase tracking-widest text-sm transform -rotate-12 border-2 border-white shadow-lg">
               BANNED
            </div>
         </div>
      )}
      
      {isSelected && (
         <div className="absolute top-3 left-3 size-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white z-10">
            <Check className="size-3 text-white stroke-[4]" />
         </div>
      )}

    </div>
  );
}
