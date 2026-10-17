import type { BoardScope, BoardStanding, LeaderboardEntry, LeaderboardStanding } from "@/lib/domain/leaderboard";

// Made-up players for the /leaderboard/preview page only.
const NAMES = [
  "GOLAZO_99", "TIKITAKA", "PIBE10", "LAPULGA_FAN", "CHIMICHURRI", "KAKHA_GK", "ELMAGO", "VAMOSRIVER",
  "NUTMEG", "DIEGO_86", "BOKA_XENEIZE", "OFFSIDE_KING", "SAKARTVELO7", "TRIVELA", "PANENKA", "FALSO9",
  "VOLEA", "RABONA", "CATENACCIO", "GEGENPRESS",
];
const TIERS = ["GOAT", "Legend", "World-Class", "Captain", "Key Player", "Starting11", "Rotation", "Bench"];

export const ME = { id: "me", username: "NIKA_QB", country: "GE", club: "fc-barcelona", points: 1840 };

function tierFor(points: number) {
  if (points >= 2600) return TIERS[0];
  if (points >= 2300) return TIERS[1];
  if (points >= 2050) return TIERS[2];
  if (points >= 1850) return TIERS[3];
  if (points >= 1650) return TIERS[4];
  if (points >= 1450) return TIERS[5];
  if (points >= 1250) return TIERS[6];
  return TIERS[7];
}

function board(top: number, step: number, countries: string[], meRank: number | null, offset = 0): LeaderboardEntry[] {
  return Array.from({ length: 20 }, (_, i) => {
    const rank = i + 1;
    const isMe = rank === meRank;
    const points = isMe ? ME.points : Math.round(top - i * step - (i % 3) * 7);
    return {
      id: isMe ? ME.id : `p-${offset + i}`,
      rank,
      username: isMe ? ME.username : NAMES[(offset + i) % NAMES.length],
      avatar: `avatar-${((offset + i) % 8) + 1}`,
      avatarCustomization: null,
      country: isMe ? ME.country : countries[i % countries.length],
      tier: tierFor(points),
      rankPoints: points,
      isCurrentUser: isMe,
      trend: "same",
      trendValue: 0,
    };
  });
}

export const BOARDS: Record<string, LeaderboardEntry[]> = {
  global: board(2910, 52, ["AR", "GE", "ES", "CO", "GR", "MX", "DE", "CL"], null),
  "country:GE": board(2700, 50.6, ["GE"], 18, 3),
  "country:AR": board(2910, 61, ["AR"], null, 7),
  "club:fc-barcelona": board(2840, 66.7, ["GE", "AR", "ES", "CO", "GE", "MX"], 16, 11),
  "club:real-madrid-cf": board(2760, 55, ["GE", "ES", "GR", "CL"], null, 5),
  "club:liverpool": board(1905, 65, ["GE", "GB", "GR", "AR"], 2, 9),
};

export function boardKey(scope: BoardScope): string {
  return scope.kind === "global" ? "global" : scope.kind === "country" ? `country:${scope.country}` : `club:${scope.club}`;
}

const standing = (key: string, rank: number, players: number, score: number, top: [string, number], mine: string): LeaderboardStanding => ({
  key, rank, players, score, topPlayer: { username: top[0], points: top[1] }, isMine: key === mine,
});

export const NATIONS: LeaderboardStanding[] = [
  standing("AR", 1, 170, 26840, ["PIBE10", 2910], ME.country),
  standing("GE", 2, 2291, 25510, ["SAKARTVELO7", 2700], ME.country),
  standing("ES", 3, 116, 23180, ["TIKITAKA", 2655], ME.country),
  standing("CO", 4, 67, 21420, ["VOLEA", 2480], ME.country),
  standing("GR", 5, 61, 19870, ["CATENACCIO", 2390], ME.country),
  standing("MX", 6, 35, 18950, ["CHIMICHURRI", 2310], ME.country),
  standing("CL", 7, 39, 17730, ["RABONA", 2200], ME.country),
  standing("US", 8, 62, 16310, ["OFFSIDE_KING", 2105], ME.country),
  standing("DE", 9, 42, 15990, ["GEGENPRESS", 2050], ME.country),
  standing("PE", 10, 25, 14120, ["TRIVELA", 1980], ME.country),
  standing("UY", 11, 12, 11800, ["PANENKA", 1910], ME.country),
  standing("GB", 12, 36, 11240, ["NUTMEG", 1860], ME.country),
  standing("TR", 13, 28, 10530, ["FALSO9", 1790], ME.country),
  standing("VE", 14, 23, 9870, ["ELMAGO", 1720], ME.country),
  standing("PL", 15, 11, 8340, ["VOLEA", 1650], ME.country),
];

export const CLUBS: LeaderboardStanding[] = [
  standing("fc-barcelona", 1, 1029, 25920, ["TIKITAKA", 2840], ME.club),
  standing("real-madrid-cf", 2, 698, 24870, ["ELMAGO", 2760], ME.club),
  standing("boca-juniors", 3, 62, 22310, ["BOKA_XENEIZE", 2615], ME.club),
  standing("manchester-united", 4, 252, 21950, ["NUTMEG", 2540], ME.club),
  standing("river-plate", 5, 52, 20440, ["VAMOSRIVER", 2490], ME.club),
  standing("liverpool", 6, 167, 19680, ["GEGENPRESS", 2370], ME.club),
  standing("arsenal", 7, 139, 18120, ["OFFSIDE_KING", 2280], ME.club),
  standing("ac-milan", 8, 94, 17460, ["CATENACCIO", 2210], ME.club),
  standing("fc-bayern-munich", 9, 107, 16930, ["FALSO9", 2150], ME.club),
  standing("paris-saint-germain", 10, 58, 15880, ["PANENKA", 2090], ME.club),
  standing("chelsea", 11, 92, 14970, ["RABONA", 2010], ME.club),
  standing("fc-dinamo-tbilisi", 12, 23, 13640, ["KAKHA_GK", 1960], ME.club),
  standing("manchester-city", 13, 36, 12950, ["TRIVELA", 1890], ME.club),
  standing("juventus", 14, 23, 11830, ["VOLEA", 1820], ME.club),
  standing("galatasaray", 15, 9, 7420, ["FALSO9", 1700], ME.club),
];

export function boardStandingFor(scope: BoardScope): BoardStanding | null {
  const rows = BOARDS[boardKey(scope)];
  const mine = rows?.find((row) => row.isCurrentUser);
  if (!mine) return scope.kind === "global" ? { rank: 412, total: 3157, nextTarget: { username: "RABONA", rank: 411, gap: 6 }, topTenSlot: null, topTenGap: null } : null;
  const ahead = rows.find((row) => row.rank === mine.rank - 1);
  const total = scope.kind === "country" ? 2291 : scope.kind === "club" ? (scope.club === "liverpool" ? 167 : 1029) : 3157;
  return {
    rank: mine.rank,
    total,
    nextTarget: ahead ? { username: ahead.username, rank: ahead.rank, gap: ahead.rankPoints - mine.rankPoints + 1 } : null,
    topTenSlot: null,
    topTenGap: null,
  };
}

/** Standings view: the viewer is outside Barça's top 10 (rank 16), so they need points to count. */
export const GROUP_STANDING: BoardStanding = { rank: 16, total: 1029, nextTarget: null, topTenSlot: null, topTenGap: 512 };
export const GROUP_STANDING_COUNTS: BoardStanding = { rank: 7, total: 2291, nextTarget: null, topTenSlot: 7, topTenGap: null };
