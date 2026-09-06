import { redirect } from "next/navigation";
import { dailyChallengePlayPath } from "@/lib/domain/dailyChallengeSlugs";

/** Missing XI is a daily challenge; the short URL just forwards to it. */
export default function MissingXiPage() {
  redirect(dailyChallengePlayPath("missingXi"));
}
