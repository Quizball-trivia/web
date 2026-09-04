import { describe, expect, it } from "vitest";

import { optimizedRemoteImageProps, preloadableRemoteImageUrl } from "./remoteImage";

const SUPABASE_PNG =
  "https://lfbwhxvwubzeqkztghok.supabase.co/storage/v1/object/public/imgs/question-images/a/b.png";

function originUrlFrom(optimizerSrc: string): string {
  // Next's optimizer URL is /_next/image?url=<encoded origin url>&w=..&q=..
  const url = new URL(optimizerSrc, "https://quizball.io");
  return decodeURIComponent(url.searchParams.get("url") ?? "");
}

describe("optimizedRemoteImageProps — origin fetch URL", () => {
  it("routes own Supabase objects through the transform endpoint", () => {
    const { src } = optimizedRemoteImageProps(SUPABASE_PNG, 320);
    const origin = originUrlFrom(src);
    expect(origin).toContain("/storage/v1/render/image/public/");
    expect(origin).not.toContain("/storage/v1/object/public/");
  });

  it("caps the width the optimizer pulls from origin and asks for webp", () => {
    const { src } = optimizedRemoteImageProps(SUPABASE_PNG, 320);
    const origin = new URL(originUrlFrom(src));
    // Without a width the transform endpoint returns the full-size render,
    // which would defeat the point of the rewrite.
    expect(origin.searchParams.get("width")).toBe("1080");
    expect(origin.searchParams.get("format")).toBe("webp");
  });

  it("preserves the object path exactly", () => {
    const { src } = optimizedRemoteImageProps(SUPABASE_PNG, 320);
    expect(originUrlFrom(src)).toContain("/imgs/question-images/a/b.png");
  });

  it("leaves third-party hosts untouched", () => {
    // external_fallback question images point at arbitrary domains; they are
    // not covered by remotePatterns and would 400 in the optimizer.
    const external = "https://upload.wikimedia.org/wikipedia/commons/x.jpg";
    expect(optimizedRemoteImageProps(external, 320)).toEqual({ src: external });
  });

  it("leaves relative and invalid URLs untouched", () => {
    expect(optimizedRemoteImageProps("/assets/coin.png", 64)).toEqual({ src: "/assets/coin.png" });
    expect(optimizedRemoteImageProps("not a url", 64)).toEqual({ src: "not a url" });
  });

  it("does not rewrite signed or private storage URLs", () => {
    const signed =
      "https://lfbwhxvwubzeqkztghok.supabase.co/storage/v1/object/sign/imgs/a.png?token=abc";
    expect(optimizedRemoteImageProps(signed, 320)).toEqual({ src: signed });
  });
});

describe("preloadableRemoteImageUrl", () => {
  it("preloads a transform-endpoint URL, matching what the img renders", () => {
    const preload = preloadableRemoteImageUrl(SUPABASE_PNG, 320);
    expect(originUrlFrom(preload)).toContain("/storage/v1/render/image/public/");
  });

  it("returns third-party URLs unchanged", () => {
    const external = "https://example.com/a.png";
    expect(preloadableRemoteImageUrl(external, 320)).toBe(external);
  });
});

describe("oversized sources bypass the transform endpoint", () => {
  it("uses the raw object URL when the source exceeds the transform limit", () => {
    // Supabase answers 400 "source image resolution is too large to process"
    // above ~8 MB; a raw fetch is worse for bytes but still renders.
    const { src } = optimizedRemoteImageProps(SUPABASE_PNG, 320, {
      sourceBytes: 24_277_628,
    });
    expect(originUrlFrom(src)).toContain("/storage/v1/object/public/");
    expect(originUrlFrom(src)).not.toContain("/render/image/");
  });

  it("still transforms sources under the limit", () => {
    const { src } = optimizedRemoteImageProps(SUPABASE_PNG, 320, {
      sourceBytes: 6_921_639,
    });
    expect(originUrlFrom(src)).toContain("/render/image/");
  });
});
