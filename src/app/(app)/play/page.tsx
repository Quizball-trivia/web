"use client";

import { Suspense } from "react";
import { PlayHome } from "@/features/play/PlayHome";

export default function PlayPage() {
  return (
    <Suspense fallback={null}>
      <PlayHome />
    </Suspense>
  );
}
