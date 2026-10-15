import { PlayOrderProvider } from "@/features/play/PlayOrderProvider";
import { loadPlayOrder } from "@/features/play/playOrder.server";
import { PlayPageBody } from "./PlayPageBody";

export default async function PlayPage() {
  return (
    <PlayOrderProvider value={await loadPlayOrder()}>
      <PlayPageBody />
    </PlayOrderProvider>
  );
}
