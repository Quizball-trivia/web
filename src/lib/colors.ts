/**
 * Centralized color system for Quizball.
 *
 * Usage in components:
 *   import { colors } from '@/lib/colors';
 *   <div style={{ background: colors.surface.base }} />
 *   <div className={`bg-[${colors.green.base}]`} />  // Tailwind arbitrary
 *
 * Button pattern:  bg + border-b-4 shadow + hover glow
 *   bg-[${colors.green.base}] border-b-4 border-[${colors.green.shadow}]
 */

export const colors = {
  // ── Surfaces / Backgrounds ─────────────────────────────
  surface: {
    /** Main app & landing page background */
    base: '#071013',
    /** Card / container background */
    card: '#1B2F36',
    /** Inner panels, modals, overlays */
    overlay: '#131F24',
    /** Hover state on cards */
    hover: '#243B44',
    /** Deep border / border-b-4 shadow */
    border: '#0D1B21',
    /** Secondary border */
    borderLight: '#0F1F26',
  },

  // ── Greens — success, correct, primary CTA ─────────────
  green: {
    /** Primary green (kick-off button, CTAs, correct answer) */
    base: '#38B60E',
    /** Button border-b-4 shadow */
    shadow: '#2D950B',
    /** Bright accent / glow */
    light: '#85E000',
    /** Answer highlight green */
    correct: '#58CC02',
  },

  // ── Reds — errors, wrong, destructive ──────────────────
  red: {
    /** Primary red (wrong answer, errors, destructive) */
    base: '#FF4B4B',
    /** Button border-b-4 shadow */
    shadow: '#CC3C3C',
    /** Slightly softer red */
    mid: '#E04242',
  },

  // ── Blues — info, secondary actions, player accent ─────
  blue: {
    /** Primary blue (player accent, info buttons) */
    base: '#1CB0F6',
    /** Button border-b-4 shadow */
    shadow: '#14627F',
    /** Light tint */
    light: '#A9E6FF',
    /** Brand blue (footer, marketing accents) */
    brand: '#1645FF',
  },

  // ── Oranges — countdown, time pressure, warnings ──────
  orange: {
    /** Primary orange (timer, countdown mode) */
    base: '#FF9600',
    /** Button border-b-4 shadow */
    shadow: '#CC7800',
    /** Light accent */
    light: '#FFB800',
  },

  // ── Purples — epic rarity, premium ────────────────────
  purple: {
    /** Primary purple (epic rarity) */
    base: '#CE82FF',
    /** Button border-b-4 shadow */
    shadow: '#B066E0',
    /** Soft tint */
    light: '#D8B8FF',
  },

  // ── Yellows — CTA accent, Google sign-in ──────────────
  yellow: {
    /** Primary yellow (Google sign-in button) */
    base: '#FFE500',
    /** Button border-b-4 shadow */
    shadow: '#CCB800',
    /** Hover state */
    hover: '#FFD700',
  },

  // ── Golds — rewards, money, trophies ─────────────────
  gold: {
    /** Primary gold (rewards, money) */
    base: '#FFD700',
    /** Darker gold variant */
    dark: '#B8860B',
    /** Warm gold */
    warm: '#FFC800',
    /** Bright highlight */
    light: '#FCD200',
  },

  // ── Text ──────────────────────────────────────────────
  text: {
    /** Primary text */
    primary: '#FFFFFF',
    /** Secondary / muted text */
    secondary: '#56707A',
  },

  // ── Game Mode Colors ──────────────────────────────────
  mode: {
    multipleChoice: '#1CB0F6',
    trueFalse: '#58CC02',
    countdown: '#FF9600',
    putInOrder: '#CE82FF',
    moneyDrop: '#FFD700',
  },

  // ── Rarity System ─────────────────────────────────────
  rarity: {
    common: '#56707A',
    rare: '#1CB0F6',
    epic: '#CE82FF',
    premium: '#FFD700',
  },
} as const;

// ── Type helpers ────────────────────────────────────────
export type ColorToken = typeof colors;
