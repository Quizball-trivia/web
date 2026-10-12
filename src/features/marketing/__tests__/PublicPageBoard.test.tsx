import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ declarations: 0 }));
vi.mock("next/dynamic", () => ({
  default: () => {
    const name = ["topTen", "buscaminas", "pistas", "ultimo", "minuto", "statSniper"][state.declarations++];
    return (props: Record<string, unknown>) => <div data-testid="board" data-board={name} data-props={JSON.stringify(props)} />;
  },
}));

import { PublicPageBoard, type PageBoardMode } from "../public/PublicPageBoard";

describe("PublicPageBoard", () => {
  it.each(["ranked", "grid", "auction", "buscaminas", "pistas", "ultimo", "minuto", "statSniper"] satisfies PageBoardMode[])("renders only the selected %s implementation with its original props", (modeId) => {
    render(<PublicPageBoard modeId={modeId} locale="tr" playPath="/play/stat-sniper" className="mt-4" />);
    expect(screen.getAllByTestId("board")).toHaveLength(1);
    const board = screen.getByTestId("board");
    if (modeId === "ranked" || modeId === "grid" || modeId === "auction") {
      expect(board).toHaveAttribute("data-board", "topTen");
      expect(JSON.parse(board.dataset.props!)).toEqual({ board: modeId, locale: "tr" });
    } else {
      expect(board).toHaveAttribute("data-board", modeId);
      expect(JSON.parse(board.dataset.props!)).toEqual(modeId === "statSniper"
        ? { modeId, locale: "tr", playPath: "/play/stat-sniper", className: "mt-4" }
        : { locale: "tr", className: "mt-4" });
    }
  });
});
