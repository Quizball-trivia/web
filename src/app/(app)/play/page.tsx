"use client";

import { Suspense } from "react";
import { PlayHome } from "@/features/play/PlayHome";
import { GuestHubRedirect } from "@/features/play/GuestHubRedirect";

export default function PlayPage() {
  return (
    <Suspense fallback={null}>
      <GuestHubRedirect />
      <PlayHome />
    </Suspense>
  );
}
