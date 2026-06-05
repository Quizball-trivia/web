import { useState, useMemo } from "react";
import { Search, RotateCcw, Filter } from "lucide-react";
import { usePublicLobbies } from "@/lib/queries/lobbies.queries";
import { LobbyCard } from "./LobbyCard";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";

interface LobbyBrowsePanelProps {
  onJoin: (inviteCode: string) => void;
  isJoiningCode?: string | null;
  onActionTriggered?: () => void;
}

export function LobbyBrowsePanel({ onJoin, isJoiningCode, onActionTriggered }: LobbyBrowsePanelProps) {
  const { t } = useLocale();
  const { data: lobbies, isLoading, isFetching, refetch } = usePublicLobbies();
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
       <div className="flex flex-row items-center gap-2 sm:gap-3">
          <div className="relative min-w-0 flex-1">
             <Search className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 size-4 sm:size-5 text-white/55" />
             <input
                type="text"
                placeholder={t("friend.searchPlaceholder")}
                className="h-12 sm:h-14 w-full rounded-[20px] border-none bg-brand-blue pl-9 sm:pl-14 pr-3 sm:pr-5 text-sm sm:text-base uppercase text-white outline-none placeholder:text-white/45 placeholder:uppercase placeholder:tracking-[0.08em] focus:outline-none disabled:opacity-50"
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  boxShadow: '0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)',
                }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
             />
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
             <div className="flex items-center gap-1 sm:gap-1.5 rounded-[20px] border-2 border-brand-green p-0.5 sm:p-1">
                {(['open', 'all'] as const).map((value) => {
                   const isActive = filter === value;
                   return (
                      <button
                         key={value}
                         type="button"
                         onClick={() => setFilter(value)}
                         className={
                            isActive
                               ? "rounded-[14px] bg-brand-green px-2.5 sm:px-5 py-1.5 sm:py-2.5 uppercase text-surface-page transition-colors"
                               : "rounded-[14px] px-2.5 sm:px-5 py-1.5 sm:py-2.5 uppercase text-white/70 transition-colors hover:bg-brand-green/10"
                         }
                         style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 12, letterSpacing: '0.06em' }}
                      >
                         {value === 'open' ? t("friend.filterOpen") : t("friend.filterAll")}
                      </button>
                   );
                })}
             </div>

             <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                title={t("friend.refresh")}
                aria-label={t("friend.refresh")}
                aria-busy={isFetching}
                className="flex aspect-square h-9 sm:h-11 items-center justify-center rounded-[20px] border-2 border-brand-green bg-transparent text-brand-green transition-colors hover:bg-brand-green/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
             >
                <RotateCcw className={cn("size-4 sm:size-5", isFetching && "animate-spin")} />
             </button>
          </div>
       </div>

       {/* List Content */}
       <div className="min-h-[300px]">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="size-8 animate-spin mb-2" />
                <p>{t("friend.findingMatches")}</p>
             </div>
          ) : filteredLobbies.length === 0 ? (
             <div
                className="flex flex-col items-center justify-center px-4 py-12 text-center border-2 border-brand-blue rounded-xl bg-brand-blue/[0.03] text-white/60"
                style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500 }}
             >
                <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-brand-blue/15 text-brand-blue">
                   <Filter className="size-6" />
                </div>
                <h3
                  className="max-w-xs uppercase text-white"
                  style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}
                >
                  {t("friend.noLobbiesFound")}
                </h3>
                <p className="mt-1 max-w-xs text-sm text-white/55">{t("friend.noLobbiesHint")}</p>
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
