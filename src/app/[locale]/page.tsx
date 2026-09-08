import type { Metadata } from "next";
import { HomePage, homeMetadata } from "@/features/marketing/publicGamePage";
import { LOCALES } from "@/lib/i18n/locale";

type Params = Promise<{ locale: string }>;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return homeMetadata(params);
}

/** The locale homepage is Quizball's Football Games hub: indexable, self-canonical, guest-first. */
export default function Page({ params }: { params: Params }) {
  return <HomePage params={params} />;
}
