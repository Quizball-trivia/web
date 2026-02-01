import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, Target, Flame, Star, Award, Pencil, Check, X, 
  MapPin, Globe, Users, Clock, LogOut, type LucideIcon 
} from 'lucide-react';
import type { PlayerStats } from '@/types/game';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { getRankInfo, getDivisionColor } from '@/utils/rankSystem';
import * as LucideIcons from 'lucide-react';

interface ProfileWebProps {
  player: PlayerStats;
  onNameChange?: (newName: string) => void;
  onSignOut?: () => void;
}

export function ProfileWeb({ player, onNameChange, onSignOut }: ProfileWebProps) {
  const rankInfo = getRankInfo(player.rankPoints || 0);
  const divisionColors = getDivisionColor(rankInfo.division);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(player.username);

  const handleNameChange = () => {
    if (editedName.trim() !== player.username) {
      onNameChange?.(editedName.trim());
    }
    setIsEditingName(false);
  };

  // Mock data for things not in PlayerStats yet
  const recentMatches = [
    { id: 1, mode: 'Ranked 1v1', result: 'Win', rp: '+25', time: '2h ago', opponent: 'Striker99' },
    { id: 2, mode: 'Buzzer', result: 'Loss', rp: '-12', time: '5h ago', opponent: 'GoalKeeper' },
    { id: 3, mode: 'Daily Challenge', result: 'Win', rp: '+10', time: '1d ago', opponent: 'AI' },
  ];

  return (
    <div className="container mx-auto max-w-7xl px-6 py-8 space-y-8 animate-in fade-in duration-500">
      
      {/* 1. Header Section */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-card to-card/50 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-50" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Large Avatar */}
            <div className="size-32 rounded-full border-4 border-card bg-card shadow-2xl flex items-center justify-center overflow-hidden">
               <AvatarDisplay customization={player.avatarCustomization || { base: player.avatar }} size="xl" />
            </div>

            {/* User Info */}
            <div className="space-y-4">
               <div>
                  <div className="flex items-center gap-3">
                    {isEditingName ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="h-10 text-3xl font-bold bg-transparent border-b border-primary rounded-none focus-visible:ring-0 px-0 w-64"
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" onClick={handleNameChange}>
                          <Check className="size-5 text-green-500" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setIsEditingName(false)}>
                          <X className="size-5 text-red-500" />
                        </Button>
                      </div>
                    ) : (
                      <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
                        {player.username}
                        <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground">
                          <Pencil className="size-4" />
                        </button>
                      </h1>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground mt-1 text-lg">
                    <span className="font-medium text-foreground">Level {player.level}</span>
                    <span>•</span>
                    <span className={divisionColors.text}>{rankInfo.division} Division</span>
                  </div>
               </div>

               {/* Stats Row (Header) */}
               <div className="flex items-center gap-8 pt-2">
                  <div className="flex items-center gap-2">
                    <Target className="size-5 text-green-500" />
                    <span className="font-bold text-xl">
                      {player.gamesPlayed > 0 ? Math.round((player.correctAnswers / (player.gamesPlayed * 10)) * 100) : 0}%
                    </span>
                    <span className="text-sm text-muted-foreground uppercase tracking-wider">Accuracy</span>
                  </div>
                  
                  <div className="w-px h-8 bg-border" />

                  <div className="flex items-center gap-2">
                    <Flame className="size-5 text-orange-500" />
                    <span className="font-bold text-xl">{player.bestStreak}</span>
                    <span className="text-sm text-muted-foreground uppercase tracking-wider">Best Streak</span>
                  </div>

                  <div className="w-px h-8 bg-border" />

                  <div className="flex items-center gap-2">
                    <Star className="size-5 text-yellow-500" />
                    <span className="font-bold text-xl">{player.gamesPlayed}</span>
                    <span className="text-sm text-muted-foreground uppercase tracking-wider">Matches</span>
                  </div>
               </div>
            </div>
          </div>

          {/* RP Progress (Right side of header) */}
          <div className="w-80 space-y-3 bg-black/20 p-5 rounded-2xl border border-white/5 backdrop-blur-sm">
             <div className="flex justify-between items-end">
               <span className="text-sm font-medium text-muted-foreground">Rank Progress</span>
               <span className="text-xl font-bold text-primary">{player.rankPoints} <span className="text-sm text-muted-foreground font-normal">/ {rankInfo.maxRP} RP</span></span>
             </div>
             <Progress value={rankInfo.progress} className="h-2" />
             <div className="text-xs text-right text-muted-foreground">
               {rankInfo.pointsToNext} RP to next division
             </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* Left Column - Sticky Panel */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="sticky top-24 space-y-6">
            
            {/* Rank Card */}
            <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur">
              <div className={`h-2 bg-gradient-to-r ${divisionColors.gradient}`} />
              <CardContent className="pt-6 pb-8 flex flex-col items-center">
                 <div className="size-32 rounded-full bg-black/40 flex items-center justify-center mb-4 border border-white/10 shadow-inner">
                    <Trophy className={`size-16 ${divisionColors.text}`} />
                 </div>
                 <h2 className="text-2xl font-bold">{rankInfo.division}</h2>
                 <p className="text-muted-foreground mb-6">Current Season</p>

                 <div className="w-full space-y-4">
                   <div className="flex justify-between items-center px-4 py-3 bg-background/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Globe className="size-4 text-blue-400" />
                        <span className="font-medium">World Rank</span>
                      </div>
                      <span className="font-bold">#{player.rank}</span>
                   </div>
                   <div className="flex justify-between items-center px-4 py-3 bg-background/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <MapPin className="size-4 text-red-400" />
                        <span className="font-medium">Country</span>
                      </div>
                      <span className="font-bold">#12</span>
                   </div>
                   <div className="flex justify-between items-center px-4 py-3 bg-background/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="size-4 text-green-400" />
                        <span className="font-medium">Friends</span>
                      </div>
                      <span className="font-bold">#3</span>
                   </div>
                 </div>
              </CardContent>
            </Card>

            {/* Badges Preview */}
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Badges</span>
                  <Button variant="link" className="h-auto p-0 text-muted-foreground hover:text-foreground">
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                   {player.badges.slice(0, 5).map(badge => (
                     <Badge key={badge.id} variant="secondary" className="px-3 py-1 bg-background/80">
                        {badge.name}
                     </Badge>
                   ))}
                   {player.badges.length > 5 && (
                     <Badge variant="outline" className="px-3 py-1">+ {player.badges.length - 5}</Badge>
                   )}
                </div>
              </CardContent>
            </Card>

            {/* Sign Out Button */}
             {onSignOut && (
              <Button 
                variant="outline" 
                className="w-full text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20"
                onClick={onSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
             )}
          </div>
        </div>

        {/* Right Column - Main Content */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          
          {/* Recent Matches */}
          <section>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock className="size-5 text-primary" />
              Recent Activity
            </h3>
            <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
               {recentMatches.map((match, i) => (
                 <div key={match.id} className={`flex items-center justify-between p-4 hover:bg-white/5 transition-colors ${i !== recentMatches.length - 1 ? 'border-b border-white/5' : ''}`}>
                    <div className="flex items-center gap-4">
                       <div className={`size-2 w-2 rounded-full ${match.result === 'Win' ? 'bg-green-500' : 'bg-red-500'}`} />
                       <div>
                          <div className="font-medium">{match.mode}</div>
                          <div className="text-xs text-muted-foreground">vs {match.opponent}</div>
                       </div>
                    </div>
                    <div className="flex items-center gap-6">
                       <div className="text-sm text-muted-foreground">{match.time}</div>
                       <Badge variant={match.result === 'Win' ? 'default' : 'destructive'} className="w-16 justify-center">
                          {match.result}
                       </Badge>
                       <span className={`font-bold w-12 text-right ${match.result === 'Win' ? 'text-green-500' : 'text-red-500'}`}>
                          {match.rp}
                       </span>
                    </div>
                 </div>
               ))}
            </div>
          </section>

          {/* Achievements */}
          <section>
             <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
               <Award className="size-5 text-yellow-500" />
               Achievements
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {player.achievements.map((achievement) => {
                  const iconMap = LucideIcons as unknown as Record<string, LucideIcon>;
                  const Icon = iconMap[achievement.icon] || Trophy;
                  return (
                    <div 
                      key={achievement.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                         achievement.unlocked 
                           ? 'bg-primary/5 border-primary/20' 
                           : 'bg-card/30 border-border/50 opacity-60'
                      }`}
                    >
                       <div className={`size-12 rounded-lg flex items-center justify-center shrink-0 ${
                         achievement.unlocked ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                       }`}>
                          <Icon className="size-6" />
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{achievement.title}</div>
                          <div className="text-sm text-muted-foreground truncate">{achievement.unlocked ? 'Completed' : 'Locked'}</div>
                          
                          {/* Progress bar simulation for unlocked/locked */}
                          <div className="mt-2 h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                             <div 
                               className={`h-full rounded-full ${achievement.unlocked ? 'bg-primary' : 'bg-muted-foreground'}`} 
                               style={{ width: achievement.unlocked ? '100%' : '30%' }}
                             />
                          </div>
                       </div>
                       {achievement.unlocked && <Check className="size-5 text-primary shrink-0" />}
                    </div>
                  );
                })}
             </div>
          </section>
        </div>
      </div>
    </div>
  );
}
