"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuthStore } from "@/stores/auth.store";
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
  BarChart3,
  ShoppingBag,
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
  Flame,
} from "lucide-react";
import { cn } from "@/components/ui/utils";

const NAV_ITEMS = [
  { path: "/play", label: "Play", icon: Gamepad2 },
  { path: "/events", label: "Events", icon: Trophy },
  { path: "/leaderboard", label: "Ranks", icon: BarChart3 },
  { path: "/store", label: "Store", icon: ShoppingBag },
  { path: "/career", label: "Career", icon: Briefcase },
  { path: "/profile", label: "Profile", icon: User },
  { path: "/settings", label: "Settings", icon: Settings },
] as const;

const MOBILE_NAV_ITEMS = [
  { path: "/", label: "Home", icon: Home },
  { path: "/events", label: "Events", icon: Trophy },
  { path: "/leaderboard", label: "Ranks", icon: BarChart3 },
  { path: "/store", label: "Store", icon: ShoppingBag },
  { path: "/profile", label: "Profile", icon: User },
] as const;

const HIDE_NAV_PATHS = ["/game", "/onboarding"];
const HEADER_PATHS = ["/", "/events", "/leaderboard", "/profile", "/store"];

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { player: playerStats } = usePlayer();
  const logout = useAuthStore((state) => state.logout);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const currentPath = pathname ?? "/";
  const showHeader = HEADER_PATHS.includes(currentPath);
  const showNav = !HIDE_NAV_PATHS.some((path) => currentPath.startsWith(path));

  const handleLogout = async () => {
    await logout();
    router.replace("/auth/login");
  };

  const isPathActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath === path || currentPath.startsWith(`${path}/`);
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
                const isActive = isPathActive(item.path);
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
              {/* Currencies & Streak */}
              <div className="flex items-center gap-3 mr-4">
                {/* Streak */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
                  <Flame className="size-4 text-orange-500" />
                  <span className="text-xs text-orange-500/80 font-medium">Streak</span>
                  <span className="text-sm font-bold text-orange-500">
                    {playerStats.currentStreak ?? 0}
                  </span>
                </div>

                {/* Coins */}
                <Link
                  href="/store"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 transition-all active:scale-95"
                >
                  <Coins className="size-4 text-yellow-500" />
                  <span className="text-sm font-bold text-yellow-500">
                    {playerStats.coins.toLocaleString()}
                  </span>
                </Link>

                {/* Tickets */}
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all active:scale-95">
                  <Ticket className="size-4 text-primary" />
                  <span className="text-sm font-bold text-primary">
                    {playerStats.tickets ?? 10}
                  </span>
                </button>
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
          <main className="flex-1 overflow-y-auto bg-background/50 p-6 scrollbar-hide">
            {children}
          </main>
        </div>
      </div>

      {/* MOBILE LAYOUT (< md) */}
      <div className="flex flex-col min-h-screen md:hidden">
        {/* Header */}
        {showHeader && (
          <div className="border-b bg-card sticky top-0 z-10">
            <div className="px-4 py-4 bg-background">
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
                    <AppLogo size="sm" />
                  )}
                </div>

                <div className="flex items-center gap-2 z-10">
                  {/* Streak */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30">
                    <Flame className="size-4 text-orange-500" />
                    <span className="text-sm font-bold text-orange-500">
                      {playerStats.currentStreak ?? 0}
                    </span>
                  </div>

                  {/* Coins */}
                  <Link
                    href="/store"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 transition-colors active:scale-95"
                  >
                    <Coins className="size-4 text-yellow-500" />
                    <span className="text-sm">
                      {playerStats.coins.toLocaleString()}
                    </span>
                  </Link>

                  {/* Tickets */}
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors active:scale-95">
                    <Ticket className="size-4 text-primary" />
                    <span className="text-sm">{playerStats.tickets ?? 10}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20">{children}</main>

        {/* Sticky Play Button - Only on Home Screen */}
        {currentPath === "/" && (
          <div className="fixed bottom-16 left-0 right-0 z-30 bg-background/80 backdrop-blur-lg border-t border-border/50">
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
          <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/80 backdrop-blur-lg border-t border-border/50">
            <nav className="flex justify-around px-2 py-2">
              {MOBILE_NAV_ITEMS.map((item) => {
                const isActive = isPathActive(item.path);
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
