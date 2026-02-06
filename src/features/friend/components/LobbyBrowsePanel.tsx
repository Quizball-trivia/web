import { useState, useMemo } from "react";
import { Search, RotateCcw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePublicLobbies } from "@/lib/queries/lobbies.queries";
import { LobbyCard } from "./LobbyCard";
import { Loader2 } from "lucide-react";

interface LobbyBrowsePanelProps {
  onJoin: (inviteCode: string) => void;
  isJoiningCode?: string | null;
  onActionTriggered?: () => void;
}

export function LobbyBrowsePanel({ onJoin, isJoiningCode, onActionTriggered }: LobbyBrowsePanelProps) {
  const { data: lobbies, isLoading, refetch } = usePublicLobbies();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<'all' | 'open'>('open');

  const filteredLobbies = useMemo(() => {
    if (!lobbies) return [];
    
    return lobbies.filter(lobby => {
      // Search logic
      const matchesSearch = 
        lobby.displayName.toLowerCase().includes(search.toLowerCase()) ||
        lobby.host.username.toLowerCase().includes(search.toLowerCase()) || 
        lobby.inviteCode.toLowerCase().includes(search.toLowerCase());
      
      if (!matchesSearch) return false;

      // Filter logic
      if (filter === 'open') {
         return lobby.memberCount < lobby.maxMembers;
      }
      
      return true;
    });
  }, [lobbies, search, filter]);

  const handleJoin = (inviteCode: string) => {
    onActionTriggered?.();
    onJoin(inviteCode);
  };

  return (
    <div className="space-y-6">
       {/* Search & Filter Bar */}
       <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
             <Input 
                placeholder="Search host or code..." 
                className="pl-9 bg-card"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
             />
          </div>
          
          <div className="flex items-center gap-2">
             <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'open')} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-2">
                   <TabsTrigger value="open">Open</TabsTrigger>
                   <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
             </Tabs>
             
             <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh">
                <RotateCcw className="size-4" />
             </Button>
          </div>
       </div>

       {/* List Content */}
       <div className="min-h-[300px]">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="size-8 animate-spin mb-2" />
                <p>Finding matches...</p>
             </div>
          ) : filteredLobbies.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-muted/10">
                <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
                   <Filter className="size-6 opacity-50" />
                </div>
                <h3 className="font-semibold">No lobbies found</h3>
                <p className="text-sm">Try adjusting filters or create your own room!</p>
             </div>
          ) : (
             <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {filteredLobbies.map(lobby => (
                   <LobbyCard 
                      key={lobby.lobbyId} 
                      lobby={lobby} 
                      onJoin={handleJoin}
                      isJoining={isJoiningCode === lobby.inviteCode}
                   />
                ))}
             </div>
          )}
       </div>
    </div>
  );
}
