"use client";

import { useRouter } from "next/navigation";

import { ObjectivesScreen } from "@/features/objectives";

export default function ObjectivesPage() {
  const router = useRouter();

  return (
    <ObjectivesScreen
      onBack={() => router.back()}
    />
  );
}
