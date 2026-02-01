import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Target, Flame, Star, Award, Sparkles, Coins, Settings, Flag, Pencil, Check, X, type LucideIcon } from 'lucide-react';
import type { PlayerStats } from '@/types/game';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import * as LucideIcons from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect, useRef } from 'react';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { Input } from '@/components/ui/input';
import { getRankInfo, getDivisionColor, getProfileBackgroundGradient, getProfileBackgroundBorder } from '@/utils/rankSystem';

interface ProfileMobileProps {
  player: PlayerStats;
  onNavigateToStore?: () => void;
  onNavigateToSettings?: () => void;
  onFeatureFlagsChange?: (flags: { extraGameModes: boolean }) => void;
  onNameChange?: (newName: string) => void;
}

export function ProfileMobile({ player, onNavigateToStore, onNavigateToSettings, onFeatureFlagsChange, onNameChange }: ProfileMobileProps) {
  const rankInfo = getRankInfo(player.rankPoints || 0);
  const divisionColors = getDivisionColor(rankInfo.division);
  const profileBg = getProfileBackgroundGradient(player.profileBackground || 'bronze');
  const profileBorder = getProfileBackgroundBorder(player.profileBackground || 'bronze');
  
  // Feature flags state
  const [extraGameModes, setExtraGameModes] = useState(() => {
    const saved = storage.get<{ extraGameModes: boolean } | null>(STORAGE_KEYS.FEATURE_FLAGS, null);
    return saved ? saved.extraGameModes : true;
  });

  // Name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(player.username);

  // Use ref for callback to avoid infinite loop
  const onFeatureFlagsChangeRef = useRef(onFeatureFlagsChange);

  useEffect(() => {
    onFeatureFlagsChangeRef.current = onFeatureFlagsChange;
  }, [onFeatureFlagsChange]);

  useEffect(() => {
    const flags = { extraGameModes };
    storage.set(STORAGE_KEYS.FEATURE_FLAGS, flags);
    onFeatureFlagsChangeRef.current?.(flags);
  }, [extraGameModes]);

  const getBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/50';
      case 'epic':
        return 'bg-pink-500/20 text-pink-700 dark:text-pink-400 border-pink-500/50';
      case 'rare':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/50';
      case 'common':
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/50';
      default:
        return '';
    }
  };

  const handleNameChange = () => {
    if (editedName.trim() !== player.username) {
      onNameChange?.(editedName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <div className="space-y-4 p-4 pb-24">
      {/* FIFA-Style Profile Card */}
      <div className={`relative overflow-hidden rounded-2xl border-2 ${profileBorder} bg-gradient-to-br ${profileBg} p-6`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          {/* Radial gradient effect */}
        </div>

        {/* Content */}
        <div className="relative">
          {/* Top Section - Avatar and Name */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative">
                <div className="size-20 rounded-full bg-background/80 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.3),transparent)]" />
                  <div className="relative">
                    {player.avatarCustomization ? (
                      <AvatarDisplay customization={player.avatarCustomization} size="lg" />
                    ) : (
                      <div className="text-4xl">{player.avatar}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Name and Level */}
              <div>
                {isEditingName ? (
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="h-9 flex-1 bg-background/80"
                      maxLength={20}
                      autoFocus
                    />
                    <Button
                      onClick={handleNameChange}
                      size="sm"
                      className="size-9 p-0"
                      variant="outline"
                    >
                      <Check className="size-4" />
                    </Button>
                    <Button
                      onClick={() => {
                        setEditedName(player.username);
                        setIsEditingName(false);
                      }}
                      size="sm"
                      className="size-9 p-0"
                      variant="outline"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <h2 className="text-2xl font-bold mb-1 flex items-center gap-2 text-white drop-shadow-lg">
                    {player.username}
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="p-1 rounded-md hover:bg-white/20 transition-colors"
                    >
                      <Pencil className="size-4" />
                    </button>
                  </h2>
                )}
                <div className="flex items-center gap-2">
                  <Badge className="bg-white/90 text-black border-0 text-xs font-bold">
                    Level {player.level}
                  </Badge>
                  <Badge className="bg-yellow-500 text-black border-0 text-xs font-bold">
                    <Coins className="size-3 mr-1" />
                    {player.coins}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Rank Progress */}
          <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between mb-2 text-white">
              <span className="text-sm font-medium">Rank Points</span>
              <span className="text-lg font-bold">{player.rankPoints || 0} RP</span>
            </div>
            
            {rankInfo.division !== 'Elite' ? (
              <>
                <div className="relative h-3 bg-black/40 rounded-full overflow-hidden border border-white/20 mb-2">
                  <div 
                    className={`h-full bg-gradient-to-r ${divisionColors.gradient} transition-all duration-500`}
                    style={{ width: `${rankInfo.progress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-white/80">
                  <span>{rankInfo.minRP} RP</span>
                  <span className="font-semibold">{rankInfo.pointsToNext} RP to {
                    rankInfo.division === 'Division 1' ? 'Elite' : 'next division'
                  }</span>
                  <span>{rankInfo.maxRP} RP</span>
                </div>
              </>
            ) : (
              <div className="text-center py-2">
                <div className="text-sm font-bold text-yellow-400">Elite Division - Unlimited</div>
              <div className="text-xs text-white/70">You&apos;ve reached the highest rank!</div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            {onNavigateToStore && (
              <Button 
                onClick={onNavigateToStore} 
                className="flex-1 bg-white/90 hover:bg-white text-black font-semibold"
              >
                <Sparkles className="size-4 mr-2" />
                Customize
              </Button>
            )}
            {onNavigateToSettings && (
              <Button 
                onClick={onNavigateToSettings} 
                className="flex-1 bg-white/90 hover:bg-white text-black font-semibold"
              >
                <Settings className="size-4 mr-2" />
                Settings
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="size-5 text-primary" />
              <span className="text-sm text-muted-foreground">World Rank</span>
            </div>
            <div className="text-2xl font-bold">#{player.rank}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="size-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Accuracy</span>
            </div>
            <div className="text-2xl font-bold">
              {player.gamesPlayed > 0 
                ? Math.round((player.correctAnswers / (player.gamesPlayed * 10)) * 100) 
                : 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="size-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">Best Streak</span>
            </div>
            <div className="text-2xl font-bold">{player.bestStreak}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="size-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Games Played</span>
            </div>
            <div className="text-2xl font-bold">{player.gamesPlayed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="size-5" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {player.achievements.slice(0, 6).map((achievement) => {
              const iconMap = LucideIcons as unknown as Record<string, LucideIcon>;
              const Icon = iconMap[achievement.icon] || Trophy;
              return (
                <div
                  key={achievement.id}
                  className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center p-2 transition-all ${
                    achievement.unlocked
                      ? 'bg-primary/10 border-primary hover:scale-105'
                      : 'bg-muted border-border opacity-50'
                  }`}
                >
                  <Icon className={`size-6 mb-1 ${achievement.unlocked ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="text-[10px] text-center leading-tight">
                    {achievement.title}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Flag className="size-5" />
            Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {player.badges.map((badge) => (
              <Badge
                key={badge.id}
                variant="outline"
                className={`${getBadgeColor(badge.earned ? 'rare' : 'common')} ${
                  !badge.earned && 'opacity-50'
                }`}
              >
                {badge.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Developer Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Developer Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Extra Game Modes</div>
              <div className="text-sm text-muted-foreground">Enable additional game modes</div>
            </div>
            <Switch
              checked={extraGameModes}
              onCheckedChange={setExtraGameModes}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
