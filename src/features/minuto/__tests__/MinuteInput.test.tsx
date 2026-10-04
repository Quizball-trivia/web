import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MinuteInput } from "../MinuteInput";

const typeAndSubmit = (value: string) => {
  fireEvent.change(screen.getByRole("textbox"), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
};

describe("MinuteInput", () => {
  it("submits a whole minute, or added time typed as 90+3", () => {
    const onSubmit = vi.fn();
    render(<MinuteInput locale="en" busy={false} onSubmit={onSubmit} />);
    typeAndSubmit("90+3");
    expect(onSubmit).toHaveBeenLastCalledWith(93);
    typeAndSubmit("47");
    expect(onSubmit).toHaveBeenLastCalledWith(47);
  });

  it("refuses what is not a minute instead of turning it into another one (12.5 is not 125, -3 is not 3)", () => {
    const onSubmit = vi.fn();
    render(<MinuteInput locale="en" busy={false} onSubmit={onSubmit} />);
    // Long input is kept as typed and refused, never cut down to a valid-looking prefix ("90+3000" is not "90+300").
    for (const bad of ["12.5", "-3", "131", "0", "90+3000", "1234567890"]) {
      typeAndSubmit(bad);
      expect(screen.getByRole("alert").textContent).toBe("Type a minute between 1 and 130.");
    }
    expect(onSubmit).not.toHaveBeenCalled();
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("1234567890");
  });
});
