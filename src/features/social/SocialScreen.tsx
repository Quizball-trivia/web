"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { UserRound, Search, UserPlus, Users, X, Loader2, Swords } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth.store";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/api";
import { getAccessToken } from "@/lib/auth/tokenStorage";
import { API_BASE_URL } from "@/lib/config";
import { tierFromRp } from "@/utils/rankedTier";
import type { paths } from "@/types/api.generated";

type SearchResultItem =
  paths["/api/v1/users/search"]["get"]["responses"][200]["content"]["application/json"]["results"][number];

type FriendStatus = "none" | "pending_sent" | "friends";

interface PlayerWithStatus extends SearchResultItem {
  friendStatus: FriendStatus;
}

async function searchPlayers(query: string): Promise<SearchResultItem[]> {
  const data = await apiFetch("get", "/api/v1/users/search", { query: { q: query } });
  return data.results;
}

// TODO: Replace with real API once backend implements GET /api/v1/friends
async function getMyFriends(): Promise<PlayerWithStatus[]> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}/api/v1/friends`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (res.status === 404) return [];
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError("Failed to load friends", res.status, data);
  }
  const data = await res.json();
  return (data.friends ?? []) as PlayerWithStatus[];
}

// TODO: Replace with real API once backend implements POST /api/v1/friends/requests
async function sendFriendRequest(targetUserId: string): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}/api/v1/friends/requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ targetUserId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError("Failed to send friend request", res.status, data);
  }
}

function PlayerCard({
  player,
  onSendRequest,
  onChallenge,
  isSendingRequest,
  friendStatus,
  index,
}: {
  player: SearchResultItem;
  onSendRequest?: (id: string) => void;
  onChallenge?: (id: string) => void;
  isSendingRequest?: boolean;
  friendStatus?: FriendStatus;
  index: number;
}) {
  const tier = tierFromRp(player.rp);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
      className="flex items-center gap-3 bg-[#1B2F36] rounded-2xl border-b-4 border-[#0D1B21] px-4 py-3"
    >
      {/* Avatar */}
      <div className="size-12 rounded-xl bg-[#243B44] border-2 border-[#1CB0F6]/20 flex items-center justify-center shrink-0 overflow-hidden">
        {player.avatarUrl ? (
          <img src={player.avatarUrl} alt={player.nickname ?? ""} className="size-full object-cover" />
        ) : (
          <UserRound className="size-6 text-[#56707A]" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-white truncate">{player.nickname ?? "Unknown"}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] font-bold text-[#56707A]">Lvl {player.level}</span>
          <span className="text-[11px] font-bold text-[#56707A]">·</span>
          <span className="text-[11px] font-bold text-[#CE82FF]">{tier}</span>
          <span className="text-[11px] font-bold text-[#56707A]">·</span>
          <span className="text-[11px] font-bold text-[#FFD700]">{player.rp} RP</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {onChallenge && (
          <button
            type="button"
            onClick={() => onChallenge(player.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1CB0F6]/15 border border-[#1CB0F6]/25 text-[#7FD8FF] text-[11px] font-black uppercase tracking-wide hover:bg-[#1CB0F6]/25 transition-colors"
          >
            <Swords className="size-3.5" />
            Challenge
          </button>
        )}
        {onSendRequest && (
          <>
            {friendStatus === "none" && (
              <button
                type="button"
                onClick={() => onSendRequest(player.id)}
                disabled={isSendingRequest}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#58CC02]/15 border border-[#58CC02]/25 text-[#58CC02] text-[11px] font-black uppercase tracking-wide hover:bg-[#58CC02]/25 transition-colors disabled:opacity-50"
              >
                {isSendingRequest ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <UserPlus className="size-3.5" />
                )}
                Add
              </button>
            )}
            {friendStatus === "pending_sent" && (
              <span className="px-3 py-2 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] text-[11px] font-black uppercase tracking-wide">
                Sent
              </span>
            )}
            {friendStatus === "friends" && (
              <span className="px-3 py-2 rounded-xl bg-[#56707A]/15 border border-[#56707A]/20 text-[#56707A] text-[11px] font-black uppercase tracking-wide">
                Friends
              </span>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

type Tab = "friends" | "find";

export function SocialScreen() {
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<Tab>("friends");

  // Friends tab
  const [friends, setFriends] = useState<PlayerWithStatus[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);

  // Find Players tab
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sentRequestIds, setSentRequestIds] = useState<Set<string>>(new Set());
  const [pendingRequestIds, setPendingRequestIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFriendsLoading(true);
    getMyFriends()
      .then((data) => { if (!cancelled) setFriends(data); })
      .catch(() => { if (!cancelled) setFriends([]); })
      .finally(() => { if (!cancelled) setFriendsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchPlayers(query.trim());
        setSearchResults(results.filter((r) => r.id !== authUser?.id));
      } catch {
        setSearchError("Search failed. Please try again.");
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, authUser?.id]);

  const handleSendRequest = async (targetId: string) => {
    if (pendingRequestIds.has(targetId) || sentRequestIds.has(targetId)) return;
    setPendingRequestIds((prev) => new Set(prev).add(targetId));
    try {
      await sendFriendRequest(targetId);
      setSentRequestIds((prev) => new Set(prev).add(targetId));
      toast.success("Friend request sent!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send request");
    } finally {
      setPendingRequestIds((prev) => { const s = new Set(prev); s.delete(targetId); return s; });
    }
  };

  const getFriendStatus = (id: string): FriendStatus => {
    if (sentRequestIds.has(id)) return "pending_sent";
    return "none";
  };

  return (
    <div className="min-h-screen font-fun">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-sm border-b-2 border-[#1B2F36]">
        <div className="max-w-2xl lg:max-w-3xl mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center gap-3">
            <div className="size-9 md:size-10 rounded-xl bg-[#1CB0F6]/15 border-2 border-[#1CB0F6]/30 flex items-center justify-center">
              <Users className="size-4 md:size-5 text-[#1CB0F6]" />
            </div>
            <h1 className="text-base md:text-xl font-black text-white uppercase tracking-wide">
              Social
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl lg:max-w-3xl mx-auto px-3 md:px-4 py-4 md:py-6 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 bg-[#1B2F36] rounded-2xl p-1.5 border-b-4 border-[#0D1B21]">
          {(["friends", "find"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide transition-all ${
                activeTab === tab
                  ? "bg-[#1CB0F6] text-white shadow-sm"
                  : "text-[#56707A] hover:text-white"
              }`}
            >
              {tab === "friends" ? (
                <>
                  <Users className="size-4" />
                  Friends
                  {friends.length > 0 && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === tab ? "bg-white/20" : "bg-[#243B44]"}`}>
                      {friends.length}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Search className="size-4" />
                  Find Players
                </>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "friends" ? (
            <motion.div
              key="friends"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {friendsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-8 text-[#1CB0F6] animate-spin" />
                </div>
              ) : friends.length === 0 ? (
                <div className="bg-[#1B2F36] rounded-2xl border-b-4 border-[#0D1B21] p-8 text-center">
                  <div className="size-16 rounded-2xl bg-[#243B44] border-2 border-[#56707A]/20 flex items-center justify-center mx-auto mb-4">
                    <Users className="size-8 text-[#56707A]" />
                  </div>
                  <h3 className="text-base font-black text-white uppercase mb-2">No friends yet</h3>
                  <p className="text-sm text-[#56707A] font-semibold mb-5">
                    Search for players and send them a friend request!
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("find")}
                    className="px-5 py-2.5 rounded-xl bg-[#1CB0F6] border-b-[3px] border-[#14627F] text-white text-sm font-black uppercase tracking-wide hover:bg-[#1A9FE0] active:border-b-[1px] active:translate-y-[2px] transition-all"
                  >
                    Find Players
                  </button>
                </div>
              ) : (
                friends.map((friend, index) => (
                  <PlayerCard
                    key={friend.id}
                    player={friend}
                    index={index}
                    friendStatus={friend.friendStatus}
                    onChallenge={(id) => router.push(`/profile/${id}`)}
                  />
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="find"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#56707A]" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by username..."
                  className="w-full bg-[#1B2F36] border-2 border-[#243B44] focus:border-[#1CB0F6] rounded-2xl pl-10 pr-10 py-3 text-sm font-semibold text-white placeholder:text-[#56707A] outline-none transition-colors"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#56707A] hover:text-white transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {/* Results */}
              {isSearching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-7 text-[#1CB0F6] animate-spin" />
                </div>
              ) : searchError ? (
                <div className="bg-[#1B2F36] rounded-2xl border-b-4 border-[#0D1B21] p-6 text-center">
                  <p className="text-sm font-bold text-[#FF4B4B]">{searchError}</p>
                </div>
              ) : query && searchResults.length === 0 ? (
                <div className="bg-[#1B2F36] rounded-2xl border-b-4 border-[#0D1B21] p-8 text-center">
                  <div className="size-14 rounded-2xl bg-[#243B44] border-2 border-[#56707A]/20 flex items-center justify-center mx-auto mb-3">
                    <UserRound className="size-7 text-[#56707A]" />
                  </div>
                  <p className="text-sm font-black text-white uppercase mb-1">No players found</p>
                  <p className="text-xs font-semibold text-[#56707A]">Try a different username</p>
                </div>
              ) : !query ? (
                <div className="bg-[#1B2F36] rounded-2xl border-b-4 border-[#0D1B21] p-8 text-center">
                  <div className="size-14 rounded-2xl bg-[#1CB0F6]/15 border-2 border-[#1CB0F6]/25 flex items-center justify-center mx-auto mb-3">
                    <Search className="size-7 text-[#1CB0F6]" />
                  </div>
                  <p className="text-sm font-black text-white uppercase mb-1">Find your rivals</p>
                  <p className="text-xs font-semibold text-[#56707A]">Search for a player to add them as a friend</p>
                </div>
              ) : (
                searchResults.map((player, index) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    index={index}
                    friendStatus={getFriendStatus(player.id)}
                    onSendRequest={handleSendRequest}
                    isSendingRequest={pendingRequestIds.has(player.id)}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
