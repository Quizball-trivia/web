import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("next/image", () => ({ default: ({ alt, width, height, className }: { alt: string; width: number; height: number; className: string }) => <span role="img" aria-label={alt} data-width={width} data-height={height} className={className} /> }));
vi.mock("./../AnimatedAppLogo", () => ({ AnimatedAppLogo: ({ children }: { children: ReactNode }) => <div data-testid="animated-logo">{children}</div> }));

import { AppLogo } from "../AppLogo";

describe("AppLogo loading", () => {
  it.each([["sm", 32], ["md", 64], ["lg", 80], ["xl", 128]] as const)("keeps the static %s logo immediately available", (size, height) => {
    render(<AppLogo size={size} />);
    expect(screen.getByRole("img", { name: "QuizBall Logo" })).toHaveAttribute("data-height", String(height));
    expect(screen.getByRole("img")).toHaveAttribute("data-width", String(height * 4));
    expect(screen.queryByTestId("animated-logo")).not.toBeInTheDocument();
  });

  it("loads the animated variant only when explicitly requested", async () => {
    render(<AppLogo size="sm" animated iconOnly />);
    expect(await screen.findByTestId("animated-logo")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("data-width", "32");
  });
});
