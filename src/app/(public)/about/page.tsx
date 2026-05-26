import type { Metadata } from "next";
import { AboutClient } from "./AboutClient";

export const metadata: Metadata = {
  title: "About QuizBall – Multiplayer Football Trivia Game",
  description:
    "Learn about QuizBall, a multiplayer football trivia game where fans answer questions, control possession, score goals, and compete with friends.",
  alternates: { canonical: "/about" },
  robots: { index: true, follow: true },
};

export default function AboutPage() {
  return <AboutClient />;
}
