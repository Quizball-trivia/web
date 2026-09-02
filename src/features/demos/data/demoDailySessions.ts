import type {
  DailyChallengeSession,
  DailyChallengeType,
  FootballLogicSession,
  MoneyDropSession,
} from "@/lib/domain/dailyChallenge";
import type { Locale } from "@/lib/i18n/messages";
import { getPoolSessions } from "./demoPoolSessions";
import type { FifaCardsSession } from "@/lib/domain/dailyChallenge";
import { FIFA_CARDS, PLAYABLE_EDITIONS } from "@/features/mini-games/data/guessFifaCard";
import { DEMO_QUESTIONS } from "./demoQuestions";

type L = Locale;

const pick = (locale: L, en: string, ka: string) => (locale === "ka" ? ka : en);

function moneyDropSession(locale: L): MoneyDropSession {
  const contentLocale = locale === 'es' ? 'en' : locale;
  return {
    challengeType: "moneyDrop",
    title: pick(locale, "Money Drop", "ფულის ვარდნა"),
    description: pick(
      locale,
      "Answer correctly to protect your money",
      "უპასუხე სწორად, რომ დაიცვა შენი თანხა",
    ),
    questionCount: 10,
    secondsPerQuestion: 20,
    startingMoney: 1000,
    questions: DEMO_QUESTIONS.slice(0, 10).map((q) => ({
      id: q.id,
      category: q.category[contentLocale],
      difficulty: q.difficulty,
      prompt: q.prompt[contentLocale],
      options: q.options.map((option) => option[contentLocale]),
      correctAnswerIndex: q.correctIndex,
      clue: null,
    })),
  };
}








function footballLogicSession(locale: L): FootballLogicSession {
  return {
    challengeType: "footballLogic",
    title: pick(locale, "Football Logic", "საფეხბურთო ლოგიკა"),
    description: pick(
      locale,
      "Decode the player from the two pictures",
      "ამოიცანი ფეხბურთელი ორი სურათით",
    ),
    questionCount: 10,
    secondsPerQuestion: 25,
    questions: [
      {
        id: "demo-fl-1",
        category: pick(locale, "Transfers", "ტრანსფერები"),
        difficulty: "easy",
        prompt: pick(
          locale,
          "Which player connects these two clubs with a world-record €222M transfer?",
          "რომელი ფეხბურთელი აკავშირებს ამ ორ კლუბს მსოფლიო რეკორდული €222-მილიონიანი ტრანსფერით?",
        ),
        imageAUrl: "/assets/demos/fl-fc-barcelona.png",
        imageBUrl: "/assets/demos/fl-paris-saint-germain.png",
        displayAnswer: pick(locale, "Neymar", "ნეიმარი"),
        acceptedAnswers: ["Neymar", "Neymar Jr", "ნეიმარი"],
        explanation: pick(
          locale,
          "Neymar moved from Barcelona to PSG for €222M in 2017 — still the world record.",
          "ნეიმარი 2017 წელს ბარსელონადან პსჟ-ში €222 მილიონად გადავიდა — დღემდე მსოფლიო რეკორდია.",
        ),
      },
      {
        id: "demo-fl-2",
        category: pick(locale, "Transfers", "ტრანსფერები"),
        difficulty: "medium",
        prompt: pick(
          locale,
          "Which striker famously moved between these two rivals on a free transfer in 2014?",
          "რომელი თავდამსხმელი გადავიდა ამ ორ მეტოქეს შორის თავისუფალი ტრანსფერით 2014 წელს?",
        ),
        imageAUrl: "/assets/demos/fl-borussia-dortmund.png",
        imageBUrl: "/assets/demos/fl-bayern-munich.png",
        displayAnswer: pick(locale, "Robert Lewandowski", "რობერტ ლევანდოვსკი"),
        acceptedAnswers: [
          "Robert Lewandowski",
          "Lewandowski",
          "რობერტ ლევანდოვსკი",
          "ლევანდოვსკი",
        ],
        explanation: pick(
          locale,
          "Lewandowski left Dortmund for Bayern on a free in 2014 and became a Bundesliga legend.",
          "ლევანდოვსკიმ 2014 წელს დორტმუნდი ბაიერნზე თავისუფალი ტრანსფერით გაცვალა და ბუნდესლიგის ლეგენდა გახდა.",
        ),
      },
      {
        id: "demo-fl-3",
        category: pick(locale, "Transfers", "ტრანსფერები"),
        difficulty: "easy",
        prompt: pick(
          locale,
          "Which winger made a then-world-record move between these clubs in 2013?",
          "რომელი ვინგერი გადავიდა ამ ორ კლუბს შორის მაშინდელი მსოფლიო რეკორდით 2013 წელს?",
        ),
        imageAUrl: "/assets/demos/fl-tottenham-hotspur.png",
        imageBUrl: "/assets/demos/fl-real-madrid.png",
        displayAnswer: pick(locale, "Gareth Bale", "გარეთ ბეილი"),
        acceptedAnswers: ["Gareth Bale", "Bale", "გარეთ ბეილი", "ბეილი"],
        explanation: pick(
          locale,
          "Bale joined Real Madrid from Tottenham for ~€100M in 2013 — a world record at the time.",
          "ბეილი ტოტენჰემიდან რეალში ~€100 მილიონად გადავიდა 2013 წელს — მაშინდელი მსოფლიო რეკორდი.",
        ),
      },
      {
        id: "demo-fl-4",
        category: pick(locale, "Transfers", "ტრანსფერები"),
        difficulty: "easy",
        prompt: pick(
          locale,
          "Which superstar moved between these clubs for a then-record £80M in 2009?",
          "რომელი ვარსკვლავი გადავიდა ამ ორ კლუბს შორის მაშინდელი რეკორდული £80 მილიონად 2009 წელს?",
        ),
        imageAUrl: "/assets/demos/fl-manchester-united.png",
        imageBUrl: "/assets/demos/fl-real-madrid.png",
        displayAnswer: pick(locale, "Cristiano Ronaldo", "კრიშტიანუ რონალდუ"),
        acceptedAnswers: ["Cristiano Ronaldo", "Ronaldo", "CR7", "კრიშტიანუ რონალდუ", "რონალდუ"],
        explanation: pick(
          locale,
          "Cristiano Ronaldo's 2009 move from United to Real Madrid was the world record for four years.",
          "კრიშტიანუ რონალდუს 2009 წლის ტრანსფერი იუნაიტედიდან რეალში ოთხი წლის განმავლობაში მსოფლიო რეკორდი იყო.",
        ),
      },
      {
        id: "demo-fl-5",
        category: pick(locale, "Transfers", "ტრანსფერები"),
        difficulty: "medium",
        prompt: pick(
          locale,
          "Which striker left this London club for Barcelona in 2007?",
          "რომელმა თავდამსხმელმა დატოვა ეს ლონდონური კლუბი ბარსელონასთვის 2007 წელს?",
        ),
        imageAUrl: "/assets/demos/fl-arsenal-fc.png",
        imageBUrl: "/assets/demos/fl-fc-barcelona.png",
        displayAnswer: pick(locale, "Thierry Henry", "ტიერი ანრი"),
        acceptedAnswers: ["Thierry Henry", "Henry", "ტიერი ანრი", "ანრი"],
        explanation: pick(
          locale,
          "Arsenal's all-time top scorer joined Barcelona in 2007 and won the treble there in 2009.",
          "არსენალის ისტორიის საუკეთესო ბომბარდირი 2007 წელს ბარსელონას შეუერთდა და 2009 წელს ტრებლი მოიგო.",
        ),
      },
      {
        id: "demo-fl-6",
        category: pick(locale, "Transfers", "ტრანსფერები"),
        difficulty: "easy",
        prompt: pick(
          locale,
          "Which Georgian star moved between these clubs in January 2025?",
          "რომელი ქართველი ვარსკვლავი გადავიდა ამ ორ კლუბს შორის 2025 წლის იანვარში?",
        ),
        imageAUrl: "/assets/demos/fl-ssc-napoli.png",
        imageBUrl: "/assets/demos/fl-paris-saint-germain.png",
        displayAnswer: pick(locale, "Khvicha Kvaratskhelia", "ხვიჩა კვარაცხელია"),
        acceptedAnswers: [
          "Khvicha Kvaratskhelia",
          "Kvaratskhelia",
          "Kvara",
          "ხვიჩა კვარაცხელია",
          "კვარაცხელია",
          "ხვიჩა",
        ],
        explanation: pick(
          locale,
          "Kvaradona swapped Naples for Paris in January 2025 and won the Champions League that spring.",
          "კვარადონამ 2025 წლის იანვარში ნეაპოლი პარიზზე გაცვალა და იმავე გაზაფხულზე ჩემპიონთა ლიგა მოიგო.",
        ),
      },
      {
        id: "demo-fl-7",
        category: pick(locale, "Transfers", "ტრანსფერები"),
        difficulty: "medium",
        prompt: pick(
          locale,
          "Which midfielder returned between these clubs for a record £89M in 2016?",
          "რომელი ნახევარმცველი დაბრუნდა ამ ორ კლუბს შორის რეკორდული £89 მილიონად 2016 წელს?",
        ),
        imageAUrl: "/assets/demos/fl-juventus-fc.png",
        imageBUrl: "/assets/demos/fl-manchester-united.png",
        displayAnswer: pick(locale, "Paul Pogba", "პოლ პოგბა"),
        acceptedAnswers: ["Paul Pogba", "Pogba", "პოლ პოგბა", "პოგბა"],
        explanation: pick(
          locale,
          "Pogba left United for free in 2012 and returned from Juventus for a then-world-record £89M.",
          "პოგბამ იუნაიტედი უფასოდ დატოვა 2012-ში და იუვენტუსიდან მაშინდელი მსოფლიო რეკორდით, £89 მილიონად დაბრუნდა.",
        ),
      },
      {
        id: "demo-fl-8",
        category: pick(locale, "Transfers", "ტრანსფერები"),
        difficulty: "medium",
        prompt: pick(
          locale,
          "Which Brazilian striker moved between these clubs in 2002 after winning the World Cup?",
          "რომელი ბრაზილიელი თავდამსხმელი გადავიდა ამ ორ კლუბს შორის 2002 წელს, მსოფლიო ჩემპიონატის მოგების შემდეგ?",
        ),
        imageAUrl: "/assets/demos/fl-inter-milan.png",
        imageBUrl: "/assets/demos/fl-real-madrid.png",
        displayAnswer: pick(locale, "Ronaldo Nazário", "რონალდო ნაზარიო"),
        acceptedAnswers: ["Ronaldo Nazario", "Ronaldo", "R9", "რონალდო ნაზარიო", "რონალდო"],
        explanation: pick(
          locale,
          "Fresh off his 2002 World Cup heroics, O Fenômeno joined the Galácticos from Inter.",
          "2002 წლის მუნდიალის გმირობის შემდეგ „ფენომენი“ ინტერიდან „გალაქტიკოსებს“ შეუერთდა.",
        ),
      },
      {
        id: "demo-fl-9",
        category: pick(locale, "Transfers", "ტრანსფერები"),
        difficulty: "easy",
        prompt: pick(
          locale,
          "Which French forward moved between these clubs in 2017 for €180M?",
          "რომელი ფრანგი თავდამსხმელი გადავიდა ამ ორ კლუბს შორის 2017 წელს €180 მილიონად?",
        ),
        imageAUrl: "/assets/demos/fl-as-monaco.png",
        imageBUrl: "/assets/demos/fl-paris-saint-germain.png",
        displayAnswer: pick(locale, "Kylian Mbappé", "კილიან მბაპე"),
        acceptedAnswers: ["Kylian Mbappe", "Mbappe", "კილიან მბაპე", "მბაპე"],
        explanation: pick(
          locale,
          "The teenage Mbappé left Monaco for PSG in the second-biggest transfer of all time.",
          "თინეიჯერმა მბაპემ მონაკო პსჟ-ზე გაცვალა — ისტორიაში სიდიდით მეორე ტრანსფერით.",
        ),
      },
      {
        id: "demo-fl-10",
        category: pick(locale, "Transfers", "ტრანსფერები"),
        difficulty: "medium",
        prompt: pick(
          locale,
          "Which defender rose through this club's academy and later captained the other?",
          "რომელი მცველი გაიზარდა ამ კლუბის აკადემიაში და მოგვიანებით მეორის კაპიტანი გახდა?",
        ),
        imageAUrl: "/assets/demos/fl-sevilla-fc.png",
        imageBUrl: "/assets/demos/fl-real-madrid.png",
        displayAnswer: pick(locale, "Sergio Ramos", "სერხიო რამოსი"),
        acceptedAnswers: ["Sergio Ramos", "Ramos", "სერხიო რამოსი", "რამოსი"],
        explanation: pick(
          locale,
          "Ramos left Sevilla for Real Madrid at 19 and captained them to four Champions League titles.",
          "რამოსმა 19 წლისამ სევილია რეალზე გაცვალა და კაპიტნად ოთხი ჩემპიონთა ლიგა მოიგო.",
        ),
      },
    ],
  };
}

export function buildDemoDailySession(
  type: DailyChallengeType,
  locale: Locale,
): DailyChallengeSession {
  // Sessions come from the real published question pool (demoPoolSessions)
  // wherever the pool has native content for the type. moneyDrop keeps the
  // pool MCQ fixture; footballLogic keeps curated club riddles because the
  // pool's footballLogic rows still carry placeholder images.
  const pool = getPoolSessions(locale);
  switch (type) {
    case "moneyDrop":
      return moneyDropSession(locale);
    case "trueFalse":
      return pool.trueFalse;
    case "clues":
      return pool.clues;
    case "countdown":
      return pool.countdown;
    case "putInOrder":
      return pool.putInOrder;
    case "imposter":
      return pool.imposter;
    case "careerPath":
      return pool.careerPath;
    case "highLow":
      return pool.highLow;
    case "footballLogic":
      return footballLogicSession(locale);
    case "fifaCards":
      return fifaCardsSession(locale);
  }
}

/**
 * Demo FIFA Cards round from the bundled free-play dataset: the top-rated card
 * of each playable edition, ten in total. Faces use the proxy's dataset
 * allowlist (no signature needed for bundled cards).
 */
function fifaCardsSession(locale: Locale): FifaCardsSession {
  const cards = PLAYABLE_EDITIONS
    .map((edition) => FIFA_CARDS.filter((card) => card.edition === edition).sort((a, b) => b.overall - a.overall)[0])
    .filter((card) => card != null)
    .slice(0, 10);
  return {
    challengeType: "fifaCards",
    title: locale === "ka" ? "FIFA ბარათები" : "FIFA Cards",
    description: locale === "ka"
      ? "ოქროს ბარათი მხოლოდ სტატისტიკით — გამოიცანი მოთამაშე."
      : "A gold card, stats only — name the player.",
    cardCount: cards.length,
    pointsPerSolve: 10,
    cards: cards.map((card) => ({
      id: card.id,
      edition: card.edition,
      editionLabel: card.editionLabel,
      name: card.name,
      acceptedAnswers: card.accepted,
      overall: card.overall,
      position: card.position,
      nation: card.nation,
      nationCode: card.nationCode,
      league: card.league,
      club: card.club,
      stats: card.stats,
      faceUrl: card.photoId ? `/api/fifa-face?id=${card.photoId}&v=${card.photoVer}` : null,
      difficulty: card.overall >= 88 ? "easy" : card.overall >= 85 ? "medium" : "hard",
    })),
  };
}
