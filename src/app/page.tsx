import type { Metadata } from "next";
import PublicOnlyGate from "@/components/auth/PublicOnlyGate";
import { WelcomeScreen } from "@/components/auth/WelcomeScreen";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: `${SITE_TAGLINE} — Play 1v1 Football Quiz Duels`,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <PublicOnlyGate>
      <WelcomeScreen />
    </PublicOnlyGate>
  );
}
