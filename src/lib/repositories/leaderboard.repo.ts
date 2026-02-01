import type { LeaderboardEntry } from '@/lib/domain/leaderboard';

// Mock data generator
const generateMockLeaderboard = (count: number): LeaderboardEntry[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `user-${i}`,
    rank: i + 1,
    username: i === 0 ? 'MessiMagician' : i === 1 ? 'CR7Fanatic' : `Player ${i + 1}`,
    level: Math.floor(Math.random() * 50) + 10,
    rankPoints: 1000 - i * 5,
    isCurrentUser: i === 5,
    trend: Math.random() > 0.5 ? 'up' : 'down',
    trendValue: Math.floor(Math.random() * 3) + 1,
  }));
};

const MOCK_DATA = {
  global: generateMockLeaderboard(50),
  country: generateMockLeaderboard(20),
  friends: generateMockLeaderboard(5),
};

export async function getLeaderboard(type: 'global' | 'country' | 'friends' = 'global') {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // In a real app, this would be:
  // return api.GET('/api/v1/leaderboard', { params: { query: { type } } });
  
  return {
    data: MOCK_DATA[type],
    error: null,
  };
}

export async function getUserRank(userId: string) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
        data: {
             id: userId,
             rank: 156,
             rankPoints: 2450,
             username: 'You',
             level: 42
        },
        error: null
    };
}
