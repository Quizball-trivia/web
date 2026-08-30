export type KnowledgeIndexLocale = "en" | "es";

interface Finding {
  title: string;
  body: string;
}

export interface KnowledgeIndexCopy {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  intro: string;
  published: string;
  period: string;
  backLabel: string;
  switchLabel: string;
  downloadLabel: string;
  sampleHeading: string;
  stats: Array<{ value: string; label: string }>;
  findingsHeading: string;
  findingsIntro: string;
  findings: Finding[];
  accuracyHeading: string;
  accuracyDescription: string;
  accuracyLabels: [string, string, string];
  reachHeading: string;
  reachDescription: string;
  questionLabel: string;
  topicHeading: string;
  topicDescription: string;
  startsLabel: string;
  completionLabel: string;
  topicLabels: [string, string, string];
  methodologyHeading: string;
  methodologyParagraphs: string[];
  limitationsHeading: string;
  limitations: string[];
  nextHeading: string;
  nextBody: string;
  methodologyLink: string;
  quizLink: string;
}

const COPY: Record<KnowledgeIndexLocale, KnowledgeIndexCopy> = {
  en: {
    metaTitle: "Football Knowledge Index 2026 — QuizBall Data Report",
    metaDescription:
      "See anonymized QuizBall data on football quiz accuracy, completion, question reach and the topics fans chose most in summer 2026.",
    eyebrow: "Original QuizBall research",
    title: "QuizBall Football Knowledge Index 2026",
    intro:
      "What 738 anonymized answers reveal about football quiz difficulty, completion and the formats fans chose to play.",
    published: "Published 30 August 2026",
    period: "Data period: 1 June–30 August 2026",
    backLabel: "About QuizBall",
    switchLabel: "Leer en español",
    downloadLabel: "Download the aggregate data (CSV)",
    sampleHeading: "The sample at a glance",
    stats: [
      { value: "80", label: "quiz starts" },
      { value: "738", label: "answers recorded" },
      { value: "38", label: "quiz completions" },
      { value: "47.5%", label: "completion per start" },
    ],
    findingsHeading: "Five findings from the first index",
    findingsIntro:
      "These are directional findings from a modest sample. Every percentage below includes its underlying response or start count.",
    findings: [
      {
        title: "A typical quiz start produced 9.2 answered questions",
        body:
          "Players submitted 738 answers from 80 starts. That average supports a compact football quiz format and gives QuizBall a baseline for evaluating shorter sessions.",
      },
      {
        title: "Easy questions were answered correctly 86.6% of the time",
        body:
          "Easy questions produced 272 correct answers from 314 responses. The gap from easy to the two tougher labels suggests that the first difficulty step is meaningful.",
      },
      {
        title: "Medium and hard questions performed similarly",
        body:
          "Medium accuracy was 67.8% across 239 responses; hard accuracy was 69.2% across 185. Topic mix and the small sample may explain the inversion, so the labels need more data before recalibration.",
      },
      {
        title: "Question reach fell from 80 at question one to 44 at question ten",
        body:
          "Question ten received 55% of the opening-question answer volume. Question fifteen received 31 answers, or 38.8% of the opening volume, in sessions that used the longer format.",
      },
      {
        title: "The hardest-looking topic still held attention",
        body:
          "Among the three most-started quizzes, Liverpool had the lowest average score (53.4%) but the highest completion rate (8 of 16 starts). Club Badges completed 7 of 19; Career Path completed 5 of 17. Samples remain too small for a causal claim.",
      },
    ],
    accuracyHeading: "Accuracy by assigned difficulty",
    accuracyDescription: "Correct answers divided by all answers in each difficulty group.",
    accuracyLabels: ["Easy", "Medium", "Hard"],
    reachHeading: "How far answer volume reached",
    reachDescription: "Answer events at selected positions, indexed against 80 opening-question answers.",
    questionLabel: "Question",
    topicHeading: "The three most-started topics",
    topicDescription: "Starts and completion rates for the only topics with at least 15 starts.",
    startsLabel: "starts",
    completionLabel: "completion",
    topicLabels: ["Club Badges", "Career Path", "Liverpool"],
    methodologyHeading: "Methodology",
    methodologyParagraphs: [
      "QuizBall analyzed aggregate production events from public football quiz pages between 1 June and 30 August 2026 in the project timezone (Europe/Istanbul). Configured test accounts were excluded.",
      "A start is a recorded quiz_start event, an answer is quiz_question_answered, and a completion is quiz_complete. Accuracy uses the recorded correct flag. Topic score uses score_percent on completed quizzes.",
      "No names, emails, account identifiers, individual sessions or individual question text are included. The downloadable file contains only the aggregates shown in this report.",
    ],
    limitationsHeading: "Limitations",
    limitations: [
      "Eighty starts are enough for a baseline, not a representative survey of all football fans.",
      "Traffic sources and topic audiences differ, so comparisons do not prove that a topic caused a result.",
      "The period includes longer 15-question sessions; future editions will compare them with the newer compact format.",
      "Very small topic samples were excluded from the topic comparison even when their scores looked unusually high or low.",
    ],
    nextHeading: "What QuizBall will measure next",
    nextBody:
      "The next edition will compare 10-question completion, Spanish and English audiences, repeat play, and whether difficulty labels become more consistent as the response sample grows.",
    methodologyLink: "How QuizBall checks football questions",
    quizLink: "Play the free football quizzes",
  },
  es: {
    metaTitle: "Índice de conocimiento futbolístico 2026 — Datos de QuizBall",
    metaDescription:
      "Consulta datos anónimos de QuizBall sobre precisión, finalización, avance y los temas de fútbol más elegidos durante el verano de 2026.",
    eyebrow: "Investigación original de QuizBall",
    title: "Índice de conocimiento futbolístico de QuizBall 2026",
    intro:
      "Lo que 738 respuestas anónimas revelan sobre la dificultad, la finalización y los formatos de fútbol que eligieron los aficionados.",
    published: "Publicado el 30 de agosto de 2026",
    period: "Periodo analizado: 1 de junio–30 de agosto de 2026",
    backLabel: "Acerca de QuizBall",
    switchLabel: "Read in English",
    downloadLabel: "Descargar los datos agregados (CSV)",
    sampleHeading: "La muestra de un vistazo",
    stats: [
      { value: "80", label: "quizzes iniciados" },
      { value: "738", label: "respuestas registradas" },
      { value: "38", label: "quizzes completados" },
      { value: "47,5%", label: "finalización por inicio" },
    ],
    findingsHeading: "Cinco hallazgos del primer índice",
    findingsIntro:
      "Son señales orientativas de una muestra modesta. Cada porcentaje incluye su número de respuestas o inicios.",
    findings: [
      {
        title: "Cada quiz iniciado produjo una media de 9,2 respuestas",
        body:
          "Los jugadores enviaron 738 respuestas desde 80 inicios. Esta media respalda un formato compacto y ofrece una referencia para evaluar sesiones más cortas.",
      },
      {
        title: "Las preguntas fáciles tuvieron un 86,6% de acierto",
        body:
          "Las preguntas fáciles sumaron 272 aciertos en 314 respuestas. La diferencia frente a los dos niveles superiores indica que el primer salto de dificultad es relevante.",
      },
      {
        title: "Las preguntas medias y difíciles rindieron de forma parecida",
        body:
          "La precisión media fue del 67,8% en 239 respuestas y la difícil del 69,2% en 185. La mezcla de temas y el tamaño de muestra pueden explicar la inversión; hace falta más información antes de recalibrar.",
      },
      {
        title: "El volumen bajó de 80 respuestas en la primera pregunta a 44 en la décima",
        body:
          "La pregunta diez recibió el 55% del volumen de la primera. En las sesiones con el formato largo, la pregunta quince recibió 31 respuestas, el 38,8% del volumen inicial.",
      },
      {
        title: "El tema que parecía más difícil mantuvo la atención",
        body:
          "Entre los tres quizzes con más inicios, Liverpool tuvo la puntuación media más baja (53,4%) y la mayor finalización (8 de 16). Escudos completó 7 de 19 y Trayectorias 5 de 17. La muestra no permite afirmar causalidad.",
      },
    ],
    accuracyHeading: "Precisión por dificultad asignada",
    accuracyDescription: "Aciertos divididos por todas las respuestas de cada nivel.",
    accuracyLabels: ["Fácil", "Media", "Difícil"],
    reachHeading: "Hasta dónde llegó el volumen de respuestas",
    reachDescription: "Respuestas en posiciones seleccionadas, comparadas con 80 respuestas iniciales.",
    questionLabel: "Pregunta",
    topicHeading: "Los tres temas con más inicios",
    topicDescription: "Inicios y tasa de finalización de los únicos temas con al menos 15 inicios.",
    startsLabel: "inicios",
    completionLabel: "finalización",
    topicLabels: ["Escudos", "Trayectorias", "Liverpool"],
    methodologyHeading: "Metodología",
    methodologyParagraphs: [
      "QuizBall analizó eventos agregados de producción de sus páginas públicas entre el 1 de junio y el 30 de agosto de 2026, en la zona horaria del proyecto (Europe/Istanbul). Se excluyeron las cuentas de prueba configuradas.",
      "Un inicio corresponde a quiz_start, una respuesta a quiz_question_answered y una finalización a quiz_complete. La precisión usa el indicador correct y la puntuación temática score_percent en quizzes completados.",
      "No se incluyen nombres, correos, identificadores de cuenta, sesiones individuales ni textos de preguntas. El archivo descargable contiene solo los agregados de este informe.",
    ],
    limitationsHeading: "Limitaciones",
    limitations: [
      "Ochenta inicios sirven como referencia, pero no representan a todos los aficionados al fútbol.",
      "Las fuentes de tráfico y las audiencias de cada tema difieren; la comparación no demuestra causalidad.",
      "El periodo incluye sesiones antiguas de 15 preguntas; futuras ediciones las compararán con el formato compacto.",
      "Se excluyeron de la comparación temática las muestras muy pequeñas, aunque mostraran resultados extremos.",
    ],
    nextHeading: "Qué medirá QuizBall después",
    nextBody:
      "La próxima edición comparará la finalización con 10 preguntas, las audiencias en español e inglés, la repetición de juego y la consistencia de los niveles de dificultad a medida que crezca la muestra.",
    methodologyLink: "Cómo revisa QuizBall las preguntas",
    quizLink: "Juega los quizzes de fútbol gratis",
  },
};

export function getKnowledgeIndexCopy(locale: KnowledgeIndexLocale): KnowledgeIndexCopy {
  return COPY[locale];
}
