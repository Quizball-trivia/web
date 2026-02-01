import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, TrendingUp, Flame, Sparkles } from 'lucide-react';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import type { CategorySummary } from '@/lib/domain';

interface CategoryCardProps {
  category: CategorySummary;
  onClick: () => void;
}

export const CategoryCard = ({ category, onClick }: CategoryCardProps) => (
  <Card
    className="flex-shrink-0 w-[280px] h-[180px] snap-center cursor-pointer transition-all active:scale-[0.98] hover:border-primary/50 overflow-hidden relative"
    onClick={onClick}
  >
    {/* Background Image */}
    {category.imageUrl && (
      <div className="absolute inset-0">
        <ImageWithFallback 
          src={category.imageUrl}
          alt={category.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
      </div>
    )}
    
    <CardContent className="pt-4 pb-4 relative z-10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex size-14 items-center justify-center rounded-xl bg-background/20 backdrop-blur-md border border-white/20 text-3xl">
          {category.icon}
        </div>
        {(category.yourBestScore || 0) > 0 && (
          <Badge className="bg-primary">
            <Trophy className="size-3 mr-1" />
            #{category.yourRank || 0}
          </Badge>
        )}
        {category.new && !(category.yourBestScore || 0) && (
          <Badge className="bg-primary">
            <Sparkles className="size-3 mr-1" />
            New
          </Badge>
        )}
        {category.trending && !(category.yourBestScore || 0) && (
          <Badge className="bg-orange-500">
            <Flame className="size-3 mr-1" />
            Hot
          </Badge>
        )}
      </div>
      <div>
        <h3 className="text-sm mb-1 text-white">{category.name}</h3>
        <p className="text-xs text-white/70 mb-2.5">
          {category.description}
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-black/30 border-white/30 text-white">
            <Users className="size-3 mr-1" />
            {((category.totalPlayers ?? 0) / 1000).toFixed(1)}k
          </Badge>
          {(category.yourBestScore || 0) > 0 && (
            <Badge variant="outline" className="text-xs bg-black/30 border-white/30 text-white">
              <TrendingUp className="size-2.5 mr-1" />
              {category.yourBestScore || 0}
            </Badge>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);
