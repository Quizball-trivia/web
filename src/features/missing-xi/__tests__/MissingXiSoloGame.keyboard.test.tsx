import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { MissingXiSession } from "@/lib/domain/dailyChallenge";
import { MissingXiSoloGame } from "../MissingXiSoloGame";

vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({
    locale: "en",
    t: (key: string, vars?: Record<string, string>) => (vars ? `${key}:${vars.position}` : key),
  }),
}));
vi.mock("@/features/daily/components/DailyGameStage", () => ({
  DailyGameStage: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/features/daily/components/DailyChallengeHeader", () => ({ DailyChallengeHeader: () => null }));
vi.mock("@/features/daily/components/DailyChallengeCompleteModal", () => ({ DailyChallengeCompleteModal: () => null }));
vi.mock("@/features/daily/QuitGameDialog", () => ({ QuitGameDialog: () => null }));

const slot = (id: string, position: string, name: string, x: number, y: number) => ({
  id, position, number: null, x, y, name, acceptedAnswers: [name], imageUrl: null,
});

const session = {
  challengeType: "missingXi",
  title: "Missing XI",
  description: "",
  squadCount: 1,
  secondsPerSquad: 120,
  squads: [{
    id: "s1",
    difficulty: "easy",
    team: "Real Madrid",
    opponent: "Atlético",
    matchLabel: "Final",
    score: null,
    formation: "4-3-3",
    slots: [
      slot("gk", "GK", "Navas", 50, 90),
      slot("lb", "LB", "Marcelo", 14, 72),
      slot("lcb", "CB", "Ramos", 38, 72),
      slot("rcb", "CB", "Pepe", 62, 72),
      slot("rb", "RB", "Carvajal", 86, 72),
      slot("lcm", "CM", "Kroos", 22, 48),
      slot("cm", "DM", "Casemiro", 50, 48),
      slot("rcm", "CM", "Modric", 78, 48),
      slot("lw", "LW", "Ronaldo", 22, 22),
      slot("cf", "CF", "Benzema", 50, 22),
      slot("rw", "RW", "Bale", 78, 22),
    ],
  }],
} as unknown as MissingXiSession;

describe("MissingXiSoloGame keyboard flow", () => {
  it("moves straight to the next empty shirt after a correct name and keeps the field focused", async () => {
    const user = userEvent.setup();
    render(<MissingXiSoloGame session={session} onBack={() => {}} onComplete={() => {}} practice />);

    await user.click(screen.getByRole("button", { name: "LB" }));
    expect(screen.getByRole("textbox")).toHaveFocus();
    await user.keyboard("Marcelo{Enter}");

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("placeholder", "missingXi.whoStarted:CB");
    expect(input).toHaveFocus();
    expect(screen.getByRole("button", { name: "CB", pressed: true })).toBeInTheDocument();
  });

  it("moves between formation lines from the answer field and stops at the pitch's end", async () => {
    const user = userEvent.setup();
    render(<MissingXiSoloGame session={session} onBack={() => {}} onComplete={() => {}} practice />);
    await user.click(screen.getByRole("button", { name: "LB" }));
    await user.keyboard("{ArrowUp}");
    // The line ahead (midfield), not the next shirt along the back line (LCB).
    expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "missingXi.whoStarted:CM");
    await user.keyboard("{ArrowUp}{ArrowUp}");
    // Attack is the last line: a further ↑ keeps the selection rather than wrapping to the keeper.
    expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "missingXi.whoStarted:LW");
  });

  it("switches shirts with arrow keys and backs out with Escape", async () => {
    const user = userEvent.setup();
    render(<MissingXiSoloGame session={session} onBack={() => {}} onComplete={() => {}} practice />);

    // ↑ from RB goes to the line ahead, to the shirt most in line with it (right CM), not along the back line.
    await user.click(screen.getByRole("button", { name: "RB" }));
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "missingXi.whoStarted:CM");
    expect(screen.getByRole("textbox")).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    const rcm = screen.getAllByRole("button", { name: "CM" })[1];
    expect(rcm).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: "DM" })).toHaveFocus();
  });
});
