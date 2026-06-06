export interface GameQuestionImage {
  url: string;
  width: number;
  height: number;
  aspectRatio?: string;
}

export interface GameQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  image?: GameQuestionImage;
  categoryId?: string;
  categoryName?: string;
  difficulty?: "easy" | "medium" | "hard" | string;
  explanation?: string;
}
