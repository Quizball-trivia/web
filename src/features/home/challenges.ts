// Canonical list of all daily challenge IDs
// This is the single source of truth for valid challenge identifiers
export type DailyChallengeId =
  | 'moneyDrop'
  | 'footballJeopardy'
  | 'hairstyle'
  | 'clues'
  | 'trueFalse'
  | 'emojiGuess'
  | 'countdown'
  | 'putInOrder';

// Icon token type for mapping to Lucide icons in components
export type IconToken =
  | 'dollarSign'
  | 'brain'
  | 'sparkles'
  | 'lightbulb'
  | 'target'
  | 'timer'
  | 'list';

export interface ChallengeConfig {
  id: DailyChallengeId;
  title: string;
  description: string;
  icon: string; // Emoji for card display
  iconToken: IconToken; // Token for mapping to Lucide icon in components
  iconColorClass: string; // Tailwind text color class for icon
  iconBgColor: string; // Tailwind bg color class for icon container
  coinReward: number;
  xpReward: number;
  showOnHome: boolean;
}

// Single source of truth for all daily challenges
// Use explicit `showOnHome` field - reordering this list shouldn't change home screen
export const ALL_CHALLENGES: ChallengeConfig[] = [
  {
    id: 'moneyDrop',
    title: 'Money Drop',
    description: 'Answer questions to keep your coins. Drop coins on wrong answers!',
    icon: '💰',
    iconToken: 'dollarSign',
    iconColorClass: 'text-yellow-400',
    iconBgColor: 'bg-yellow-500/20',
    coinReward: 1000,
    xpReward: 200,
    showOnHome: true,
  },
  {
    id: 'footballJeopardy',
    title: 'Football Jeopardy',
    description: 'Choose categories and point values. Higher points = harder questions.',
    icon: '🧠',
    iconToken: 'brain',
    iconColorClass: 'text-blue-400',
    iconBgColor: 'bg-blue-500/20',
    coinReward: 500,
    xpReward: 150,
    showOnHome: true,
  },
  {
    id: 'hairstyle',
    title: 'Hairstyle Challenge',
    description: 'Name the player by their iconic hairstyle',
    icon: '💇',
    iconToken: 'sparkles',
    iconColorClass: 'text-purple-400',
    iconBgColor: 'bg-purple-500/20',
    coinReward: 750,
    xpReward: 100,
    showOnHome: true,
  },
  {
    id: 'clues',
    title: 'Clues Challenge',
    description: 'Guess the player from progressive clues. Fewer clues = more points!',
    icon: '💡',
    iconToken: 'lightbulb',
    iconColorClass: 'text-emerald-400',
    iconBgColor: 'bg-emerald-500/20',
    coinReward: 300,
    xpReward: 100,
    showOnHome: false,
  },
  {
    id: 'trueFalse',
    title: 'True or False',
    description: 'Quick fire true/false questions. Test your football facts!',
    icon: '✅',
    iconToken: 'target',
    iconColorClass: 'text-red-400',
    iconBgColor: 'bg-red-500/20',
    coinReward: 200,
    xpReward: 75,
    showOnHome: false,
  },
  {
    id: 'emojiGuess',
    title: 'Emoji Guess',
    description: 'Decode the emojis to guess the player or team!',
    icon: '🎯',
    iconToken: 'sparkles',
    iconColorClass: 'text-purple-400',
    iconBgColor: 'bg-purple-500/20',
    coinReward: 250,
    xpReward: 80,
    showOnHome: false,
  },
  {
    id: 'countdown',
    title: 'Countdown Challenge',
    description: 'Race against time! Answer before the clock runs out.',
    icon: '⏱️',
    iconToken: 'timer',
    iconColorClass: 'text-orange-400',
    iconBgColor: 'bg-orange-500/20',
    coinReward: 400,
    xpReward: 120,
    showOnHome: false,
  },
  {
    id: 'putInOrder',
    title: 'Put in Order',
    description: 'Arrange items in the correct chronological or numerical order.',
    icon: '📋',
    iconToken: 'list',
    iconColorClass: 'text-indigo-400',
    iconBgColor: 'bg-indigo-500/20',
    coinReward: 200,
    xpReward: 80,
    showOnHome: false,
  },
];

// Use explicit filter, NOT .slice() - reordering ALL_CHALLENGES shouldn't change home screen
export const HOME_CHALLENGES = ALL_CHALLENGES.filter((c) => c.showOnHome);
