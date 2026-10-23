import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/features/codenames/codenames.board", () => ({ takeRoomPreset: () => preset.take() }));
const preset = { take: () => false };
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "en", t: (key: string) => key }) }));

const { CodenamesRoomOptions, readCodenamesOptions, writeCodenamesOptions } = await import("../CodenamesRoomOptions");

describe("CodenamesRoomOptions", () => {
  it("reads and writes the board and the timer, nothing for a plain picture board", () => {
    expect(writeCodenamesOptions(readCodenamesOptions(null))).toBeNull();
    expect(readCodenamesOptions({ board: "words", lang: "es", timer: 90 })).toEqual({ board: "words", lang: "es", timer: 90 });
    expect(readCodenamesOptions({ timer: 45 }).timer).toBeNull();
    expect(writeCodenamesOptions({ board: "pictures", lang: null, timer: 60 })).toEqual({ timer: 60 });
  });

  it("a second pick before the room answers builds on the first", () => {
    const onChange = vi.fn();
    render(<CodenamesRoomOptions options={null} canEdit onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: /words/i }));
    fireEvent.click(screen.getByRole("radio", { name: "60 s" }));
    expect(onChange).toHaveBeenLastCalledWith({ board: "words", lang: "en", timer: 60 });
  });

  it("only the host can change them", () => {
    const onChange = vi.fn();
    render(<CodenamesRoomOptions options={{ timer: 90 }} canEdit={false} onChange={onChange} />);
    expect(screen.getByRole("radio", { name: "90 s" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "60 s" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("a timer picked right after the Words preset keeps Words", async () => {
    preset.take = () => true;
    const onChange = vi.fn();
    render(<CodenamesRoomOptions options={null} canEdit onChange={onChange} />);
    await act(async () => {});
    expect(onChange).toHaveBeenLastCalledWith({ board: "words", lang: "en" });
    fireEvent.click(screen.getByRole("radio", { name: "90 s" }));
    expect(onChange).toHaveBeenLastCalledWith({ board: "words", lang: "en", timer: 90 });
    preset.take = () => false;
  });
});
