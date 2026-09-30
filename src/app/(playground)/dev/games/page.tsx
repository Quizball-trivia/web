import { GamesPlayground } from "@/features/playground/GamesPlayground";

export const metadata = { title: "Games playground", robots: { index: false, follow: false } };

export default function GamesPlaygroundPage() {
  return <GamesPlayground />;
}
