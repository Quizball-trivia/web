import { PreviewHost } from "@/features/playground/PreviewHost";

export const metadata = { robots: { index: false, follow: false } };

export default function GamesPlaygroundPreviewPage() {
  return <PreviewHost />;
}
