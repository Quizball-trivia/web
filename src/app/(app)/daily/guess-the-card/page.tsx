import { redirect } from "next/navigation";

/** The standalone FIFA Cards daily moved onto the shared daily route; keep old links working. */
export default function GuessTheCardRedirect() {
  redirect("/daily/challenges/fifaCards");
}
