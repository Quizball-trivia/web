import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LeaderboardEntry } from "@/lib/domain/leaderboard";
import { LeaderboardTable } from "../LeaderboardTable";

vi.mock("next/image", () => ({ default: (props: { alt?: string }) => <img alt={props.alt ?? ""} /> }));
vi.mock("@/components/TierFrameAvatar", () => ({ TierFrameAvatar: () => <div /> }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/hooks/useActiveEventMode", () => ({ useActiveEventMode: () => ({ isEventMode: false }) }));
vi.mock("@/hooks/useTierLabel", () => ({ useTierLabel: () => (tier: string) => tier }));

const entry: LeaderboardEntry = {
  id: "u1", rank: 1, username: "PLAYMAKERWITHAVERYLONGNAME", tier: "Youth Prospect", rankPoints: 1200, avatar: "avatar-1", avatarCustomization: null, country: null,
  isCurrentUser: false, trend: "same", trendValue: 0,
};

describe("LeaderboardTable name wrapping", () => {
  it("truncates by default (app leaderboard unchanged)", () => {
    render(<LeaderboardTable entries={[entry]} />);
    expect(screen.getByText(entry.username).className).toContain("truncate");
  });

  it("compact rows wrap names and tiers instead of clipping (public Tic Tac Toe / Auction boards)", () => {
    render(<LeaderboardTable entries={[entry]} compact />);
    const name = screen.getByText(entry.username);
    expect(name.className).not.toContain("truncate");
    expect(name.className).toContain("[overflow-wrap:break-word]");
    expect(name.className).toContain("whitespace-normal");
    expect(screen.getByText("Youth Prospect").className).not.toContain("truncate");
  });
});
