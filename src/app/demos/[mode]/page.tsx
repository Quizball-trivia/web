"use client";

import { Suspense } from "react";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { DemoModeView } from "@/features/demos/DemoModeView";
import { findDemoMode } from "@/features/demos/demoModes";

const DEMO_BACK = "/demos";
/** Entry points outside the demos catalogue (e.g. /play, /mini-games) pass
 *  ?from= so the in-game back button returns where the player came from.
 *  Allowlisted to internal paths only. */
const ALLOWED_BACK = new Set(["/demos", "/play", "/mini-games"]);

export default function DemoModePage() {
  return (
    <Suspense fallback={null}>
      <DemoModePageInner />
    </Suspense>
  );
}

function DemoModePageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");
  const backHref = fromParam && ALLOWED_BACK.has(fromParam) ? fromParam : DEMO_BACK;
  const slug = String(params.mode ?? "");
  if (!findDemoMode(slug)) notFound();
  return <DemoModeView slug={slug} backHref={backHref} />;
}
