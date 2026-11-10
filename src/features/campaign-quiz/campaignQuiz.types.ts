export interface CampaignQuizOption {
  id: string;
  text: string;
}

export interface CampaignQuizQuestion {
  id: string;
  position: number;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'mcq_single' | 'true_false' | 'clue_chain' | 'career_path';
  prompt: string;
  details: string[];
  image_url: string | null;
  options: CampaignQuizOption[];
}

export interface CampaignQuizRating {
  average: number | null;
  count: number;
}

export interface CampaignQuizAboutBlock {
  id: string;
  type: 'paragraph' | 'bullet';
  text: string;
}

export interface CampaignQuizRelatedPage {
  slug: string;
  breadcrumb_label: string;
  hero_image_url: string | null;
  hero_image_alt: string;
}

export interface CampaignQuizPage {
  category: 'team' | 'league' | 'quiz_type' | 'article';
  h1: string;
  lede: string;
  about_heading: string;
  about_blocks: CampaignQuizAboutBlock[];
  score_cta: string;
  footer_banner_text: string;
  footer_button_label: string;
  hero_image_url: string | null;
  hero_image_alt: string;
  seo_title: string;
  meta_description: string;
  og_image_url: string | null;
  og_image_alt: string | null;
  breadcrumb_label: string;
  locale_mode: 'en_only' | 'en_ka';
  ka_seo_title: string | null;
  ka_meta_description: string | null;
  ka_h1: string | null;
  ka_lede: string | null;
  related_pages: CampaignQuizRelatedPage[];
  updated_at: string;
  /** Last real change of the page's copy, images or questions; absent from older backends. */
  content_modified_at?: string;
}

/** Public slug per language of a page; older backends do not send it (the hardcoded tables then decide). */
export type CampaignQuizPublicSlugs = Partial<Record<'en' | 'ka' | 'es' | 'ru' | 'pt' | 'de' | 'tr' | 'fr', string>>;

export interface CampaignQuizHubPage {
  slug: string;
  category: CampaignQuizPage['category'];
  h1: string;
  breadcrumb_label: string;
  hero_image_url: string | null;
  hero_image_alt: string;
  locale_mode: CampaignQuizPage['locale_mode'];
  updated_at: string;
  content_modified_at?: string;
  public_slugs?: CampaignQuizPublicSlugs;
}

export interface CampaignQuizRoute {
  kind: 'page' | 'redirect' | 'gone' | 'missing';
  slug: string;
  target_slug: string | null;
  /** Registry backends, asked with a locale: the public slug of the page (page) or of the target (redirect). */
  public_slug?: string | null;
}

export interface CampaignQuiz {
  slug: string;
  title: string;
  total_questions: number;
  difficulty_counts?: {
    easy: number;
    medium: number;
    hard: number;
  };
  questions: CampaignQuizQuestion[];
  rating: CampaignQuizRating;
  page: CampaignQuizPage | null;
  /**
   * Which language editions exist (a missing one is served in English). Absent from older backends, as is any language
   * a backend predates. ka, pt, de, tr and fr also need every question of the set in that language.
   */
  editions?: { ka: boolean; es: boolean; ru: boolean; pt?: boolean; de?: boolean; tr?: boolean; fr?: boolean };
  /** The question set version of this round; answers send it back so a refresh mid-round cannot break the round. */
  set_version?: number;
  public_slugs?: CampaignQuizPublicSlugs;
}

export interface CampaignQuizAnswer {
  correct: boolean;
  correct_option_id: string;
  explanation: string | null;
}
