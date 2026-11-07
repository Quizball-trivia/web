import { beforeEach, describe, expect, it, vi } from "vitest";
import { chosenAccountLanguage, clearSignupLocale, rememberSignupLocale, takeSignupLocale } from "../signupLocale";

describe("the pending signup language", () => {
  beforeEach(() => { localStorage.clear(); vi.useRealTimers(); });

  it.each(["/fr", "/de/fussballspiele/nationen-rennen"])("remembers the language of %s without touching the saved one", (path) => {
    localStorage.setItem("quizball_locale", JSON.stringify("ka"));
    window.history.pushState({}, "", path);
    rememberSignupLocale();
    expect(localStorage.getItem("quizball_locale")).toBe(JSON.stringify("ka"));
    expect(takeSignupLocale()).toBe(path.split("/")[1]);
    expect(takeSignupLocale()).toBeNull();
  });

  it("an address with no language forgets an older pending one", () => {
    window.history.pushState({}, "", "/fr");
    rememberSignupLocale();
    window.history.pushState({}, "", "/play");
    rememberSignupLocale();
    expect(takeSignupLocale()).toBeNull();
  });

  it("expires after a day, and ignores what it does not recognise", () => {
    localStorage.setItem("quizball_signup_locale", JSON.stringify({ locale: "fr", at: Date.now() - 25 * 60 * 60 * 1000 }));
    expect(takeSignupLocale()).toBeNull();
    localStorage.setItem("quizball_signup_locale", JSON.stringify({ locale: "xx", at: Date.now() }));
    expect(takeSignupLocale()).toBeNull();
    localStorage.setItem("quizball_signup_locale", JSON.stringify({ locale: "fr", at: Date.now() }));
    clearSignupLocale();
    expect(takeSignupLocale()).toBeNull();
  });
});

describe("chosenAccountLanguage", () => {
  const user = (preferred_language: string | null, onboarding_complete: boolean, favorite_club: string | null = null) => ({ preferred_language, onboarding_complete, favorite_club });

  it.each([
    ["signed out", null, undefined],
    ["the column default on a new account", user("en", false), null],
    ["a blank club is not a saved profile", user("en", false, " "), null],
    ["no language at all", user(null, false), null],
    ["any other language, onboarding unfinished", user("de", false), "de"],
    ["English saved with the profile, onboarding unfinished", user("en", false, "Northwick Rovers"), "en"],
    ["English on a completed account", user("en", true), "en"],
    ["a language on a completed account", user("ka", true), "ka"],
  ])("%s", (_label, input, expected) => {
    expect(chosenAccountLanguage(input)).toBe(expected);
  });
});
