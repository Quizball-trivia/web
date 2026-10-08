import type { Metadata } from "next";
import { RoomScreen } from "@/features/room/RoomScreen";

export const metadata: Metadata = { title: "Sala | QuizBall", robots: { index: false, follow: false } };

export default async function RoomMatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  return <RoomScreen matchId={matchId} />;
}
