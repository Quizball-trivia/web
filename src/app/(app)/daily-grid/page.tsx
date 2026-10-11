"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { GridDailyGame } from "@/features/grid-daily/GridDailyGame";
import { useLocale } from "@/contexts/LocaleContext";

function GridDailyRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  // Read once: a reload reopens the same day.
  const [day] = useState(() => searchParams.get("dia"));
  return <GridDailyGame locale={locale} initialDay={day} onExit={() => router.push("/play")} />;
}

/** Daily grid: one Tic Tac Toe board a day, played alone. */
export default function GridDailyPage() {
  return (
    <Suspense fallback={null}>
      <GridDailyRoute />
    </Suspense>
  );
}
