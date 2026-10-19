export type CampaignQuizLang = "tr" | "en";
export type QuizDifficulty = "easy" | "medium" | "hard";

type Localized = Record<CampaignQuizLang, string>;

export type CampaignQuizQuestion = {
  id: string;
  difficulty: QuizDifficulty;
  prompt: Localized;
  options: readonly Localized[];
  answerIndex: number;
  fact: Localized;
};

export const TRABZONSPOR_CAMPAIGN_ID = "trabzonspor_2026_10";
export const TRABZONSPOR_CAMPAIGN_PARAM = "trabzonspor";
export const TRABZONSPOR_CAMPAIGN_ENDS_AT = Date.parse("2026-10-26T00:00:00+04:00");

const same = (value: string): Localized => ({ tr: value, en: value });

export const TRABZONSPOR_QUESTIONS: readonly CampaignQuizQuestion[] = [
  {
    id: "nickname",
    difficulty: "easy",
    prompt: { tr: "Trabzonspor'un efsane lakabı hangisi?", en: "What is Trabzonspor's legendary nickname?" },
    options: [
      { tr: "Kara Kartallar", en: "The Black Eagles" },
      { tr: "Karadeniz Fırtınası", en: "The Black Sea Storm" },
      { tr: "Sarı Kanaryalar", en: "The Yellow Canaries" },
      { tr: "Timsahlar", en: "The Crocodiles" },
    ],
    answerIndex: 1,
    fact: {
      tr: "Karadeniz Fırtınası lakabı, Türk futbolunu kasıp kavuran 70'lerin takımından miras.",
      en: "The Black Sea Storm name comes from the 1970s side that swept through Turkish football.",
    },
  },
  {
    id: "stadium-name",
    difficulty: "easy",
    prompt: { tr: "Trabzonspor'un stadı hangi efsanenin adını taşıyor?", en: "Trabzonspor's stadium is named after which legend?" },
    options: [same("Hami Mandıralı"), same("Lefter Küçükandonyadis"), same("Metin Oktay"), same("Şenol Güneş")],
    answerIndex: 3,
    fact: {
      tr: "Şenol Güneş, şampiyonluk yıllarının kalecisiydi; teknik direktör olarak Türkiye'yi 2002 Dünya Kupası'nda üçüncülüğe taşıdı.",
      en: "Şenol Güneş kept goal in the title years, then coached Turkey to third place at the 2002 World Cup.",
    },
  },
  {
    id: "first-anatolian-title",
    difficulty: "medium",
    prompt: {
      tr: "Trabzonspor hangi sezon İstanbul dışından çıkan ilk lig şampiyonu oldu?",
      en: "In which season did Trabzonspor become the first league champion from outside Istanbul?",
    },
    options: [same("1969-70"), same("1975-76"), same("1983-84"), same("1990-91")],
    answerIndex: 1,
    fact: {
      tr: "1975-76 şampiyonluğu, İstanbul'un lig tekelini kıran ilk Anadolu zaferiydi.",
      en: "The 1975-76 title broke Istanbul's grip on the league for the first time.",
    },
  },
  {
    id: "2022-coach",
    difficulty: "medium",
    prompt: {
      tr: "2021-22 Süper Lig şampiyonluğunu getiren teknik direktör kim?",
      en: "Which head coach won the 2021-22 Süper Lig title with Trabzonspor?",
    },
    options: [same("Şenol Güneş"), same("Ünal Karaman"), same("Abdullah Avcı"), same("Hamza Hamzaoğlu")],
    answerIndex: 2,
    fact: {
      tr: "Abdullah Avcı'nın takımı şampiyonluğu sezon bitmeden garantiledi ve Trabzon sabaha kadar kutladı.",
      en: "Abdullah Avcı's side sealed the title before the season ended, and Trabzon partied all night.",
    },
  },
  {
    id: "founded",
    difficulty: "medium",
    prompt: { tr: "Trabzonspor hangi yıl kuruldu?", en: "In which year was Trabzonspor founded?" },
    options: [same("1923"), same("1959"), same("1975"), same("1967")],
    answerIndex: 3,
    fact: {
      tr: "Trabzonspor 1967'de kuruldu ve sadece 9 yıl sonra Türkiye şampiyonu oldu.",
      en: "Trabzonspor was founded in 1967 and were champions of Turkey just nine years later.",
    },
  },
  {
    id: "old-stadium",
    difficulty: "medium",
    prompt: {
      tr: "Şenol Güneş Spor Kompleksi'nden önce Trabzonspor'un evi hangi stattı?",
      en: "Before the Şenol Güneş Sports Complex, which ground was Trabzonspor's home?",
    },
    options: [same("Hüseyin Avni Aker"), same("Ali Sami Yen"), same("İnönü"), same("19 Mayıs")],
    answerIndex: 0,
    fact: {
      tr: "Hüseyin Avni Aker, deplasman takımlarının korkulu rüyasıydı; tribünler sahaya adeta yapışıktı.",
      en: "Hüseyin Avni Aker was every away side's nightmare, with the stands almost on the pitch.",
    },
  },
  {
    id: "liverpool-1976",
    difficulty: "hard",
    prompt: {
      tr: "1976-77 Şampiyon Kulüpler Kupası'nda Trabzon'da 1-0 yenilen ve o sezon kupayı kazanan takım hangisi?",
      en: "In the 1976-77 European Cup, Trabzonspor beat which team 1-0 at home, a side that went on to win the trophy?",
    },
    options: [same("Bayern Münih"), same("Ajax"), same("Liverpool"), same("Real Madrid")],
    answerIndex: 2,
    fact: {
      tr: "Liverpool o sezon Avrupa'nın en büyüğü oldu ama Trabzon'dan eli boş döndü.",
      en: "Liverpool became champions of Europe that season, but left Trabzon empty-handed.",
    },
  },
  {
    id: "inter-2011",
    difficulty: "hard",
    prompt: {
      tr: "14 Eylül 2011'de San Siro'da Inter'i 1-0 yenen Trabzonspor'un golünü kim attı?",
      en: "Trabzonspor won 1-0 at Inter in San Siro on 14 September 2011. Who scored?",
    },
    options: [same("Burak Yılmaz"), same("Ondřej Čelůstka"), same("Gustavo Colman"), same("Alanzinho")],
    answerIndex: 1,
    fact: {
      tr: "Çek stoper Čelůstka'nın golü, Şampiyonlar Ligi'nde Türk takımlarının en unutulmaz deplasman galibiyetlerinden birini getirdi.",
      en: "Czech defender Čelůstka's goal sealed one of the most famous away wins by a Turkish club in the Champions League.",
    },
  },
  {
    id: "burak-goals",
    difficulty: "hard",
    prompt: {
      tr: "Burak Yılmaz 2011-12'de Trabzonspor formasıyla kaç lig golüyle gol kralı oldu?",
      en: "Burak Yılmaz was the 2011-12 Süper Lig top scorer for Trabzonspor with how many league goals?",
    },
    options: [same("27"), same("30"), same("33"), same("36")],
    answerIndex: 2,
    fact: {
      tr: "33 gol: Burak bu sezonla Avrupa'nın en golcü forvetleri arasına girdi.",
      en: "33 goals put Burak among the most prolific strikers in Europe that season.",
    },
  },
  {
    id: "tekke-2005",
    difficulty: "hard",
    prompt: {
      tr: "2004-05'te 31 golle Süper Lig gol kralı olan Trabzonsporlu kim?",
      en: "Which Trabzonspor player was Süper Lig top scorer in 2004-05 with 31 goals?",
    },
    options: [same("Fatih Tekke"), same("Gökdeniz Karadeniz"), same("Ibrahima Yattara"), same("Hami Mandıralı")],
    answerIndex: 0,
    fact: {
      tr: "Fatih Tekke'nin 31 golü, Trabzonspor tarihinin en golcü sezonlarından biri.",
      en: "Fatih Tekke's 31 goals made it one of the most prolific seasons in the club's history.",
    },
  },
];

export const QUIZ_COPY = {
  tr: {
    section: "TRABZONSPOR QUIZ",
    live: "Bugün",
    title: "Gerçek bir bordo-mavili misin?",
    subtitle: "10 soru · 2 kolay, 4 orta, 4 zor",
    play: "Oyna",
    playAgain: "Tekrar oyna",
    best: (score: number, total: number) => `En iyi skorun: ${score}/${total}`,
    question: (n: number, total: number) => `Soru ${n}/${total}`,
    difficulty: { easy: "Kolay", medium: "Orta", hard: "Zor" } as Record<QuizDifficulty, string>,
    correct: "Doğru!",
    wrong: "Yanlış!",
    next: "Sonraki soru",
    finish: "Sonucu gör",
    close: "Kapat",
    resultTitle: (score: number) =>
      score === 10 ? "Efsane! Tam bir Karadeniz Fırtınası" : score >= 8 ? "Gerçek bordo-mavili" : score >= 5 ? "Tribünden iyi takip ediyorsun" : "Biraz daha Trabzon havası lazım",
    share: "Skorunu paylaş",
    copied: "Bağlantı kopyalandı",
    shareText: (score: number, total: number) => `Trabzonspor Quiz'de ${score}/${total} yaptım! Sen kaç yaparsın? 🔴🔵`,
    moreGames: "Diğer futbol oyunları",
    signup: "Ücretsiz kayıt ol",
  },
  en: {
    section: "TRABZONSPOR QUIZ",
    live: "Today",
    title: "Are you a true claret and blue?",
    subtitle: "10 questions · 2 easy, 4 medium, 4 hard",
    play: "Play",
    playAgain: "Play again",
    best: (score: number, total: number) => `Your best: ${score}/${total}`,
    question: (n: number, total: number) => `Question ${n}/${total}`,
    difficulty: { easy: "Easy", medium: "Medium", hard: "Hard" } as Record<QuizDifficulty, string>,
    correct: "Correct!",
    wrong: "Wrong!",
    next: "Next question",
    finish: "See result",
    close: "Close",
    resultTitle: (score: number) =>
      score === 10 ? "Legend! A true Black Sea Storm" : score >= 8 ? "A true claret and blue" : score >= 5 ? "You follow it from the stands" : "You need more Trabzon air",
    share: "Share your score",
    copied: "Link copied",
    shareText: (score: number, total: number) => `I scored ${score}/${total} on the Trabzonspor Quiz! Can you beat it? 🔴🔵`,
    moreGames: "More football games",
    signup: "Sign up free",
  },
} as const;

export type CampaignTrigger = "geo" | "profile" | "locale" | "link";

/** Who sees the card: visitors in Turkey (live IP or stored profile country), the Turkish site, or anyone with the campaign link. */
export function resolveCampaignTrigger(input: {
  live: boolean;
  geoCountry: string | null;
  profileCountry: string | null;
  locale: string;
  hasLink: boolean;
}): CampaignTrigger | null {
  if (!input.live) return null;
  if (input.geoCountry === "TR") return "geo";
  if (input.profileCountry === "TR") return "profile";
  if (input.locale === "tr") return "locale";
  if (input.hasLink) return "link";
  return null;
}

export function campaignQuizLang(locale: string, trigger: CampaignTrigger): CampaignQuizLang {
  return locale === "tr" || trigger === "geo" || trigger === "profile" ? "tr" : "en";
}

export function scoreOf(answers: readonly number[]): number {
  return answers.reduce((sum, picked, i) => sum + (TRABZONSPOR_QUESTIONS[i]?.answerIndex === picked ? 1 : 0), 0);
}

/** "1101…": one digit per answered question, so PostHog can break down which questions fans miss. */
export function correctMaskOf(answers: readonly number[]): string {
  return answers.map((picked, i) => (TRABZONSPOR_QUESTIONS[i]?.answerIndex === picked ? "1" : "0")).join("");
}
