"use client";

import { Suspense } from "react";
import { Season3Survey } from "@/features/season3/Season3Survey";
import { GuestHubRedirect } from "@/features/play/GuestHubRedirect";
import { PlayHome } from "@/features/play/PlayHome";

export function PlayPageBody() {
  return (
    <Suspense fallback={null}>
      <GuestHubRedirect />
      <PlayHome />
      <Season3Survey />
    </Suspense>
  );
}
