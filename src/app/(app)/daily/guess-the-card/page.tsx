import { redirect } from "next/navigation";

/** FIFA Cards was replaced by Card Detective; keep old links working. */
export default function GuessTheCardRedirect() {
  redirect("/daily/challenges/cardDetective");
}
