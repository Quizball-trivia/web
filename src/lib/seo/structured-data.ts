import type { Locale } from "@/lib/i18n/locale";
import { SOCIAL_LINKS } from "@/lib/social-links";
import {
  SITE_DESCRIPTION,
  SITE_ICON_PATH,
  SITE_NAME,
  SITE_OG_IMAGE_PATH,
  SITE_URL,
} from "@/lib/seo/site";

export const SITE_SCHEMA_IDS = {
  organization: `${SITE_URL}/#organization`,
  website: `${SITE_URL}/#website`,
  game: `${SITE_URL}/#game`,
  logo: `${SITE_URL}/#logo`,
} as const;

const LANGUAGE_TAG: Record<Locale, string> = {
  en: "en-GB",
  ka: "ka-GE",
  es: "es",
};

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function buildSiteStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": SITE_SCHEMA_IDS.organization,
        name: SITE_NAME,
        alternateName: ["QuizBall", "Quiz Ball"],
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        logo: {
          "@type": "ImageObject",
          "@id": SITE_SCHEMA_IDS.logo,
          url: `${SITE_URL}${SITE_ICON_PATH}`,
          contentUrl: `${SITE_URL}${SITE_ICON_PATH}`,
          width: 512,
          height: 512,
        },
        image: `${SITE_URL}${SITE_OG_IMAGE_PATH}`,
        sameAs: Object.values(SOCIAL_LINKS),
        knowsAbout: [
          "Football trivia",
          "Football quizzes",
          "Association football",
          "Football clubs",
          "Football players",
        ],
        publishingPrinciples: `${SITE_URL}/en/editorial-methodology`,
      },
      {
        "@type": "WebSite",
        "@id": SITE_SCHEMA_IDS.website,
        name: SITE_NAME,
        alternateName: "QuizBall",
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        publisher: { "@id": SITE_SCHEMA_IDS.organization },
        about: { "@id": SITE_SCHEMA_IDS.game },
        inLanguage: ["en", "ka", "es"],
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/social?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "VideoGame",
        "@id": SITE_SCHEMA_IDS.game,
        name: SITE_NAME,
        alternateName: "QuizBall",
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        image: `${SITE_URL}${SITE_OG_IMAGE_PATH}`,
        applicationCategory: "GameApplication",
        genre: ["Trivia", "Sports", "Football", "Quiz", "Multiplayer"],
        operatingSystem: "Web, iOS, Android",
        inLanguage: ["en", "ka", "es"],
        keywords: "football trivia, football quiz, soccer quiz, multiplayer football game",
        publisher: { "@id": SITE_SCHEMA_IDS.organization },
        isPartOf: { "@id": SITE_SCHEMA_IDS.website },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
      },
    ],
  };
}

interface EditorialPageStructuredDataInput {
  locale: Locale;
  path: "/about" | "/editorial-methodology" | "/press";
  title: string;
  description: string;
  pageType: "AboutPage" | "WebPage";
}

export function buildEditorialPageStructuredData({
  locale,
  path,
  title,
  description,
  pageType,
}: EditorialPageStructuredDataInput) {
  const pageUrl = `${SITE_URL}/${locale}${path}`;

  return {
    "@context": "https://schema.org",
    "@type": pageType,
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: title,
    description,
    inLanguage: LANGUAGE_TAG[locale],
    dateModified: "2026-08-30",
    isPartOf: { "@id": SITE_SCHEMA_IDS.website },
    about: { "@id": SITE_SCHEMA_IDS.organization },
    mainEntity: { "@id": SITE_SCHEMA_IDS.organization },
  };
}

interface ResearchReportStructuredDataInput {
  locale: "en" | "es";
  title: string;
  description: string;
}

export function buildResearchReportStructuredData({
  locale,
  title,
  description,
}: ResearchReportStructuredDataInput) {
  const pageUrl = `${SITE_URL}/${locale}/football-knowledge-index`;
  const articleId = `${pageUrl}#article`;
  const datasetId = `${pageUrl}#dataset`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: title,
        description,
        inLanguage: LANGUAGE_TAG[locale],
        datePublished: "2026-08-30",
        dateModified: "2026-08-30",
        isPartOf: { "@id": SITE_SCHEMA_IDS.website },
        about: { "@id": SITE_SCHEMA_IDS.game },
        mainEntity: { "@id": articleId },
      },
      {
        "@type": "Article",
        "@id": articleId,
        headline: title,
        description,
        url: pageUrl,
        inLanguage: LANGUAGE_TAG[locale],
        datePublished: "2026-08-30",
        dateModified: "2026-08-30",
        image: `${SITE_URL}${SITE_OG_IMAGE_PATH}`,
        author: { "@id": SITE_SCHEMA_IDS.organization },
        publisher: { "@id": SITE_SCHEMA_IDS.organization },
        about: { "@id": datasetId },
        mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
      },
      {
        "@type": "Dataset",
        "@id": datasetId,
        name: "QuizBall Football Knowledge Index 2026 aggregate dataset",
        description:
          "Anonymized aggregate performance from QuizBall public football quizzes between 1 June and 30 August 2026.",
        url: pageUrl,
        inLanguage: ["en-GB", "es"],
        temporalCoverage: "2026-06-01/2026-08-30",
        creator: { "@id": SITE_SCHEMA_IDS.organization },
        publisher: { "@id": SITE_SCHEMA_IDS.organization },
        license: `${SITE_URL}/${locale}/terms`,
        distribution: {
          "@type": "DataDownload",
          encodingFormat: "text/csv",
          contentUrl: `${SITE_URL}/data/quizball-football-knowledge-index-2026.csv`,
        },
      },
    ],
  };
}
