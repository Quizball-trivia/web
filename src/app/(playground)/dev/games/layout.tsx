import { notFound } from "next/navigation";

/** Local development only: the games playground never renders in a deployed build. */
export default function GamesPlaygroundLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (process.env.NODE_ENV !== "development") notFound();
  return children;
}
