import { poppins } from "@/features/wordgames/ui";
import { chainLetters } from "./chainLetter";

/** A name with the letter the chain hangs on picked out. */
export function Lettered({ name, className }: { name: string; className?: string }) {
  const { letters, at } = chainLetters(name);
  return <span className={className} style={poppins}>{letters.map((ch, i) => <span key={i} className={i === at ? "text-brand-yellow" : undefined}>{ch}</span>)}</span>;
}
