import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GlobalError from "../global-error";

const location = { pathname: "/tic-tac-toe", host: "quizball.io", reload: vi.fn(), assign: vi.fn() };
const chunkError = Object.assign(new Error("Loading chunk 4821 failed."), { name: "ChunkLoadError" });
const action = (name: string) => document.querySelector<HTMLButtonElement>(`[data-recovery-action="${name}"]`);

describe("root recovery screen", () => {
  beforeEach(() => {
    location.pathname = "/tic-tac-toe";
    location.host = "quizball.io";
    location.reload.mockClear();
    location.assign.mockClear();
    vi.stubGlobal("location", location);
    localStorage.clear();
    document.documentElement.lang = "en";
    // React reports <html> rendered inside the test container; the screen owns the document in the app.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("offers a reload in the player's language for a failed script and never reloads by itself", async () => {
    localStorage.setItem("quizball_locale", JSON.stringify("es"));
    render(<GlobalError error={chunkError} reset={() => {}} />);
    expect(await screen.findByText("Algo ha fallado")).toBeInTheDocument();
    expect(document.querySelector('[data-recovery="load"]')).not.toBeNull();
    expect(location.reload).not.toHaveBeenCalled();
    action("reload")!.click();
    expect(location.reload).toHaveBeenCalledTimes(1);
    action("home")!.click();
    expect(location.assign).toHaveBeenCalledWith("/");
  });

  it("uses the language the page had when nothing is saved", async () => {
    document.documentElement.lang = "ka";
    render(<GlobalError error={new TypeError("Cannot read properties of undefined")} reset={() => {}} />);
    expect(await screen.findByText("რაღაც შეფერხდა")).toBeInTheDocument();
    expect(document.querySelector('[data-recovery="crash"]')).not.toBeNull();
  });

  it("sends the ranked quiz back to the app instead of offering a reload", async () => {
    location.pathname = "/game";
    render(<GlobalError error={chunkError} reset={() => {}} />);
    await waitFor(() => expect(action("home")).not.toBeNull());
    expect(action("reload")).toBeNull();
    expect(screen.getByText(/rejoin your match/)).toBeInTheDocument();
  });

  it("tells a partner launch to reopen the game and does not send it to Quizball", async () => {
    location.host = "freecroco.quizball.io";
    render(<GlobalError error={chunkError} reset={() => {}} />);
    await waitFor(() => expect(action("reload")).not.toBeNull());
    expect(action("home")).toBeNull();
    expect(screen.getByText(/from the site you came from/)).toBeInTheDocument();
  });
});
