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

export interface CampaignQuiz {
  slug: string;
  title: string;
  total_questions: number;
  questions: CampaignQuizQuestion[];
  rating: CampaignQuizRating;
}

export interface CampaignQuizAnswer {
  correct: boolean;
  correct_option_id: string;
  explanation: string | null;
}
