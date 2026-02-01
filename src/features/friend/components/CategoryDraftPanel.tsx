import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Check, Plus, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/components/ui/utils";
import { useCategoriesList } from "@/lib/queries/categories.queries";
import { CategorySummary } from "@/lib/domain";

interface CategoryDraftPanelProps {
  selectedCategoryIds: string[];
  onToggleCategory: (id: string, category?: CategorySummary) => void;
  isHost: boolean;
}

export function CategoryDraftPanel({ selectedCategoryIds, onToggleCategory, isHost }: CategoryDraftPanelProps) {
  const [search, setSearch] = useState("");
  
  // Fetch real categories. For now we fetch all (or paginated default) and filter client side for responsiveness
  // unless the list is huge. Assuming a reasonable number of categories for now.
  const { data: categoriesData, isLoading, isError } = useCategoriesList({ limit: 100 });
  const categories = categoriesData?.items || [];

  const filtered = categories.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCategories = categories.filter(c => selectedCategoryIds.includes(c.id));
  
  // If we have selected IDs that aren't in the fetched list (e.g. pagination), 
  // we might want to handle that, but for now we assume they are in the initial load.

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl overflow-hidden border border-border">
       {/* Header */}
       <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between mb-4">
             <div>
                <h3 className="font-bold text-lg">Categories</h3>
                <p className="text-xs text-muted-foreground">Select 4 topics for the match</p>
             </div>
             <Badge variant={selectedCategoryIds.length === 4 ? "default" : "outline"} className="text-sm px-3 py-1">
                {selectedCategoryIds.length} / 4
             </Badge>
          </div>
          
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
             <Input 
                placeholder="Search categories..." 
                className="pl-9 bg-background" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
             />
          </div>
       </div>

       <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          
          {/* Main Grid */}
          <ScrollArea className="flex-1 h-[400px] md:h-auto">
             {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <p className="text-sm">Loading categories...</p>
                </div>
             ) : isError ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-destructive">
                    <p className="text-sm">Failed to load categories</p>
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
                </div>
             ) : (
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filtered.map(category => {
                       const isSelected = selectedCategoryIds.includes(category.id);
                       const disabled = !isSelected && selectedCategoryIds.length >= 4;
                       
                       return (
                          <button
                             key={category.id}
                             disabled={(!isHost) || (disabled)}
                             onClick={() => onToggleCategory(category.id, category)}
                             className={cn(
                                "flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center gap-2 relative group min-h-[100px]",
                                isSelected 
                                   ? "bg-primary/10 border-primary shadow-sm" 
                                   : "bg-background border-border hover:border-primary/50 hover:bg-muted/50",
                                disabled && "opacity-50 cursor-not-allowed grayscale",
                                !isHost && "cursor-default active:scale-100"
                             )}
                          >
                             <span className="text-2xl">{category.icon || "⚽"}</span>
                             <span className="text-xs font-medium leading-tight line-clamp-2">{category.name}</span>
                             {isSelected && (
                                <div className="absolute top-2 right-2 size-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-sm">
                                   <Check className="size-2.5" />
                                </div>
                             )}
                          </button>
                       );
                    })}
                    
                    {filtered.length === 0 && (
                        <div className="col-span-full py-10 text-center text-muted-foreground text-sm">
                            No categories found matching "{search}"
                        </div>
                    )}
                </div>
             )}
          </ScrollArea>

          {/* Sticky Draft Bar (Right on Desktop, Bottom on Mobile) */}
          <div className="w-full md:w-48 bg-muted/10 border-t md:border-t-0 md:border-l border-border flex-shrink-0 flex flex-col">
             <div className="p-3 text-xs font-bold uppercase text-muted-foreground border-b border-border">
                Your Picks
             </div>
             <ScrollArea className="flex-1 p-2">
                <div className="space-y-2">
                   {/* Slots */}
                   {Array.from({ length: 4 }).map((_, i) => {
                      const category = selectedCategories[i]; // This relies on 'categories' containing the selected ones. 
                      // If pagination is used, we might need a separate 'selectedCategories' state that holds full objects, but for now this is fine.
                      
                      return (
                         <div 
                            key={i} 
                            className={cn(
                               "h-12 rounded-lg border border-dashed flex items-center justify-center relative overflow-hidden transition-all",
                               category ? "bg-background border-solid border-border" : "border-border/50 bg-muted/20"
                            )}
                         >
                            {category ? (
                               <div className="flex items-center gap-2 w-full px-3">
                                  <span className="text-lg">{category.icon || "⚽"}</span>
                                  <span className="text-xs font-medium truncate flex-1 text-left">{category.name}</span>
                                  {isHost && (
                                     <button 
                                        onClick={() => onToggleCategory(category.id, category)}
                                        className="text-muted-foreground hover:text-destructive transition-colors p-1 -mr-2"
                                     >
                                        <Plus className="size-3 rotate-45" />
                                     </button>
                                  )}
                               </div>
                            ) : (
                               <span className="text-xs text-muted-foreground/50 font-medium">Slot {i + 1}</span>
                            )}
                         </div>
                      );
                   })}
                </div>
             </ScrollArea>
          </div>

       </div>
    </div>
  );
}
