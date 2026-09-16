import type { Metadata } from "next";

/**
 * The root layout appends " · Quizball" to every page title. Copy that already
 * names the brand ("… | QuizBall", "… — QuizBall") must opt out of the template,
 * otherwise the brand appears twice.
 */
export function seoTitle(title: string): NonNullable<Metadata["title"]> {
  return /quizball/i.test(title) ? { absolute: title } : title;
}
