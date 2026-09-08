import type { Metadata } from "next";
import { HubPage, hubMetadata } from "@/features/marketing/hubPage";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return hubMetadata("games", params);
}

export default function Page({ params }: { params: Params }) {
  return <HubPage kind="games" params={params} />;
}
