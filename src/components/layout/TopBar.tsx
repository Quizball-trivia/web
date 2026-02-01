import { Coins, Ticket, Bell, LogOut, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PlayerStats } from '@/types/game';
import type { Screen } from '@/types/screens';

interface TopBarProps {
  playerStats: PlayerStats;
  onNavigate: (screen: Screen) => void;
  onNavigateToStore: () => void;
}

export function TopBar({ playerStats, onNavigate, onNavigateToStore }: TopBarProps) {
  return (
    <div className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6">
      {/* Left items - Breadcrumbs or Context Title could go here */}
      <div className="flex-1" />

      {/* Right Utility Items */}
      <div className="flex items-center gap-4">
        {/* Currencies */}
        <div className="flex items-center gap-3 mr-4">
          <button
            onClick={onNavigateToStore}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 transition-all active:scale-95"
          >
            <Coins className="size-4 text-yellow-500" />
            <span className="text-sm font-bold text-yellow-500">{playerStats.coins.toLocaleString()}</span>
          </button>

          <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all active:scale-95">
            <Ticket className="size-4 text-primary" />
            <span className="text-sm font-bold text-primary">{playerStats.tickets ?? 10}</span>
          </button>
        </div>

        <div className="h-6 w-px bg-border/50" />

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
          <Bell className="size-5" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 overflow-hidden ring-2 ring-transparent hover:ring-primary/20 transition-all">
               <AvatarDisplay
                  customization={playerStats.avatarCustomization || { base: playerStats.avatar }}
                  size="sm"
                />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{playerStats.username}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  Level {playerStats.level} · {playerStats.rankPoints} RP
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onNavigate('profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate('settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-500 focus:text-red-500 dark:focus:text-red-400">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
