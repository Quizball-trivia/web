"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { WeekendLeagueScreen } from "@/features/weekend-league/WeekendLeagueScreen";
import { useLocale } from "@/contexts/LocaleContext";

const poppins = { fontFamily: "'Poppins', sans-serif" };

export function DemoWeekendLeague() {
  const router = useRouter();
  const { locale } = useLocale();

  return (
    <div className="min-h-dvh w-full bg-surface-page">
      <div className="mx-auto flex w-full max-w-2xl items-center px-4 pt-4">
        <button
          type="button"
          onClick={() => router.push("/demos")}
          className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-white/70 transition-colors hover:bg-white/15 hover:text-white"
          style={poppins}
        >
          <ArrowLeft className="h-4 w-4" />
          {locale === "ka" ? "დემოები" : "Demos"}
        </button>
      </div>
      <WeekendLeagueScreen
        showControls={false}
        initial={{ phase: "qualifier_live", hasEntered: true }}
      />
    </div>
  );
}
