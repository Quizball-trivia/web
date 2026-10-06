import { afterEach, describe, expect, it } from "vitest";
import { PARTNER_LAUNCH_CAPTURE_SCRIPT, takeLaunchToken } from "../partnerLaunchToken";

afterEach(() => window.history.replaceState(null, "", "/"));

const runCaptureScript = () => new Function(PARTNER_LAUNCH_CAPTURE_SCRIPT)();

describe("partner launch token capture", () => {
  it.each([
    ["fragment (after the middleware redirect)", "/?utm_source=fc#token=launch-9", "/?utm_source=fc"],
    ["fragment with other fragment params", "/#a=1&token=launch-9", "/#a=1"],
    ["query (no redirect happened)", "/?token=launch-9&utm_source=fc", "/?utm_source=fc"],
  ])("moves the token from the %s into memory before hydration, leaving no trace in history", (_label, start, clean) => {
    window.history.replaceState({ __NA: true, tree: start }, "", start);

    runCaptureScript();

    expect(window.location.href).not.toContain("launch-9");
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe(clean);
    expect(window.history.state).toBeNull();
    expect(Object.keys(window)).not.toContain("__quizballPartnerLaunch");

    expect(takeLaunchToken()).toBe("launch-9");
    // Read once: a second caller (a remount) gets nothing.
    expect(takeLaunchToken()).toBeNull();
  });

  it("does nothing on a load without a token", () => {
    window.history.replaceState({ keep: 1 }, "", "/play/countdown#x=1");
    runCaptureScript();
    expect(window.history.state).toEqual({ keep: 1 });
    expect(window.location.hash).toBe("#x=1");
    expect(takeLaunchToken()).toBeNull();
  });

  it.each(["/#token=abc", "/?token=abc"])("falls back to the address bar when the capture script did not run (%s)", (start) => {
    window.history.replaceState({ __NA: true }, "", start);
    expect(takeLaunchToken()).toBe("abc");
    expect(window.location.href).not.toContain("abc");
    expect(window.history.state).toBeNull();
  });

  it("treats an empty token as no token but still clears it", () => {
    window.history.replaceState(null, "", "/#token=");
    runCaptureScript();
    expect(window.location.hash).toBe("");
    expect(takeLaunchToken()).toBeNull();
  });
});
