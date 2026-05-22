import type { Achievement, PlayerStats } from '../types/game';

const mockAchievements: Achievement[] = [
  {
    id: 'first_win',
    title: { en: 'Debut Match' },
    description: { en: 'Complete your first game' },
    icon: 'Trophy',
    unlocked: false,
  },
  {
    id: 'perfect_game',
    title: { en: 'Hat-Trick Hero' },
    description: { en: 'Answer all questions correctly' },
    icon: 'Star',
    unlocked: false,
  },
  {
    id: 'speed_demon',
    title: { en: 'Lightning Counter' },
    description: { en: 'Complete a Time Attack game in under 60 seconds' },
    icon: 'Zap',
    unlocked: false,
  },
  {
    id: 'survivor',
    title: { en: 'Clean Sheet' },
    description: { en: 'Complete a Survival game without losing all lives' },
    icon: 'Heart',
    unlocked: false,
  },
  {
    id: 'streak_master',
    title: { en: 'Winning Streak' },
    description: { en: 'Maintain a 5-game winning streak' },
    icon: 'Flame',
    unlocked: false,
  },
  {
    id: 'multiplayer_champion',
    title: { en: 'Multiplayer Master' },
    description: { en: 'Win 10 multiplayer matches' },
    icon: 'Users',
    unlocked: false,
  },
  {
    id: 'tournament_winner',
    title: { en: 'Trophy Collector' },
    description: { en: 'Win your first tournament' },
    icon: 'Award',
    unlocked: false,
  },
];

// Mock current player data
export const mockCurrentPlayer: PlayerStats = {
  id: 'player-1',
  username: 'quizballPro',
  avatar: '⚽',
  level: 5,
  xp: 450,
  xpToNextLevel: 1000,
  coins: 2500,
  tickets: 0,
  lastTicketReset: new Date().toISOString(),
  profileBackground: 'bronze',
  ownedBackgrounds: ['bronze'],
  totalScore: 1250,
  gamesPlayed: 45,
  correctAnswers: 320,
  currentStreak: 3,
  bestStreak: 7,
  achievements: mockAchievements,
  badges: [
    { id: 'bronze', name: 'Bronze', icon: '🥉', rarity: 'common' as const, earned: true },
    { id: 'silver', name: 'Silver', icon: '🥈', rarity: 'rare' as const, earned: false },
    { id: 'gold', name: 'Gold', icon: '🥇', rarity: 'epic' as const, earned: false },
  ],
  rank: 247,
  ownedItems: [],
  rankPoints: 250,
  completedLevels: [1, 2],
};
