"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ArrowLeft, Trophy, Users, TrendingUp, Search, Ticket } from 'lucide-react';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { CategoryCard } from '@/components/game/CategoryCard';
import type { CategorySummary } from '@/lib/domain';
import { useCategoriesList } from '@/lib/queries/categories.queries';

interface QuizBallCategoriesScreenProps {
  onBack: () => void;
  onSelectCategory: (category: CategorySummary, matchType: 'ranked' | 'friend') => void;
}

export function QuizBallCategoriesScreen({
  onBack,
  onSelectCategory,
}: QuizBallCategoriesScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategorySummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { data, isLoading, isError } = useCategoriesList({
    limit: 100,
    page: 1,
    is_active: "true",
  });

  const categories = data?.items ?? [];

  // For You - Categories with yourBestScore > 0 (Previously Played)
  const forYouCategoriesRaw = categories.filter(cat => (cat.yourBestScore || 0) > 0);
  
  // Sort so General Knowledge is always first
  const forYouCategories = forYouCategoriesRaw.sort((a, b) => {
    if (a.id === 'general-knowledge') return -1;
    if (b.id === 'general-knowledge') return 1;
    return 0;
  });
  
  const forYouIds = new Set(forYouCategories.map(cat => cat.id));
  
  // All Other Categories (excluding For You)
  const exploreCategories = categories.filter(cat => !forYouIds.has(cat.id));
  
  // Filter categories based on search
  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cat.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCategoryClick = (category: CategorySummary) => {
    setSelectedCategory(category);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b sticky top-0 bg-background z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center size-9 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg">QuizBall</h1>
            <p className="text-xs text-muted-foreground">{categories.length} categories • {forYouCategories.length} played</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Search Bar */}
        <div className="px-4 pt-4 pb-4 sticky top-0 bg-background z-10 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <span className="text-sm text-muted-foreground">Loading categories...</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Search className="size-12 text-muted-foreground mb-3" />
            <h3 className="text-sm mb-1">Unable to load categories</h3>
            <p className="text-xs text-muted-foreground">Please try again soon</p>
          </div>
        ) : searchQuery ? (
          /* Search Results */
          filteredCategories.length > 0 ? (
            <div className="pb-6 px-4 pt-4">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm">Search Results</h2>
                <Badge variant="outline" className="text-xs">{filteredCategories.length}</Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => handleCategoryClick(category)}
                    className="relative h-[160px] rounded-xl overflow-hidden cursor-pointer transition-all active:scale-[0.97] hover:shadow-lg hover:shadow-primary/20 group"
                  >
                    {/* Background */}
                    {category.imageUrl ? (
                      <>
                        <ImageWithFallback 
                          src={category.imageUrl}
                          alt={category.name}
                          className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                    )}

                    {/* Content */}
                    <div className="relative h-full p-3 flex flex-col">
                      <div className="flex items-start justify-between mb-auto">
                        <div className="size-10 flex items-center justify-center rounded-lg bg-background/20 backdrop-blur-sm border border-white/20 text-xl">
                          {category.icon}
                        </div>
                        {(category.yourBestScore || 0) > 0 && (
                          <Badge className="bg-primary text-xs h-5">
                            #{category.yourRank || 0}
                          </Badge>
                        )}
                        {category.new && !(category.yourBestScore || 0) && (
                          <Badge className="bg-primary text-xs h-5">New</Badge>
                        )}
                        {category.trending && !(category.yourBestScore || 0) && !category.new && (
                          <Badge className="bg-orange-500 text-xs h-5">Hot</Badge>
                        )}
                      </div>
                      <div>
                        <h3 className="text-xs mb-0.5 text-white line-clamp-1">{category.name}</h3>
                        <div className="flex items-center gap-1 text-[10px] text-white/70">
                          <Users className="size-2.5" />
                          {((category.totalPlayers ?? 0) / 1000).toFixed(1)}k
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Search className="size-12 text-muted-foreground mb-3" />
              <h3 className="text-sm mb-1">No categories found</h3>
              <p className="text-xs text-muted-foreground">Try searching with different keywords</p>
            </div>
          )
        ) : (
          /* All Content */
          <div className="pb-6">
            {/* For You Section */}
            {forYouCategories.length > 0 && (
              <div className="pt-4 pb-3">
                <div className="flex items-center gap-2 px-4 mb-3">
                  <Trophy className="size-4 text-primary" />
                  <h2 className="text-sm">For You</h2>
                  <Badge variant="outline" className="text-xs">{forYouCategories.length}</Badge>
                </div>
                
                <div className="flex gap-3 overflow-x-auto px-4 pb-3 snap-x snap-mandatory scrollbar-hide">
                  {forYouCategories.map((category) => (
                    <CategoryCard key={category.id} category={category} onClick={() => handleCategoryClick(category)} />
                  ))}
                </div>
              </div>
            )}

            {/* All Other Categories Grid */}
            <div className="pt-3 pb-2">
              <div className="px-4 mb-3">
                <h2 className="text-sm mb-1">Explore</h2>
                <p className="text-xs text-muted-foreground">Browse all available categories</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 px-4">
                {exploreCategories.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => handleCategoryClick(category)}
                    className="relative h-[140px] rounded-xl overflow-hidden cursor-pointer transition-all active:scale-[0.97] hover:shadow-lg hover:shadow-primary/20 group"
                  >
                    {category.imageUrl ? (
                      <>
                        <ImageWithFallback 
                          src={category.imageUrl}
                          alt={category.name}
                          className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                    )}

                    <div className="relative h-full p-3 flex flex-col">
                      <div className="flex items-start justify-between mb-auto">
                        <div className="size-10 flex items-center justify-center rounded-lg bg-background/20 backdrop-blur-sm border border-white/20 text-xl">
                          {category.icon}
                        </div>
                        {category.trending && (
                          <Badge className="bg-orange-500 text-xs h-5">Hot</Badge>
                        )}
                        {category.new && !category.trending && (
                          <Badge className="bg-primary text-xs h-5">New</Badge>
                        )}
                      </div>
                      <div>
                        <h3 className="text-xs mb-1 text-white line-clamp-1">{category.name}</h3>
                        <div className="flex items-center gap-1 text-[10px] text-white/70">
                          <Users className="size-2.5" />
                          {((category.totalPlayers ?? 0) / 1000).toFixed(1)}k
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Selection Sheet */}
      <Sheet open={!!selectedCategory} onOpenChange={(open) => !open && setSelectedCategory(null)}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl px-6">
          <SheetTitle className="sr-only">
            {selectedCategory ? `${selectedCategory.name} Category` : 'Category Selection'}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {selectedCategory ? `Choose how you want to play ${selectedCategory.name}. Play ranked to compete for leaderboard position or play with a friend for friendly practice.` : 'Select your play mode'}
          </SheetDescription>
          {selectedCategory && (
            <div className="pb-4">
              {/* Category Header with Image */}
              {selectedCategory.imageUrl ? (
                <div className="relative -mx-6 -mt-6 mb-4 h-32 overflow-hidden rounded-t-2xl">
                  <ImageWithFallback 
                    src={selectedCategory.imageUrl}
                    alt={selectedCategory.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-background" />
                  
                  <div className="absolute bottom-3 left-6 right-6 flex items-center gap-3">
                    <div className="flex size-14 items-center justify-center rounded-xl bg-background/20 backdrop-blur-md border border-white/20 text-3xl">
                      {selectedCategory.icon}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg text-white mb-0.5">{selectedCategory.name}</h2>
                      <p className="text-xs text-white/70">{selectedCategory.description}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-3xl">
                      {selectedCategory.icon}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg mb-0.5">{selectedCategory.name}</h2>
                      <p className="text-xs text-muted-foreground">{selectedCategory.description}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="p-2.5 bg-secondary/50 rounded-lg border text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Users className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="text-xs">{((selectedCategory.totalPlayers ?? 0) / 1000).toFixed(1)}k</div>
                  <div className="text-[10px] text-muted-foreground">Players</div>
                </div>
                {(selectedCategory.yourBestScore || 0) > 0 ? (
                  <>
                    <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/30 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Trophy className="size-3.5 text-primary" />
                      </div>
                      <div className="text-xs">#{selectedCategory.yourRank || 0}</div>
                      <div className="text-[10px] text-muted-foreground">Your Rank</div>
                    </div>
                    <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/30 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <TrendingUp className="size-3.5 text-primary" />
                      </div>
                      <div className="text-xs">{selectedCategory.yourBestScore || 0}</div>
                      <div className="text-[10px] text-muted-foreground">Best Score</div>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 p-2.5 bg-secondary/50 rounded-lg border text-center flex items-center justify-center">
                    <div className="text-xs text-muted-foreground">Not played yet</div>
                  </div>
                )}
              </div>

              {/* Top Players */}
              <div className="p-3 bg-secondary/30 rounded-lg border mb-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <Trophy className="size-4 text-primary" />
                  <span className="text-sm">Top Players</span>
                </div>
                <div className="space-y-2">
                  {(selectedCategory.leaderboardTop ?? []).map((player) => (
                    <div
                      key={player.rank}
                      className="flex items-center gap-2.5 p-2 bg-background rounded-lg"
                    >
                      <div className={`flex items-center justify-center size-6 rounded-full text-xs ${
                        player.rank === 1 
                          ? 'bg-primary text-primary-foreground'
                          : player.rank === 2
                          ? 'bg-muted-foreground/20'
                          : 'bg-muted'
                      }`}>
                        {player.rank}
                      </div>
                      <div className="text-base">{player.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{player.username}</div>
                      </div>
                      <div className="text-sm tabular-nums">
                        {player.score.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCategory(selectedCategory, 'friend');
                  }}
                >
                  <Users className="size-4 mr-2" />
                  With Friend
                </Button>
                <Button
                  className="h-11 flex items-center justify-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCategory(selectedCategory, 'ranked');
                  }}
                >
                  <Trophy className="size-4" />
                  <span>Play Ranked</span>
                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/20 border border-white/20">
                    <Ticket className="size-3" />
                    <span className="text-xs">1</span>
                  </div>
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
