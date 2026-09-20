import { redirect } from "next/navigation";

/**
 * The daily-challenges hub is retired — every daily now lives in the Play
 * screen's "Daily Challenges" row. Kept as a redirect (not deleted) so old
 * links, bookmarks, and any lingering navigation land on /play instead of a
 * dead page. The `/daily/challenges/[challengeType]` game routes are unaffected.
 */
export default function DailyChallengesHubRedirect() {
  redirect("/play");
}
