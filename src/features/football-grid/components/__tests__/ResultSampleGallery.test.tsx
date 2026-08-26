import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type {
  FootballGridCompletedPayload,
  FootballGridState,
} from "@/lib/realtime/socket.types";
import { ResultSampleGallery } from "../../FootballGridFlowScreen";

const board = {
  boardId: "board-1",
  boardVersion: 1,
  checksum: "checksum",
  rows: [0, 1, 2].map((index) => ({
    id: `row-${index}`,
    key: `row-${index}`,
    family: "club" as const,
    labelEn: `Row ${index + 1}`,
    labelKa: `რიგი ${index + 1}`,
    assetKey: null,
    difficulty: "normal" as const,
  })) as FootballGridState["board"]["rows"],
  columns: [0, 1, 2].map((index) => ({
    id: `column-${index}`,
    key: `column-${index}`,
    family: "country" as const,
    labelEn: `Column ${index + 1}`,
    labelKa: `სვეტი ${index + 1}`,
    assetKey: null,
    difficulty: "normal" as const,
  })) as FootballGridState["board"]["columns"],
} satisfies FootballGridState["board"];

const samples: FootballGridCompletedPayload["samples"] = [0, 1, 2].map(
  (cellIndex) => ({
    cellIndex,
    players: [0, 1, 2].map((playerIndex) => ({
      playerId: `player-${cellIndex}-${playerIndex}`,
      name: `Player ${cellIndex}-${playerIndex}`,
      imageUrl: null,
      imageAssetKey: `/assets/football-grid/players/player-${cellIndex}-${playerIndex}.webp`,
    })),
  }),
);

describe("ResultSampleGallery", () => {
  it("shows distinct player cards and the clue pair for each visible cell", () => {
    const { container } = render(
      <ResultSampleGallery
        samples={samples}
        board={board}
        locale="en"
        title="Other valid answers"
        body="Different examples for each intersection"
      />,
    );

    expect(screen.getByText("Other valid answers")).toBeInTheDocument();
    // Each card renders twice: once in the mobile pager, once in the desktop
    // 3-up grid (the auction AllSquads pattern) — except the mobile pager only
    // mounts its ACTIVE card, so cell 1 appears twice and cells 2/3 once.
    expect(screen.getAllByText("Row 1 × Column 1")).toHaveLength(2);
    expect(screen.getAllByText("Row 1 × Column 2")).toHaveLength(1);
    expect(screen.getAllByText("Row 1 × Column 3")).toHaveLength(1);
    expect(screen.getAllByText(/^Player /)).toHaveLength(12);
    expect(container.querySelectorAll("img")).toHaveLength(12);
  });

  it("cycles the mobile pager between the three intersections", () => {
    render(
      <ResultSampleGallery
        samples={samples}
        board={board}
        locale="en"
        title="Other valid answers"
        body="Different examples for each intersection"
      />,
    );

    const [tabOne, tabTwo, tabThree] = [1, 2, 3].map((n) =>
      screen.getByRole("button", { name: String(n) }),
    );
    expect(tabOne).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(tabThree);
    expect(tabThree).toHaveAttribute("aria-pressed", "true");
    expect(tabTwo).toHaveAttribute("aria-pressed", "false");
    // Cell 3's card is now in the mobile pager AND the desktop grid.
    expect(screen.getAllByText("Row 1 × Column 3")).toHaveLength(2);
    expect(screen.getAllByText("Row 1 × Column 1")).toHaveLength(1);
  });
});
