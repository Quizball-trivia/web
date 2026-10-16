"use client";

import { notFound, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { LeaderboardPreview } from "@/features/leaderboard/preview/LeaderboardPreview";

export default function LeaderboardPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <PreviewWithScenario />
    </Suspense>
  );
}

function PreviewWithScenario() {
  const params = useSearchParams();
  const scenario = params.get("s") ?? "global";
  const member = params.get("as") === "member";
  return <LeaderboardPreview key={`${scenario}-${member}`} scenario={scenario} member={member} />;
}
