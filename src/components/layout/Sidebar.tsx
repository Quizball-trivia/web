import { Trophy, BarChart3, ShoppingBag, User, Settings, Gamepad2, Menu } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Screen } from '@/types/screens';
import { cn } from '@/components/ui/utils';
import { useState } from 'react';

interface SidebarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  className?: string;
}

const NAV_ITEMS = [
  { id: 'modeSelection', label: 'Play', icon: Gamepad2 },
  { id: 'tournaments', label: 'Events', icon: Trophy },
  { id: 'leaderboard', label: 'Ranks', icon: BarChart3 },
  { id: 'store', label: 'Store', icon: ShoppingBag },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

export function Sidebar({ currentScreen, onNavigate, className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div 
      className={cn(
        "flex flex-col bg-card border-r border-border transition-all duration-300 h-screen sticky top-0",
        isCollapsed ? "w-20" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center px-4 border-b border-border/50">
        <div className={cn("flex items-center gap-3 overflow-hidden", isCollapsed && "justify-center w-full")}>
           <button onClick={() => onNavigate('home')} className="hover:opacity-80 transition-opacity">
               {isCollapsed ? (
                 <AppLogo size="sm" iconOnly />
               ) : (
                 <AppLogo size="sm" />
               )}
           </button>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-6">
        <nav className="space-y-2 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = currentScreen === item.id || 
              (item.id === 'modeSelection' && ['home', 'game', 'matchmaking', 'quizBall', 'matchType', 'friendMatch', 'rankedMatchmaking'].includes(currentScreen));

            return (
              <Button
                key={item.id}
                variant="ghost"
                onClick={() => onNavigate(item.id as Screen)}
                className={cn(
                  "w-full flex items-center gap-3 transition-all",
                  isCollapsed ? "justify-center px-0" : "justify-start px-4",
                  isActive 
                    ? "bg-primary/10 text-primary hover:bg-primary/20" 
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className="size-5 shrink-0" />
                {!isCollapsed && (
                  <span className="font-medium truncate">{item.label}</span>
                )}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer / Collapse Toggle */}
      <div className="p-4 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "w-full text-muted-foreground hover:text-foreground",
            isCollapsed ? "justify-center" : "justify-start gap-3"
          )}
        >
          <Menu className="size-5" />
          {!isCollapsed && <span>Collapse</span>}
        </Button>
      </div>
    </div>
  );
}
