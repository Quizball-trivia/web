"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ObjectivesScreen } from "@/features/objectives";
import { useObjectivesEnabled } from "@/lib/hooks/useObjectivesEnabled";

export default function ObjectivesPage() {
  const router = useRouter();
  const objectivesEnabled = useObjectivesEnabled();

  useEffect(() => {
    if (!objectivesEnabled) {
      router.replace("/play");
    }
  }, [objectivesEnabled, router]);

  if (!objectivesEnabled) {
    return null;
  }

  return (
    <ObjectivesScreen
      onBack={() => router.back()}
    />
  );
}
