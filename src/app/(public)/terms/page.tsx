import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/seo/site";
import { TermsClient } from "./TermsClient";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of Service for ${SITE_NAME} — the rules for playing our football trivia game and using the platform.`,
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return <TermsClient />;
}
