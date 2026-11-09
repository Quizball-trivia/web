import { useState, useMemo } from "react";
import { Search, RotateCcw, Filter, Plus } from "lucide-react";
import { usePublicLobbies } from "@/lib/queries/lobbies.queries";
import { LobbyCard } from "./LobbyCard";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";

interface LobbyBrowsePanelProps {
  onJoin: (inviteCode: string) => void;
  isJoiningCode?: string | null;
  onActionTriggered?: () => void;
  /** Shown as the empty state's way forward: no open rooms means "make one". */
  onCreateRoom?: () => void;
}

export function LobbyBrowsePanel({ onJoin, isJoiningCode, onActionTriggered, onCreateRoom }: LobbyBrowsePanelProps) {
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
             <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/45" aria-hidden />
             <input
                type="search"
                aria-label={t("friend.searchRoomsPlaceholder")}
                placeholder={t("friend.searchRoomsPlaceholder")}
                className="h-11 sm:h-12 w-full rounded-[14px] border border-white/15 bg-surface-deep pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-white/40 focus:border-brand-blue disabled:opacity-50 [&::-webkit-search-cancel-button]:hidden"
                style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500 }}
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
                {onCreateRoom && (
                  <button
                    type="button"
                    onClick={onCreateRoom}
                    className="mt-5 flex h-11 items-center justify-center gap-2 rounded-[14px] bg-brand-yellow px-5 text-sm font-semibold uppercase tracking-[0.04em] text-black transition-colors hover:bg-brand-yellow/90"
                  >
                    <Plus className="size-4" strokeWidth={3} />
                    {t("friend.createRoom")}
                  </button>
                )}
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
