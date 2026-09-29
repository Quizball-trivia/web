import type { Metadata } from "next";
import { DuelScreen } from "@/features/duel/DuelScreen";

export const metadata: Metadata = { title: "Duelo | QuizBall", robots: { index: false, follow: false } };

export default async function DuelPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  return <DuelScreen matchId={matchId} />;
}
