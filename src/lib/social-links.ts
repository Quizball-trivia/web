// Official QuizBall social profiles. Single source of truth — update URLs here.
export const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/quizball.io/',
  facebook: 'https://www.facebook.com/profile.php?id=61590358770655',
} as const;

export type SocialPlatform = keyof typeof SOCIAL_LINKS;
