import { notFound } from "next/navigation";

export default function DailyWeekendLeagueExperimentPreviewLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }

  return children;
}
