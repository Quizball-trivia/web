"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuthStore } from "@/stores/auth.store";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { useGameSessionStore } from "@/stores/gameSession.store";
import { useStoreWallet } from "@/lib/queries/store.queries";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { AppLogo } from "@/components/AppLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Trophy,
  Medal,
  Gem,
  User,
  Settings,
  Gamepad2,
  Menu,
  Home,
  Coins,
  Ticket,
  Bell,
  LogOut,
  Briefcase,
  ArrowRight,
  X,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSocket } from "@/lib/realtime/socket-client";

const NAV_ITEMS = [
  { path: "/play", label: "Play", icon: Gamepad2 },
  { path: "/leaderboard", label: "Leaderboard", icon: Medal },
  { path: "/play/friend?tab=browse", label: "Lobbies", icon: Users, exact: true },
  { path: "/events", label: "Events", icon: Trophy },
  { path: "/store", label: "Store", icon: Gem },
  { path: "/profile", label: "Profile", icon: User },
  { path: "/settings", label: "Settings", icon: Settings },
] as const;

const MOBILE_NAV_ITEMS = [
  { path: "/", label: "Home", icon: Home },
  { path: "/leaderboard", label: "Leaderboard", icon: Medal },
  { path: "/play/friend?tab=browse", label: "Lobbies", icon: Users, exact: true },
  { path: "/store", label: "Store", icon: Gem },
  { path: "/profile", label: "Profile", icon: User },
] as const;

const HIDE_NAV_PATHS = ["/game", "/onboarding"];
const HEADER_PATHS = ["/", "/play", "/events", "/leaderboard", "/profile", "/store", "/career"];

type AppShellProps = {
  children: React.ReactNode;
};

type RankedGeoHintDebug = {
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  source?: string;
};

function isRankedGeoHintDebug(value: unknown): value is RankedGeoHintDebug {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RankedGeoHintDebug>;
  const isMaybeString = (input: unknown) => input === undefined || typeof input === "string";
  const isMaybeNumber = (input: unknown) => input === undefined || typeof input === "number";
  return (
    isMaybeString(candidate.city) &&
    isMaybeString(candidate.region) &&
    isMaybeString(candidate.country) &&
    isMaybeString(candidate.countryCode) &&
    isMaybeNumber(candidate.latitude) &&
    isMaybeNumber(candidate.longitude) &&
    isMaybeString(candidate.source)
  );
}

function readRankedGeoHintDebug(): RankedGeoHintDebug | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("ranked_geo_hint_v1");
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isRankedGeoHintDebug(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { player: playerStats } = usePlayer();
  const { data: storeWallet } = useStoreWallet();
  const logout = useAuthStore((state) => state.logout);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const lobby = useRealtimeMatchStore((state) => state.lobby);
  const sessionState = useRealtimeMatchStore((state) => state.sessionState);
  const rejoinMatch = useRealtimeMatchStore((state) => state.rejoinMatch);
  const clearRejoinAvailable = useRealtimeMatchStore((state) => state.clearRejoinAvailable);
  const resetRealtime = useRealtimeMatchStore((state) => state.reset);
  const startSession = useGameSessionStore((state) => state.startSession);
  const setGameStage = useGameSessionStore((state) => state.setStage);
  const [socketConnected, setSocketConnected] = useState(() => getSocket().connected);
  const [rankedGeoHintDebug, setRankedGeoHintDebug] = useState<RankedGeoHintDebug | null>(
    () => readRankedGeoHintDebug()
  );

  const currentPath = pathname ?? "/";
  const showHeader = HEADER_PATHS.some((p) => p === "/" ? currentPath === "/" : currentPath.startsWith(p));
  const showNav = !HIDE_NAV_PATHS.some((path) => currentPath.startsWith(path));
  const inLobbyRoom = currentPath.startsWith("/friend/room");
  const showLobbyBanner = !!lobby && lobby.status === "waiting" && !inLobbyRoom;
  const showRejoinBanner = !!rejoinMatch && !currentPath.startsWith("/game");
  const lobbyCode = lobby?.inviteCode ?? "";
  const showLobbyDebug = process.env.NODE_ENV !== "production";
  const localWaitingLobbyId = lobby?.status === "waiting" ? lobby.lobbyId : null;
  const sessionWaitingLobbyId = sessionState?.waitingLobbyId ?? null;
  const lobbyDebugMismatch = localWaitingLobbyId !== sessionWaitingLobbyId;
  const sessionStateLabel = sessionState?.state ?? "NO_SESSION";
  const navbarCoins = storeWallet?.coins ?? playerStats.coins;
  const navbarTickets = storeWallet?.tickets ?? (playerStats.tickets ?? 0);

  useEffect(() => {
    const socket = getSocket();
    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  useEffect(() => {
    const sync = () => setRankedGeoHintDebug(readRankedGeoHintDebug());
    window.addEventListener("storage", sync);
    const intervalId = window.setInterval(sync, 1500);
    return () => {
      window.removeEventListener("storage", sync);
      window.clearInterval(intervalId);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace("/auth/welcome");
  };

  const isPathActive = (path: string, exact?: boolean) => {
    if (path === "/") return currentPath === "/";
    const basePath = path.split("?")[0];
    if (exact) return currentPath === basePath;
    return currentPath === basePath || currentPath.startsWith(`${basePath}/`);
  };

  const handleReturnToLobby = () => {
    if (!lobbyCode) return;
    router.push(`/friend/room/${lobbyCode}`);
  };

  const handleLeaveLobby = () => {
    getSocket().emit("lobby:leave");
    resetRealtime();
  };

  const handleRejoinMatch = () => {
    if (!rejoinMatch) return;

    const matchId = rejoinMatch.matchId;

    startSession({
      mode: rejoinMatch.mode === "ranked" ? "ranked" : "quizball",
      matchType: rejoinMatch.mode === "ranked" ? "ranked" : "friendly",
      questionCount: 10,
      opponentId: rejoinMatch.opponent.id,
      opponentUsername: rejoinMatch.opponent.username,
      opponentAvatar: rejoinMatch.opponent.avatarUrl ?? undefined,
    });
    // Avoid re-entering matchmaking queue on rejoin.
    setGameStage("playing");

    // Emit rejoin request to server
    getSocket().emit("match:rejoin", { matchId });

    // Immediately clear rejoin state to prevent duplicate emissions and banner reappearance
    clearRejoinAvailable();

    router.push("/game");
  };

  const handleForfeitRejoin = () => {
    if (!rejoinMatch) {
      clearRejoinAvailable();
      return;
    }
    getSocket().emit("match:forfeit", { matchId: rejoinMatch.matchId });
    clearRejoinAvailable();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* DESKTOP LAYOUT (>= md) */}
      <div className="hidden md:flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={cn(
            "flex flex-col bg-card border-r border-border transition-all duration-300 h-screen sticky top-0",
            isCollapsed ? "w-20" : "w-64",
          )}
        >
          {/* Sidebar Header */}
          <div className="h-16 flex items-center px-4 border-b border-border/50">
            <div
              className={cn(
                "flex items-center gap-3 overflow-hidden",
                isCollapsed && "justify-center w-full",
              )}
            >
              <Link href="/" className="hover:opacity-80 transition-opacity">
                {isCollapsed ? <AppLogo size="sm" iconOnly /> : <AppLogo size="sm" />}
              </Link>
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-6">
            <nav className="space-y-2 px-3">
              {NAV_ITEMS.map((item) => {
                const isActive = isPathActive(item.path, 'exact' in item ? item.exact : undefined);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={cn(
                      "w-full flex items-center gap-3 py-2 px-4 rounded-lg transition-all",
                      isCollapsed ? "justify-center px-0" : "justify-start",
                      isActive
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <item.icon className="size-5 shrink-0" />
                    {!isCollapsed && (
                      <span className="font-medium truncate">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Collapse Toggle */}
          <div className="p-4 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "w-full text-muted-foreground hover:text-foreground",
                isCollapsed ? "justify-center" : "justify-start gap-3",
              )}
            >
              <Menu className="size-5" />
              {!isCollapsed && <span>Collapse</span>}
            </Button>
          </div>
        </aside>

        {/* Main Wrapper */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* TopBar */}
          <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6">
            <div className="flex-1" />

            <div className="flex items-center gap-4">
              {showLobbyDebug && (
                <div
                  className={cn(
                    "hidden lg:flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold",
                    lobbyDebugMismatch
                      ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                      : "border-slate-500/40 bg-slate-500/15 text-slate-200"
                  )}
                  title="Temporary lobby/session debug badge"
                >
                  <span>LobbyDbg</span>
                  <span>local:{localWaitingLobbyId ? localWaitingLobbyId.slice(0, 6) : "-"}</span>
                  <span>session:{sessionWaitingLobbyId ? sessionWaitingLobbyId.slice(0, 6) : "-"}</span>
                  <span>state:{sessionStateLabel}</span>
                  <span>
                    loc:{rankedGeoHintDebug?.city ?? "-"},
                    {rankedGeoHintDebug?.countryCode ?? rankedGeoHintDebug?.country ?? "-"}
                  </span>
                  <span>
                    ll:
                    {typeof rankedGeoHintDebug?.latitude === "number"
                      ? rankedGeoHintDebug.latitude.toFixed(2)
                      : "-"},
                    {typeof rankedGeoHintDebug?.longitude === "number"
                      ? rankedGeoHintDebug.longitude.toFixed(2)
                      : "-"}
                  </span>
                  <span>src:{rankedGeoHintDebug?.source ?? "-"}</span>
                </div>
              )}
              {/* Currencies */}
              <div className="flex items-center gap-3 mr-4">
                {/* Coins */}
                <Link
                  href="/store"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 transition-all active:scale-95"
                >
                  <Coins className="size-4 text-yellow-500" />
                  <span className="text-sm font-bold text-yellow-500">
                    {navbarCoins.toLocaleString()}
                  </span>
                </Link>

                {/* Tickets */}
                <Link
                  href="/store"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all active:scale-95"
                >
                  <Ticket className="size-4 text-primary" />
                  <span className="text-sm font-bold text-primary">
                    {navbarTickets}
                  </span>
                </Link>
              </div>

              <div className="h-6 w-px bg-border/50" />

              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-muted-foreground hover:text-foreground"
              >
                <Bell className="size-5" />
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full p-0 overflow-hidden ring-2 ring-transparent hover:ring-primary/20 transition-all"
                  >
                    <AvatarDisplay
                      customization={playerStats.avatarCustomization || { base: playerStats.avatar }}
                      size="sm"
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {playerStats.username}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        Level {playerStats.level} · {playerStats.rankPoints} RP
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-500 focus:text-red-500 dark:focus:text-red-400"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {showRejoinBanner && (
              <div className="px-6 pt-4">
                <div className="rounded-2xl border border-blue-500/35 bg-gradient-to-r from-blue-500/15 to-cyan-400/15 px-5 py-4 shadow-[0_8px_30px_rgba(59,130,246,0.2)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                        <Gamepad2 className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-blue-100">
                          Match still active against{" "}
                          <span className="text-foreground">{rejoinMatch?.opponent.username ?? "Opponent"}</span>
                        </p>
                        <p className="text-xs text-blue-200/80">
                          Rejoin now to continue the game
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-9 bg-blue-500 text-blue-950 hover:bg-blue-400"
                        onClick={handleRejoinMatch}
                      >
                        Rejoin Match <ArrowRight className="ml-2 size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 border-red-500/40 text-red-200 hover:bg-red-500/10"
                        onClick={handleForfeitRejoin}
                      >
                        Forfeit <X className="ml-2 size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {showLobbyBanner && (
              <div className="px-6 pt-4">
                <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 to-lime-400/15 px-5 py-4 shadow-[0_8px_30px_rgba(16,185,129,0.15)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                        <Gamepad2 className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-100">
                          You’re still in{" "}
                          <span className="text-foreground">{lobby?.displayName ?? "a lobby"}</span>
                        </p>
                        <p className="text-xs text-emerald-200/80">
                          Code{" "}
                          <span className="font-mono font-bold text-emerald-50">{lobbyCode || "..."}</span>
                          {!socketConnected && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                              Reconnecting…
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-9 bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                        onClick={handleReturnToLobby}
                        disabled={!lobbyCode}
                      >
                        Return to Lobby <ArrowRight className="ml-2 size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 border-emerald-500/30 text-emerald-100 hover:bg-emerald-500/10"
                        onClick={handleLeaveLobby}
                      >
                        Leave <X className="ml-2 size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <main className="p-6">
              {children}
            </main>
          </div>
        </div>
      </div>

      {/* MOBILE LAYOUT (< md) */}
      <div className="flex flex-col min-h-screen md:hidden">
        {/* Header */}
        {showHeader && (
          <div className="border-b bg-card">
            <div className="px-4 py-4 bg-background">
              {showLobbyDebug && (
                <div
                  className={cn(
                    "mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-semibold",
                    lobbyDebugMismatch
                      ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                      : "border-slate-500/40 bg-slate-500/15 text-slate-200"
                  )}
                >
                  <span>LobbyDbg</span>
                  <span>local:{localWaitingLobbyId ? localWaitingLobbyId.slice(0, 6) : "-"}</span>
                  <span>session:{sessionWaitingLobbyId ? sessionWaitingLobbyId.slice(0, 6) : "-"}</span>
                  <span>state:{sessionStateLabel}</span>
                  <span>
                    loc:{rankedGeoHintDebug?.city ?? "-"},
                    {rankedGeoHintDebug?.countryCode ?? rankedGeoHintDebug?.country ?? "-"}
                  </span>
                  <span>
                    ll:
                    {typeof rankedGeoHintDebug?.latitude === "number"
                      ? rankedGeoHintDebug.latitude.toFixed(2)
                      : "-"},
                    {typeof rankedGeoHintDebug?.longitude === "number"
                      ? rankedGeoHintDebug.longitude.toFixed(2)
                      : "-"}
                  </span>
                  <span>src:{rankedGeoHintDebug?.source ?? "-"}</span>
                </div>
              )}
              <div className="flex items-center justify-between mb-3 relative">
                <div className="flex items-center gap-2 z-10">
                  {currentPath === "/" ? (
                    <Link href="/profile" className="flex items-center gap-2">
                      <div className="size-10 rounded-full bg-gradient-to-br from-primary/20 to-transparent border-2 border-primary/30 flex items-center justify-center overflow-hidden">
                        <div className="text-xl">
                          <AvatarDisplay
                            customization={playerStats.avatarCustomization || { base: playerStats.avatar }}
                            size="sm"
                          />
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold">
                          {playerStats.username}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Level {playerStats.level}
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <AppLogo size="sm" iconOnly />
                  )}
                </div>

                <div className="flex items-center gap-2 z-10">
                  {/* Coins */}
                  <Link
                    href="/store"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 transition-colors active:scale-95"
                  >
                    <Coins className="size-4 text-yellow-500" />
                    <span className="text-sm">
                      {navbarCoins.toLocaleString()}
                    </span>
                  </Link>

                  {/* Tickets */}
                  <Link
                    href="/store"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors active:scale-95"
                  >
                    <Ticket className="size-4 text-primary" />
                    <span className="text-sm">{navbarTickets}</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20">
          {showRejoinBanner && (
            <div className="px-4 pt-4">
              <div className="rounded-2xl border border-blue-500/35 bg-gradient-to-r from-blue-500/15 to-cyan-400/15 px-4 py-3 shadow-[0_8px_30px_rgba(59,130,246,0.2)]">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Gamepad2 className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-100">
                        Match active vs{" "}
                        <span className="text-foreground">{rejoinMatch?.opponent.username ?? "Opponent"}</span>
                      </p>
                      <p className="text-xs text-blue-200/80">
                        Rejoin to continue
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-10 bg-blue-500 text-blue-950 hover:bg-blue-400"
                      onClick={handleRejoinMatch}
                    >
                      Rejoin
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-10 border-red-500/40 text-red-200 hover:bg-red-500/10"
                      onClick={handleForfeitRejoin}
                    >
                      Forfeit
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {showLobbyBanner && (
            <div className="px-4 pt-4">
              <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 to-lime-400/15 px-4 py-3 shadow-[0_8px_30px_rgba(16,185,129,0.15)]">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                      <Gamepad2 className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-100">
                        You’re still in{" "}
                        <span className="text-foreground">{lobby?.displayName ?? "a lobby"}</span>
                      </p>
                      <p className="text-xs text-emerald-200/80">
                        Code{" "}
                        <span className="font-mono font-bold text-emerald-50">{lobbyCode || "..."}</span>
                        {!socketConnected && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                            Reconnecting…
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-10 bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                      onClick={handleReturnToLobby}
                      disabled={!lobbyCode}
                    >
                      Return
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-10 border-emerald-500/30 text-emerald-100 hover:bg-emerald-500/10"
                      onClick={handleLeaveLobby}
                    >
                      Leave
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {children}
        </main>

        {/* Sticky Play Button - Only on Home Screen */}
        {currentPath === "/" && (
          <div className="fixed bottom-16 left-0 right-0 z-30 bg-background border-t border-border/50">
            <div className="px-4 pt-3.5 pb-3 flex justify-center">
              <Button
                onClick={() => router.push("/play")}
                size="lg"
                className="w-11/12 h-12 shadow-lg shadow-primary/20"
              >
                Play
              </Button>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        {showNav && (
          <div className="fixed bottom-0 left-0 right-0 z-20 bg-background border-t border-border/50">
            <nav className="flex justify-around px-2 py-2">
              {MOBILE_NAV_ITEMS.map((item) => {
                const isActive = isPathActive(item.path, 'exact' in item ? item.exact : undefined);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={cn(
                      "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors",
                      isActive ? "text-primary bg-secondary" : "text-muted-foreground",
                    )}
                  >
                    <item.icon className="size-5" />
                    <span className="text-xs">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
