"use client";

import { Question } from '../types/game';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: number | null;
  onSelectAnswer: (index: number) => void;
  showResult: boolean;
  isCorrect?: boolean;
  hiddenAnswers?: number[];
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onSelectAnswer,
  showResult,
  isCorrect,
  hiddenAnswers = [],
}: QuestionCardProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'hard':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default:
        return '';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="text-muted-foreground">
            Question {questionNumber} of {totalQuestions}
          </span>
          <div className="flex gap-1.5">
            <Badge variant="outline" className={`${getDifficultyColor(question.difficulty)} text-xs`}>
              {question.difficulty}
            </Badge>
            <Badge variant="secondary" className="text-xs">{question.category}</Badge>
          </div>
        </div>
        <CardTitle className="text-base leading-relaxed">{question.question}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2.5">
          {question.options.map((option, index) => {
            const isHidden = hiddenAnswers.includes(index);
            const isSelected = selectedAnswer === index;
            const isCorrectAnswer = index === question.correctAnswer;
            
            // Don't render hidden answers
            if (isHidden && !showResult) {
              return (
                <div
                  key={index}
                  className="w-full p-3.5 rounded-lg bg-muted/30 border-2 border-dashed border-muted-foreground/20 opacity-50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background/50 text-xs text-muted-foreground">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="leading-relaxed text-muted-foreground text-sm">Hidden by 50/50</span>
                  </div>
                </div>
              );
            }
            
            let buttonStyle = 'bg-secondary hover:bg-secondary/80';
            
            if (showResult) {
              if (isCorrectAnswer) {
                buttonStyle = 'bg-green-500/20 border-2 border-green-500 text-green-700 dark:text-green-400';
              } else if (isSelected && !isCorrect) {
                buttonStyle = 'bg-red-500/20 border-2 border-red-500 text-red-700 dark:text-red-400';
              }
            } else if (isSelected) {
              buttonStyle = 'bg-primary text-primary-foreground';
            }

            return (
              <button
                key={index}
                onClick={() => !showResult && onSelectAnswer(index)}
                disabled={showResult || isHidden}
                className={`w-full p-3.5 rounded-lg text-left transition-all text-sm ${buttonStyle} ${
                  !showResult && !isHidden ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background/50 text-xs">
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="leading-relaxed">{option}</span>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
