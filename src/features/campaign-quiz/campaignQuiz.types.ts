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
}

export interface CampaignQuizHubPage {
  slug: string;
  category: CampaignQuizPage['category'];
  h1: string;
  breadcrumb_label: string;
  hero_image_url: string | null;
  hero_image_alt: string;
  locale_mode: CampaignQuizPage['locale_mode'];
  updated_at: string;
}

export interface CampaignQuizRoute {
  kind: 'page' | 'redirect' | 'gone' | 'missing';
  slug: string;
  target_slug: string | null;
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
}

export interface CampaignQuizAnswer {
  correct: boolean;
  correct_option_id: string;
  explanation: string | null;
}
