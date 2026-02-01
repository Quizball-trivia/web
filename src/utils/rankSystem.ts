// Division-based rank system
// Division 10 (0-100 RP) -> Division 1 (900-1000 RP) -> Elite (1000+ RP unlimited)

export type RankDivision = 
  | 'Division 10'
  | 'Division 9'
  | 'Division 8'
  | 'Division 7'
  | 'Division 6'
  | 'Division 5'
  | 'Division 4'
  | 'Division 3'
  | 'Division 2'
  | 'Division 1'
  | 'Elite';

export type ProfileBackground = 'bronze' | 'silver' | 'gold' | 'icon';

export interface RankInfo {
  division: RankDivision;
  minRP: number;
  maxRP: number | null; // null for Elite (unlimited)
  progress: number; // 0-100 percentage
  pointsToNext: number | null; // null for Elite
}

// Calculate rank division based on rank points
export function getRankDivision(rankPoints: number): RankDivision {
  if (rankPoints >= 1000) return 'Elite';
  if (rankPoints >= 900) return 'Division 1';
  if (rankPoints >= 800) return 'Division 2';
  if (rankPoints >= 700) return 'Division 3';
  if (rankPoints >= 600) return 'Division 4';
  if (rankPoints >= 500) return 'Division 5';
  if (rankPoints >= 400) return 'Division 6';
  if (rankPoints >= 300) return 'Division 7';
  if (rankPoints >= 200) return 'Division 8';
  if (rankPoints >= 100) return 'Division 9';
  return 'Division 10';
}

// Get detailed rank information
export function getRankInfo(rankPoints: number): RankInfo {
  const division = getRankDivision(rankPoints);
  
  if (division === 'Elite') {
    return {
      division: 'Elite',
      minRP: 1000,
      maxRP: null,
      progress: 100,
      pointsToNext: null,
    };
  }
  
  // Define rank point thresholds
  const thresholds: Record<RankDivision, { min: number; max: number }> = {
    'Division 10': { min: 0, max: 100 },
    'Division 9': { min: 100, max: 200 },
    'Division 8': { min: 200, max: 300 },
    'Division 7': { min: 300, max: 400 },
    'Division 6': { min: 400, max: 500 },
    'Division 5': { min: 500, max: 600 },
    'Division 4': { min: 600, max: 700 },
    'Division 3': { min: 700, max: 800 },
    'Division 2': { min: 800, max: 900 },
    'Division 1': { min: 900, max: 1000 },
    'Elite': { min: 1000, max: 1000 }, // Not used
  };
  
  const threshold = thresholds[division];
  const pointsInDivision = rankPoints - threshold.min;
  const divisionRange = threshold.max - threshold.min;
  const progress = Math.round((pointsInDivision / divisionRange) * 100);
  const pointsToNext = threshold.max - rankPoints;
  
  return {
    division,
    minRP: threshold.min,
    maxRP: threshold.max,
    progress,
    pointsToNext,
  };
}

// Get division emoji/icon
export function getDivisionEmoji(division: RankDivision): string {
  const emojiMap: Record<RankDivision, string> = {
    'Division 10': '🥉',
    'Division 9': '🥉',
    'Division 8': '🥈',
    'Division 7': '🥈',
    'Division 6': '🥇',
    'Division 5': '🥇',
    'Division 4': '💎',
    'Division 3': '💎',
    'Division 2': '💠',
    'Division 1': '💠',
    'Elite': '👑',
  };
  
  return emojiMap[division];
}

// Get division color
export function getDivisionColor(division: RankDivision): {
  bg: string;
  border: string;
  text: string;
  gradient: string;
} {
  const colorMap: Record<RankDivision, { bg: string; border: string; text: string; gradient: string }> = {
    'Division 10': {
      bg: 'bg-amber-900/20',
      border: 'border-amber-700/40',
      text: 'text-amber-700',
      gradient: 'from-amber-900 to-amber-700',
    },
    'Division 9': {
      bg: 'bg-amber-800/20',
      border: 'border-amber-600/40',
      text: 'text-amber-600',
      gradient: 'from-amber-800 to-amber-600',
    },
    'Division 8': {
      bg: 'bg-slate-400/20',
      border: 'border-slate-400/40',
      text: 'text-slate-400',
      gradient: 'from-slate-500 to-slate-400',
    },
    'Division 7': {
      bg: 'bg-slate-300/20',
      border: 'border-slate-300/40',
      text: 'text-slate-300',
      gradient: 'from-slate-400 to-slate-300',
    },
    'Division 6': {
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/40',
      text: 'text-yellow-500',
      gradient: 'from-yellow-600 to-yellow-400',
    },
    'Division 5': {
      bg: 'bg-yellow-400/20',
      border: 'border-yellow-400/40',
      text: 'text-yellow-400',
      gradient: 'from-yellow-500 to-yellow-300',
    },
    'Division 4': {
      bg: 'bg-cyan-500/20',
      border: 'border-cyan-500/40',
      text: 'text-cyan-500',
      gradient: 'from-cyan-600 to-cyan-400',
    },
    'Division 3': {
      bg: 'bg-cyan-400/20',
      border: 'border-cyan-400/40',
      text: 'text-cyan-400',
      gradient: 'from-cyan-500 to-cyan-300',
    },
    'Division 2': {
      bg: 'bg-purple-500/20',
      border: 'border-purple-500/40',
      text: 'text-purple-500',
      gradient: 'from-purple-600 to-purple-400',
    },
    'Division 1': {
      bg: 'bg-purple-400/20',
      border: 'border-purple-400/40',
      text: 'text-purple-400',
      gradient: 'from-purple-500 to-purple-300',
    },
    'Elite': {
      bg: 'bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-red-500/20',
      border: 'border-yellow-500/60',
      text: 'text-yellow-500',
      gradient: 'from-yellow-500 via-orange-500 to-red-500',
    },
  };
  
  return colorMap[division];
}

// Get profile background gradient
export function getProfileBackgroundGradient(background: ProfileBackground): string {
  const gradients: Record<ProfileBackground, string> = {
    bronze: 'from-amber-900/40 via-amber-800/30 to-amber-900/40',
    silver: 'from-slate-400/40 via-slate-300/30 to-slate-400/40',
    gold: 'from-yellow-500/40 via-yellow-400/30 to-yellow-500/40',
    icon: 'from-purple-600/40 via-pink-500/30 to-purple-600/40',
  };
  
  return gradients[background];
}

// Get profile background border color
export function getProfileBackgroundBorder(background: ProfileBackground): string {
  const borders: Record<ProfileBackground, string> = {
    bronze: 'border-amber-700/50',
    silver: 'border-slate-400/50',
    gold: 'border-yellow-500/50',
    icon: 'border-purple-500/50',
  };
  
  return borders[background];
}

// Check if background is unlocked
export function isBackgroundUnlocked(background: ProfileBackground, ownedBackgrounds: string[]): boolean {
  if (background === 'bronze') return true; // Bronze is default, always unlocked
  return ownedBackgrounds.includes(background);
}
