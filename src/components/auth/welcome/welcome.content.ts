/**
 * Static content + lookup tables for the WelcomeScreen.
 *
 * Constants only — no React, no hooks, no helpers that need the type
 * import from lucide-react's runtime. Keeps the bundle splittable and
 * the tests easy to opt out of via lightweight mocks.
 */

import { Brain, Goal, Trophy, Crown, Star, Globe, Flame, Shield, Repeat, Award, Flag, Swords, type LucideIcon } from 'lucide-react';
import type { LeaderboardEntry } from '@/lib/domain/leaderboard';
import type { MessageKey } from '@/lib/i18n/messages';
import type { AvatarCustomization } from '@/types/game';
import type { LandingScenario } from './welcome.types';

export const SUBHEADING_PHRASE_KEYS: MessageKey[] = [
  'welcome.phraseBack',
  'welcome.phraseBeat',
  'welcome.phraseTurn',
  'welcome.phraseMove',
  'welcome.phraseTakeOn',
  'welcome.phrasePlay',
  'welcome.phraseFromTrivia',
  'welcome.phraseKnow',
  'welcome.phraseStartStrong',
  'welcome.phraseEveryRight',
];

// Style mapping for known categories (matched by slug or lowercased name)
export const CATEGORY_STYLES: Record<string, { color: string; icon: LucideIcon; flag?: string; watermarkImg?: string }> = {
  'premier-league': { color: '#3D195B', icon: Crown, flag: 'gb-eng' },
  'champions-league': { color: '#1A71B8', icon: Star },
  'world-cup': { color: '#D4AF37', icon: Globe, watermarkImg: '/assets/brand/world-cup-trophy.webp' },
  'la-liga': { color: '#FFFFFF', icon: Flame, flag: 'es' },
  'serie-a': { color: '#024494', icon: Shield, flag: 'it' },
  'bundesliga': { color: '#D20515', icon: Goal, flag: 'de' },
  'ligue-1': { color: '#D8F000', icon: Award, flag: 'fr' },
  'league-1': { color: '#D8F000', icon: Award, flag: 'fr' },
  'transfer-history': { color: '#1CB0F6', icon: Repeat },
  'transfers': { color: '#1CB0F6', icon: Repeat },
  'legends': { color: '#FFD700', icon: Trophy, watermarkImg: '/assets/brand/ball.webp' },
  'national-teams': { color: '#38B60E', icon: Flag },
  'club-rivalries': { color: '#FF4B4B', icon: Swords },
  'rivalries': { color: '#FF4B4B', icon: Swords },
  'europa-league': { color: '#F68E1F', icon: Star },
  'euro': { color: '#004B87', icon: Globe, flag: 'eu' },
  'copa-america': { color: '#1B75BB', icon: Globe },
  'african-cup': { color: '#009639', icon: Globe },
  'mls': { color: '#472D8C', icon: Shield, flag: 'us' },
  'eredivisie': { color: '#E4002B', icon: Shield, flag: 'nl' },
  'liga-portugal': { color: '#00543E', icon: Shield, flag: 'pt' },
  'scottish-premiership': { color: '#1D1D8F', icon: Shield, flag: 'gb-sct' },
  'rules': { color: '#6B7280', icon: Brain },
  'stadiums': { color: '#059669', icon: Goal },
  'managers': { color: '#7C3AED', icon: Crown },
  'ballon-dor': { color: '#D4AF37', icon: Award, watermarkImg: '/assets/brand/ball.webp' },
  'ac-milan': { color: '#B5121B', icon: Shield, flag: 'it' },
  'milan': { color: '#B5121B', icon: Shield, flag: 'it' },
  'argentina': { color: '#6CACE4', icon: Flag, flag: 'ar' },
  'arsenal': { color: '#EF0107', icon: Shield, flag: 'gb-eng' },
  'barcelona': { color: '#A50044', icon: Shield, flag: 'es' },
  'barcelona-b': { color: '#A50044', icon: Shield, flag: 'es' },
  'salvador': { color: '#0047AB', icon: Flag },
  'el-salvador': { color: '#0047AB', icon: Flag, flag: 'sv' },
};

// Categories to exclude (game modes, not real trivia categories)
export const EXCLUDED_SLUGS = new Set([
  'daily-challenges', 'daily-challenge', 'countdown', 'jeopardy',
  'daily', 'daily-quiz', 'count-down', 'football-jeopardy', 'clues',
  'true-or-false', 'put-in-order', 'money-drop', 'high-low',
  'high_low', 'imposter', 'football-logic', 'career-path',
  'career_path',
]);

export const EXCLUDED_CATEGORY_PREFIXES = [
  'daily-challenges',
  'daily-challenge',
];

export const EXCLUDED_CATEGORY_NAMES = new Set([
  'daily challenges',
  'clues',
  'countdown',
  'money drop',
  'put in order',
  'true or false',
  'high low',
  'high_low',
  'imposter',
  'football logic',
  'career path',
  'career_path',
]);

// Main categories to feature on the landing page (matched by slug or name substring)
export const FEATURED_NAMES = [
  'champions league',
  'world cup',
  'premier league',
  'la liga',
  'bundesliga',
  'league 1',
  'uefa euro',
  'serie a',
];

export const FEATURED_CATEGORY_LIMIT = 12;

// Fallback colors for categories not in the mapping
export const FALLBACK_COLORS = ['#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#F39C12', '#1ABC9C', '#E67E22', '#2980B9'];

export const DEMO_PLAYER_NAMES = ['Mason', 'Thiago', 'Santi', 'Jamal', 'Enzo', 'Rafa', 'Nico', 'Jude'];

export const DEMO_AVATAR_LOADOUTS: AvatarCustomization[] = [
  { skin: 'skin_male_white', hair: 'hair_ramos', jersey: 'jersey_liverpool', glasses: 'glasses_aviator' },
  { skin: 'skin_male_dark', hair: 'hair_ronaldo_goat', jersey: 'jersey_brazil_retro', facialHair: 'stache' },
  { skin: 'skin_male_white_alt', hair: 'hair_hamsik', jersey: 'jersey_milan', facialHair: 'beard' },
  { skin: 'skin_male_dark_alt', hair: 'hair_boy_basic', jersey: 'jersey_argentina_retro', glasses: 'glasses_round' },
  { skin: 'skin_male_white', hair: 'hair_girl_basic', jersey: 'jersey_barcelona', glasses: 'glasses_wayfarer' },
  { skin: 'skin_male_dark', hair: 'hair_ronaldo_brazil', jersey: 'jersey_france_retro' },
  { skin: 'skin_male_white_alt', hair: 'hair_boy_basic', jersey: 'jersey_bayern', glasses: 'glasses_aviator' },
  { skin: 'skin_male_dark_alt', hair: 'hair_ramos', jersey: 'jersey_netherlands_retro', facialHair: 'beard' },
];

export const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  { id: '1', rank: 1, username: 'CR7_GOAT', avatar: 'avatar-1', country: 'pt', tier: 'GOAT', rankPoints: 4820, isCurrentUser: false, trend: 'same', trendValue: 0 },
  { id: '2', rank: 2, username: 'Messianic10', avatar: 'avatar-2', country: 'ar', tier: 'Legend', rankPoints: 4615, isCurrentUser: false, trend: 'up', trendValue: 2 },
  { id: '3', rank: 3, username: 'ZizouMagic', avatar: 'avatar-3', country: 'fr', tier: 'Legend', rankPoints: 4490, isCurrentUser: false, trend: 'down', trendValue: 1 },
  { id: '4', rank: 4, username: 'TotalFootball14', avatar: 'avatar-4', country: 'nl', tier: 'World-Class', rankPoints: 4210, isCurrentUser: false, trend: 'up', trendValue: 3 },
  { id: '5', rank: 5, username: 'KloppHeavyMetal', avatar: 'avatar-5', country: 'de', tier: 'World-Class', rankPoints: 3980, isCurrentUser: false, trend: 'down', trendValue: 2 },
  { id: '6', rank: 6, username: 'TikiTakaMaster', avatar: 'avatar-6', country: 'es', tier: 'Captain', rankPoints: 3755, isCurrentUser: false, trend: 'up', trendValue: 1 },
  { id: '7', rank: 7, username: 'Azzurri_Fan', avatar: 'avatar-7', country: 'it', tier: 'Captain', rankPoints: 3640, isCurrentUser: false, trend: 'same', trendValue: 0 },
  { id: '8', rank: 8, username: 'ThreeLions_', avatar: 'avatar-8', country: 'gb-eng', tier: 'Key Player', rankPoints: 3510, isCurrentUser: false, trend: 'up', trendValue: 4 },
];

export const LANDING_SCENARIOS: LandingScenario[] = [
  { kind: 'left-push', playerPoints: 50, opponentPoints: 20 },
  { kind: 'right-push', playerPoints: 20, opponentPoints: 50 },
  { kind: 'left-goal', playerPoints: 70, opponentPoints: 20 },
  { kind: 'right-goal', playerPoints: 20, opponentPoints: 70 },
  { kind: 'left-push', playerPoints: 40, opponentPoints: 30 },
  { kind: 'right-push', playerPoints: 30, opponentPoints: 40 },
];

// Landing animation timing constants (ms)
export const LANDING_SCORE_FLIGHT_START_MS = 120;
export const LANDING_CONVERT_MS = 140;
export const LANDING_BARS_SPAWN_BASE_MS = 210;
export const LANDING_BARS_PER_STAGGER_MS = 82;
export const LANDING_BATTLE_BASE_MS = 400;
export const LANDING_BATTLE_PER_BAR_MS = 235;
export const LANDING_CHARGE_BASE_MS = 660;
export const LANDING_CHARGE_PER_BAR_MS = 105;
export const LANDING_CHARGE_SHOT_OVERLAP_MS = 180;
export const LANDING_RESULT_HOLD_MS = 1150;
export const LANDING_DONE_LINGER_MS = 320;
export const LANDING_LOOP_REST_MS = 850;
