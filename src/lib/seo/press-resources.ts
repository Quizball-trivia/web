import type { KnowledgeIndexLocale } from "./football-knowledge-index";

export interface PressResourcesCopy {
  metaTitle: string;
  metaDescription: string;
  backLabel: string;
  switchLabel: string;
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  factsHeading: string;
  facts: string[];
  descriptionsHeading: string;
  shortLabel: string;
  shortDescription: string;
  longLabel: string;
  longDescription: string;
  assetsHeading: string;
  assetsIntro: string;
  iconLabel: string;
  previewLabel: string;
  evidenceHeading: string;
  evidenceIntro: string;
  reportLink: string;
  methodologyLink: string;
  aboutLink: string;
  quizzesLink: string;
  contactHeading: string;
  contactBody: string;
  legalNote: string;
}

const COPY: Record<KnowledgeIndexLocale, PressResourcesCopy> = {
  en: {
    metaTitle: "QuizBall Press Kit and Citation Resources",
    metaDescription:
      "Verified QuizBall product facts, descriptions, brand assets, original football quiz research, editorial methodology and contact details.",
    backLabel: "About QuizBall",
    switchLabel: "Leer en español",
    eyebrow: "Press and citation resources",
    title: "Verified QuizBall facts and brand resources",
    intro:
      "A product-only reference for journalists, reviewers, directories and researchers who need an accurate description of QuizBall.",
    updated: "Last updated: 30 August 2026",
    factsHeading: "Verified product facts",
    facts: [
      "QuizBall is an independent 1v1 multiplayer football trivia game.",
      "Correct answers affect possession, attacking momentum and goals in football-style matches.",
      "Players can use ranked play, friendly matches and football knowledge modes including Auction, Football Grid and Tic-Tac-Toe.",
      "QuizBall publishes free topic quizzes in English and Spanish; its interface also supports Georgian.",
      "Public search quizzes and the ranked-match question pool have separate publication controls.",
      "QuizBall documents how football questions are researched, reviewed, updated and corrected.",
    ],
    descriptionsHeading: "Ready-to-cite descriptions",
    shortLabel: "One sentence",
    shortDescription:
      "QuizBall is a 1v1 multiplayer football trivia game where correct answers control possession and create chances to score.",
    longLabel: "Short paragraph",
    longDescription:
      "QuizBall turns football knowledge into a live competitive match. Players answer questions to control possession, build attacks and score goals, then climb ranked divisions or challenge friends. The product also publishes free topic quizzes and explains its question-review standards publicly.",
    assetsHeading: "Approved brand assets",
    assetsIntro:
      "Use these files when identifying QuizBall. Do not alter the logo proportions or imply endorsement by a club, league or competition.",
    iconLabel: "Square QuizBall icon — 512×512 PNG",
    previewLabel: "QuizBall social preview — 1200×630 PNG",
    evidenceHeading: "Evidence and background",
    evidenceIntro:
      "These pages provide the clearest public evidence for product descriptions, editorial standards and aggregate quiz findings.",
    reportLink: "Football Knowledge Index 2026",
    methodologyLink: "Editorial methodology",
    aboutLink: "About QuizBall",
    quizzesLink: "Free football quizzes",
    contactHeading: "Questions or verification requests",
    contactBody:
      "For product facts, corrections or permission questions, contact support@quizball.io. Please include the page or claim you want verified.",
    legalNote:
      "QuizBall is independent and is not affiliated with, endorsed by or sponsored by any club, league, federation or competition organizer.",
  },
  es: {
    metaTitle: "Kit de prensa y recursos de QuizBall",
    metaDescription:
      "Datos verificados de QuizBall, descripciones, recursos de marca, investigación original, metodología editorial y contacto.",
    backLabel: "Acerca de QuizBall",
    switchLabel: "Read in English",
    eyebrow: "Recursos para prensa y citas",
    title: "Datos verificados y recursos de marca de QuizBall",
    intro:
      "Una referencia centrada en el producto para periodistas, reseñas, directorios e investigadores que necesiten describir QuizBall con precisión.",
    updated: "Última actualización: 30 de agosto de 2026",
    factsHeading: "Datos verificados del producto",
    facts: [
      "QuizBall es un juego independiente de trivia de fútbol multijugador 1 contra 1.",
      "Las respuestas correctas influyen en la posesión, el impulso ofensivo y los goles de cada partido.",
      "Incluye partidas clasificatorias, amistosos y modos de conocimiento como Subasta, Football Grid y Tres en raya.",
      "QuizBall publica quizzes temáticos gratuitos en inglés y español; la interfaz también admite georgiano.",
      "Los quizzes públicos y el banco de preguntas clasificatorias tienen controles de publicación separados.",
      "QuizBall explica públicamente cómo investiga, revisa, actualiza y corrige sus preguntas.",
    ],
    descriptionsHeading: "Descripciones listas para citar",
    shortLabel: "Una frase",
    shortDescription:
      "QuizBall es un juego de trivia de fútbol multijugador 1 contra 1 donde las respuestas correctas controlan la posesión y crean ocasiones de gol.",
    longLabel: "Párrafo breve",
    longDescription:
      "QuizBall convierte el conocimiento futbolístico en un partido competitivo en vivo. Los jugadores responden preguntas para controlar la posesión, construir ataques y marcar goles, y después suben en las divisiones o desafían a sus amigos. El producto también publica quizzes temáticos gratuitos y documenta sus criterios editoriales.",
    assetsHeading: "Recursos de marca aprobados",
    assetsIntro:
      "Usa estos archivos para identificar QuizBall. No alteres las proporciones del logo ni sugieras el respaldo de clubes, ligas o competiciones.",
    iconLabel: "Icono cuadrado de QuizBall — PNG 512×512",
    previewLabel: "Vista previa social de QuizBall — PNG 1200×630",
    evidenceHeading: "Evidencia y contexto",
    evidenceIntro:
      "Estas páginas reúnen la evidencia pública más clara sobre el producto, los criterios editoriales y los resultados agregados.",
    reportLink: "Índice de conocimiento futbolístico 2026",
    methodologyLink: "Metodología editorial",
    aboutLink: "Acerca de QuizBall",
    quizzesLink: "Quizzes de fútbol gratis",
    contactHeading: "Preguntas o solicitudes de verificación",
    contactBody:
      "Para verificar datos, comunicar correcciones o consultar permisos, escribe a support@quizball.io e incluye la página o afirmación correspondiente.",
    legalNote:
      "QuizBall es independiente y no está afiliado, respaldado ni patrocinado por ningún club, liga, federación u organizador de competiciones.",
  },
};

export function getPressResourcesCopy(locale: KnowledgeIndexLocale): PressResourcesCopy {
  return COPY[locale];
}
