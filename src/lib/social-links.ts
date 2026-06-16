// Official QuizBall social profiles. Single source of truth — update URLs here.
export const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/quizball.io/',
  facebook: 'https://www.facebook.com/profile.php?id=61590358770655',
} as const;

export type SocialPlatform = keyof typeof SOCIAL_LINKS;

// Facebook has two destinations — the page and the community group — so the
// Facebook icon opens a small picker instead of going straight to one link.
export const FACEBOOK_LINKS = {
  page: SOCIAL_LINKS.facebook,
  community: 'https://www.facebook.com/groups/2889580668042836',
} as const;
