"use client";

import { Season3Survey } from "@/features/season3/Season3Survey";
import { Suspense } from "react";
import { PlayHome } from "@/features/play/PlayHome";
import { GuestHubRedirect } from "@/features/play/GuestHubRedirect";

export default function PlayPage() {
  return (
    <Suspense fallback={null}>
      <GuestHubRedirect />
      <PlayHome />
      <Season3Survey />
    </Suspense>
  );
}
