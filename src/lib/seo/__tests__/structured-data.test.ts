import { describe, expect, it } from "vitest";
import { SOCIAL_LINKS } from "@/lib/social-links";
import {
  buildEditorialPageStructuredData,
  buildSiteStructuredData,
  serializeJsonLd,
  SITE_SCHEMA_IDS,
} from "../structured-data";

describe("site structured data", () => {
  it("connects QuizBall's organization, website and game entities", () => {
    const data = buildSiteStructuredData();
    const graph = data["@graph"];
    const organization = graph.find((node) => node["@id"] === SITE_SCHEMA_IDS.organization);
    const website = graph.find((node) => node["@id"] === SITE_SCHEMA_IDS.website);
    const game = graph.find((node) => node["@id"] === SITE_SCHEMA_IDS.game);

    expect(organization).toMatchObject({
      "@type": "Organization",
      logo: {
        url: "https://quizball.io/assets/brand/quizball-icon-512.png",
        width: 512,
        height: 512,
      },
      sameAs: Object.values(SOCIAL_LINKS),
      publishingPrinciples: "https://quizball.io/en/editorial-methodology",
    });
    expect(website).toMatchObject({
      publisher: { "@id": SITE_SCHEMA_IDS.organization },
      about: { "@id": SITE_SCHEMA_IDS.game },
    });
    expect(game).toMatchObject({
      publisher: { "@id": SITE_SCHEMA_IDS.organization },
      isPartOf: { "@id": SITE_SCHEMA_IDS.website },
    });
  });

  it("contains only the official profiles from the shared social-link source", () => {
    const organization = buildSiteStructuredData()["@graph"][0];

    expect(organization.sameAs).toEqual(Object.values(SOCIAL_LINKS));
    expect(organization.sameAs).toHaveLength(2);
  });

  it("escapes markup when serializing JSON-LD", () => {
    expect(serializeJsonLd({ value: "</script>" })).toBe('{"value":"\\u003c/script>"}');
  });
});

describe("editorial page structured data", () => {
  it("describes the localized methodology page as part of the site entity graph", () => {
    expect(buildEditorialPageStructuredData({
      locale: "es",
      path: "/editorial-methodology",
      title: "Metodología editorial",
      description: "Cómo revisamos preguntas.",
      pageType: "WebPage",
    })).toMatchObject({
      "@id": "https://quizball.io/es/editorial-methodology#webpage",
      inLanguage: "es",
      dateModified: "2026-08-30",
      isPartOf: { "@id": SITE_SCHEMA_IDS.website },
      about: { "@id": SITE_SCHEMA_IDS.organization },
    });
  });
});
