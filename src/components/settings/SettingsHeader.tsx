import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuthStore } from "@/stores/auth.store";
import { Flame, Trophy } from "lucide-react";

interface SettingsHeaderProps {
  /** Year/date when the user joined (e.g., 2024 or "Jan 2024") */
  memberSince?: string | number;
  /** User's current division (e.g., "Div 5", "Gold", etc.) */
  division?: string;
  /** Current streak count in days */
  streak?: number;
}

export function SettingsHeader({
  memberSince,
  division,
  streak,
}: SettingsHeaderProps) {
  const { player } = usePlayer();
  const user = useAuthStore((state) => state.user);

  // Use auth user data if available, fallback to player context
  const displayName = user?.nickname ?? player.username;
  const avatarUrl = user?.avatar_url ?? player.avatar;

  // Use XP from player context
  const playerXp = player.xp ?? 0;
  const level = Math.floor(playerXp / 1000) + 1;
  const currentXp = playerXp % 1000;
  const nextLevelXp = 1000;
  const progress = (currentXp / nextLevelXp) * 100;

  // TODO: Fetch memberSince from user profile API (e.g., user.created_at)
  const displayMemberSince = memberSince ?? "Member";
  // TODO: Fetch division from player stats or ranking API
  const displayDivision = division ?? "Unranked";
  // TODO: Fetch streak from player stats API (e.g., player.currentStreak)
  const displayStreak = streak ?? 0;

  return (
    <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-gradient-to-br from-card to-card/50 border border-border rounded-2xl shadow-sm mb-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      {/* Avatar */}
      <div className="relative shrink-0">
         <Avatar className="size-24 border-4 border-background shadow-xl">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="text-2xl font-bold bg-primary/20 text-primary">
               {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
         </Avatar>
         <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-background border border-primary text-primary shadow-sm whitespace-nowrap">
            Lvl {level}
         </Badge>
      </div>

      {/* Info */}
      <div className="flex-1 text-center md:text-left space-y-2 relative z-10 w-full">
         <div>
            <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
            <p className="text-muted-foreground text-sm">
              {typeof displayMemberSince === 'number'
                ? `Member since ${displayMemberSince}`
                : displayMemberSince}
            </p>
         </div>

         {/* Stats Row */}
         <div className="flex items-center justify-center md:justify-start gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm font-medium bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full border border-yellow-500/20">
               <Trophy className="size-3.5" />
               <span>{displayDivision}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-medium bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full border border-orange-500/20">
               <Flame className="size-3.5" />
               <span>{displayStreak} Day Streak</span>
            </div>
         </div>

         {/* XP Progress - Simplified */}
         <div className="max-w-xs mx-auto md:mx-0 pt-2">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1 uppercase font-bold tracking-wider">
               <span>XP Progress</span>
               <span>{currentXp} / {nextLevelXp}</span>
            </div>
            <Progress value={progress} className="h-2" />
         </div>
      </div>
    </div>
  );
}
