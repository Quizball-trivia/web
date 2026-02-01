import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Users, Play, Zap, CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useState } from "react";
import { CategoryDraftPanel } from "./CategoryDraftPanel";
import { cn } from "@/components/ui/utils";
import { AvatarDisplay } from "@/components/AvatarDisplay";

interface FriendLobbyScreenProps {
  roomCode: string;
  isHost: boolean;
}

export function FriendLobbyScreen({ roomCode, isHost }: FriendLobbyScreenProps) {
  const [copied, setCopied] = useState(false);
  const [matchType, setMatchType] = useState<'quizball' | 'buzzer'>('quizball');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [players, setPlayers] = useState([
    { id: '1', username: 'You', isHost, isReady: true, avatar: 'avatar-1' },
    { id: '2', username: 'Waiting...', isHost: false, isReady: false, isPlaceholder: true },
  ]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    toast.success("Room Code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleCategory = (id: string) => {
    if (!isHost) return;
    
    setSelectedCategories(prev => {
      if (prev.includes(id)) {
        return prev.filter(c => c !== id);
      }
      if (prev.length >= 4) {
        toast.error("Maximum 4 categories allowed");
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleStartMatch = () => {
      if (selectedCategories.length < 4) {
          toast.error("Please select 4 categories");
          return;
      }
      toast.success("Starting match...");
      // router.push('/game') logic would go here
  };

  const joinedPlayer = players.find(p => !p.isPlaceholder && !p.isHost);
  const canStart = isHost && selectedCategories.length === 4; // && joinedPlayer for real app

  return (
    <div className="container mx-auto max-w-6xl py-6 animate-in fade-in space-y-6">
      
      {/* Top Bar: Room Info */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card border border-border rounded-xl p-4 shadow-sm">
         <div className="flex items-center gap-4">
             <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                 <Users className="size-6" />
             </div>
             <div>
                 <h1 className="text-xl font-bold">Lobby</h1>
                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    Code: <span className="font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded">{roomCode}</span>
                    <button onClick={copyCode} className="hover:text-primary transition-colors">
                        <Copy className="size-3" />
                    </button>
                 </div>
             </div>
         </div>
         
         {/* Players */}
         <div className="flex items-center gap-6 flex-1 justify-center md:justify-end">
             {players.map((player, idx) => (
                 <div key={idx} className={cn("flex flex-col items-center gap-2 relative", player.isPlaceholder && "opacity-50")}>
                     <div className="relative">
                        <AvatarDisplay 
                            customization={{ base: (player.avatar || 'avatar-2') as any }} 
                            size="md" 
                            className={cn("border-2", player.isReady ? "border-green-500" : "border-border")}
                        />
                        {player.isHost && (
                           <Badge className="absolute -top-2 -right-2 text-[10px] px-1 h-4">HOST</Badge>
                        )}
                     </div>
                     <span className="text-xs font-medium">{player.username}</span>
                 </div>
             ))}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)] min-h-[500px]">
          
          {/* LEFT: Settings (Host Only controls) */}
          <div className="lg:col-span-2 flex flex-col gap-4 h-full">
              <Card className="flex-1 flex flex-col overflow-hidden border-border/60">
                 <CardHeader className="py-3 px-4 border-b border-border bg-muted/20">
                    <CardTitle className="text-sm uppercase text-muted-foreground flex items-center justify-between">
                        <span>Match Setup</span>
                        {!isHost && <Badge variant="secondary">Host has control</Badge>}
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="p-0 flex-1 flex flex-col">
                    
                    {/* Match Type Selector */}
                    <div className="grid grid-cols-2 p-4 gap-4 border-b border-border">
                        <div 
                           onClick={() => isHost && setMatchType('quizball')}
                           className={cn(
                               "p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-muted/50 flex flex-col items-center gap-2 text-center relative",
                               matchType === 'quizball' ? "border-primary bg-primary/5" : "border-border",
                               !isHost && "pointer-events-none"
                           )}
                        >
                           <Circle className={cn("size-6", matchType === 'quizball' ? "text-primary" : "text-muted-foreground")} />
                           <div>
                               <div className="font-bold">Standard</div>
                               <div className="text-xs text-muted-foreground">Multiple Choice</div>
                           </div>
                        </div>

                        <div 
                           onClick={() => isHost && setMatchType('buzzer')}
                           className={cn(
                               "p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-muted/50 flex flex-col items-center gap-2 text-center relative",
                               matchType === 'buzzer' ? "border-yellow-500 bg-yellow-500/5" : "border-border",
                               !isHost && "pointer-events-none"
                           )}
                        >
                           <Zap className={cn("size-6", matchType === 'buzzer' ? "text-yellow-500" : "text-muted-foreground")} />
                           <div>
                               <div className="font-bold">Buzzer Battle</div>
                               <div className="text-xs text-muted-foreground">Speed Round</div>
                           </div>
                        </div>
                    </div>

                    {/* Category Draft */}
                    <div className="flex-1 overflow-hidden p-4">
                        <CategoryDraftPanel 
                            selectedCategoryIds={selectedCategories} 
                            onToggleCategory={toggleCategory}
                            isHost={isHost}
                        />
                    </div>

                 </CardContent>
              </Card>
          </div>

          {/* RIGHT: Actions & Status */}
          <div className="flex flex-col gap-4">
              <Card className="h-full border-border/60">
                  <CardHeader className="py-4 px-4 border-b border-border">
                      <CardTitle>Match Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-6">
                      
                      <div className="space-y-4">
                          <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">Mode</span>
                              <span className="font-medium flex items-center gap-2">
                                  {matchType === 'quizball' ? <Circle className="size-3 text-primary" /> : <Zap className="size-3 text-yellow-500" />}
                                  {matchType === 'quizball' ? 'Standard' : 'Buzzer'}
                              </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">Categories</span>
                              <span className={cn("font-medium", selectedCategories.length === 4 ? "text-green-500" : "text-yellow-500")}>
                                  {selectedCategories.length} / 4
                              </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">Players</span>
                              <span className="font-medium">1 / 2</span>
                          </div>
                      </div>

                      <div className="border-t border-border pt-6 mt-auto">
                          {isHost ? (
                              <Button 
                                  size="lg" 
                                  className="w-full h-14 text-lg font-bold shadow-lg" 
                                  onClick={handleStartMatch}
                                  disabled={!canStart}
                              >
                                  {canStart ? (
                                      <>
                                          <Play className="size-5 mr-2 fill-current" /> Start Match
                                      </>
                                  ) : (
                                      "Waiting for Setup..."
                                  )}
                              </Button>
                          ) : (
                              <Button 
                                  size="lg" 
                                  className={cn("w-full h-14 text-lg font-bold", true ? "bg-green-600 hover:bg-green-700" : "")}
                              >
                                  {true ? (
                                      <>
                                          <CheckCircle2 className="size-5 mr-2" /> Ready
                                      </>
                                  ) : (
                                      "Not Ready"
                                  )}
                              </Button>
                          )}
                          
                          <p className="text-xs text-center text-muted-foreground mt-3">
                              {isHost ? "Configure the match and wait for your friend." : "Host is configuring the match."}
                          </p>
                      </div>

                  </CardContent>
              </Card>
          </div>
      </div>

    </div>
  );
}
