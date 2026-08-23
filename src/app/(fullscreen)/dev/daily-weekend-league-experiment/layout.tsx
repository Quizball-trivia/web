import { notFound } from "next/navigation";

export default function DailyWeekendLeagueExperimentPreviewLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Analytics is configured in production only. Use that project-level signal
  // because this Vercel project does not expose VERCEL_ENV to the runtime.
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    notFound();
  }

  return children;
}
