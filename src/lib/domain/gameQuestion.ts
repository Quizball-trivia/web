export interface GameQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  categoryId?: string;
  categoryName?: string;
  difficulty?: "easy" | "medium" | "hard" | string;
  explanation?: string;
}
