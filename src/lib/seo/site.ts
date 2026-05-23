export const SITE_NAME = "Quizball";

export const SITE_TAGLINE = "The 1v1 Football Trivia Game";

export const SITE_DESCRIPTION =
  "Quizball is a fast-paced football trivia game. Challenge friends to 1v1 multiplayer football quiz duels, climb the ranked leaderboard, and prove you know the beautiful game.";

const rawUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_VERCEL_URL ??
  "https://quizball.io";

export const SITE_URL = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
