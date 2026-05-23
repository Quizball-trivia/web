import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/seo/site";
import { PrivacyClient } from "./PrivacyClient";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy Policy for ${SITE_NAME} — how we collect, use, and protect data when you play our football trivia game.`,
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
