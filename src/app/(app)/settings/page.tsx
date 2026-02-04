"use client";

import { useRouter } from "next/navigation";
import { SettingsScreen } from "@/features/settings/SettingsScreen";

export default function SettingsPage() {
  const router = useRouter();

  return <SettingsScreen onBack={() => router.push("/")} />;
}
