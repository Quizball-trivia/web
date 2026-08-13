import type {
  CareerPathSession,
  CluesSession,
  CountdownSession,
  DailyChallengeSession,
  DailyChallengeType,
  FootballLogicSession,
  HighLowSession,
  ImposterSession,
  MoneyDropSession,
  PutInOrderSession,
  TrueFalseSession,
} from "@/lib/domain/dailyChallenge";
import type { Locale } from "@/lib/i18n/messages";
import { DEMO_QUESTIONS } from "./demoQuestions";

type L = Locale;

const pick = (locale: L, en: string, ka: string) => (locale === "ka" ? ka : en);

function moneyDropSession(locale: L): MoneyDropSession {
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
      category: q.category[locale],
      difficulty: q.difficulty,
      prompt: q.prompt[locale],
      options: q.options.map((option) => option[locale]),
      correctAnswerIndex: q.correctIndex,
      clue: null,
    })),
  };
}

function trueFalseSession(locale: L): TrueFalseSession {
  const trueLabel = pick(locale, "True", "მართალია");
  const falseLabel = pick(locale, "False", "ტყუილია");
  const statements: Array<{ en: string; ka: string; answer: boolean }> = [
    {
      en: "Italy failed to qualify for the 2022 FIFA World Cup.",
      ka: "იტალიამ ვერ მოახერხა 2022 წლის მსოფლიო ჩემპიონატზე გასვლა.",
      answer: true,
    },
    {
      en: "Lionel Messi has won the FIFA World Cup twice.",
      ka: "ლიონელ მესიმ მსოფლიო ჩემპიონატი ორჯერ მოიგო.",
      answer: false,
    },
    {
      en: "Real Madrid have won more than 10 Champions League titles.",
      ka: "რეალ მადრიდს 10-ზე მეტი ჩემპიონთა ლიგის ტიტული აქვს მოგებული.",
      answer: true,
    },
    {
      en: "Zlatan Ibrahimović has won the Ballon d'Or.",
      ka: "ზლატან იბრაჰიმოვიჩს მოგებული აქვს ოქროს ბურთი.",
      answer: false,
    },
    {
      en: "Khvicha Kvaratskhelia won the Serie A title with Napoli.",
      ka: "ხვიჩა კვარაცხელიამ ნაპოლისთან ერთად სერია A-ს ტიტული მოიგო.",
      answer: true,
    },
    {
      en: "Pelé scored over 1,000 goals in his career.",
      ka: "პელემ კარიერაში 1000-ზე მეტი გოლი გაიტანა.",
      answer: true,
    },
    {
      en: "Georgia has played at a FIFA World Cup.",
      ka: "საქართველოს ნაკრებს მსოფლიო ჩემპიონატზე უთამაშია.",
      answer: false,
    },
    {
      en: "Cristiano Ronaldo has won the Champions League five times.",
      ka: "კრიშტიანუ რონალდუს ჩემპიონთა ლიგა ხუთჯერ აქვს მოგებული.",
      answer: true,
    },
    {
      en: "Barcelona have never won the Champions League.",
      ka: "ბარსელონას ჩემპიონთა ლიგა არასდროს მოუგია.",
      answer: false,
    },
    {
      en: "The 2022 World Cup final was decided by a penalty shootout.",
      ka: "2022 წლის მსოფლიო ჩემპიონატის ფინალი პენალტების სერიით გადაწყდა.",
      answer: true,
    },
  ];

  return {
    challengeType: "trueFalse",
    title: pick(locale, "True or False", "მართალია თუ ტყუილი"),
    description: pick(
      locale,
      "Call each football statement true or false",
      "შეაფასე თითოეული მტკიცება — მართალია თუ ტყუილი",
    ),
    questionCount: statements.length,
    secondsPerQuestion: 15,
    questions: statements.map((statement, index) => ({
      id: `demo-tf-${index + 1}`,
      category: pick(locale, "Football", "ფეხბურთი"),
      difficulty: "easy",
      prompt: statement[locale],
      trueLabel,
      falseLabel,
      correctAnswer: statement.answer,
    })),
  };
}

function cluesSession(locale: L): CluesSession {
  return {
    challengeType: "clues",
    title: pick(locale, "Who Am I?", "ვინ ვარ მე?"),
    description: pick(
      locale,
      "Guess the player from the clues — fewer clues, more points",
      "გამოიცანი ფეხბურთელი მინიშნებებით — ნაკლები მინიშნება, მეტი ქულა",
    ),
    questionCount: 2,
    secondsPerClueStep: 12,
    questions: [
      {
        id: "demo-clues-1",
        category: pick(locale, "Legends", "ლეგენდები"),
        difficulty: "easy",
        displayAnswer: pick(locale, "Lionel Messi", "ლიონელ მესი"),
        acceptedAnswers: ["Lionel Messi", "Messi", "ლიონელ მესი", "მესი"],
        clues: [
          {
            type: "text",
            content: pick(
              locale,
              "I started my career at Newell's Old Boys",
              "კარიერა ნიუელს ოლდ ბოიზში დავიწყე",
            ),
          },
          {
            type: "text",
            content: pick(
              locale,
              "I have won the Ballon d'Or a record 8 times",
              "ოქროს ბურთი რეკორდულად, 8-ჯერ მაქვს მოგებული",
            ),
          },
          { type: "emoji", content: "🇦🇷🐐" },
          {
            type: "text",
            content: pick(
              locale,
              "I lifted the World Cup in Qatar in 2022",
              "2022 წელს კატარში მსოფლიო ჩემპიონატის თასი ავწიე",
            ),
          },
        ],
      },
      {
        id: "demo-clues-2",
        category: pick(locale, "Stars", "ვარსკვლავები"),
        difficulty: "easy",
        displayAnswer: pick(locale, "Khvicha Kvaratskhelia", "ხვიჩა კვარაცხელია"),
        acceptedAnswers: [
          "Khvicha Kvaratskhelia",
          "Kvaratskhelia",
          "Kvara",
          "ხვიჩა კვარაცხელია",
          "კვარაცხელია",
          "ხვიჩა",
        ],
        clues: [
          { type: "emoji", content: "🇬🇪⚽" },
          {
            type: "text",
            content: pick(
              locale,
              "Fans in Naples called me Kvaradona",
              "ნეაპოლში გულშემატკივრები კვარადონას მეძახდნენ",
            ),
          },
          {
            type: "text",
            content: pick(
              locale,
              "I won the Serie A title in 2023",
              "2023 წელს სერია A-ს ტიტული მოვიგე",
            ),
          },
          {
            type: "text",
            content: pick(locale, "I joined PSG in 2025", "2025 წელს პსჟ-ს შევუერთდი"),
          },
        ],
      },
    ],
  };
}

function countdownSession(locale: L): CountdownSession {
  const clubGroup = (id: string, en: string, ka: string, extra: string[] = []) => ({
    id,
    display: pick(locale, en, ka),
    acceptedAnswers: [en, ka, ...extra],
  });

  return {
    challengeType: "countdown",
    title: pick(locale, "Countdown", "უკუთვლა"),
    description: pick(
      locale,
      "Name as many correct answers as you can before time runs out",
      "დაასახელე რაც შეიძლება მეტი სწორი პასუხი, სანამ დრო ამოიწურება",
    ),
    // CountdownGame plays session.rounds.slice(0, 2) by production design —
    // extra rounds below are spare content in case that cap ever lifts.
    roundCount: 2,
    secondsPerRound: 30,
    rounds: [
      {
        id: "demo-cd-1",
        category: pick(locale, "Champions League", "ჩემპიონთა ლიგა"),
        prompt: pick(
          locale,
          "Name any club that has won the Champions League / European Cup",
          "დაასახელე ნებისმიერი კლუბი, რომელსაც ჩემპიონთა ლიგა (ევროპის თასი) მოუგია",
        ),
        answerGroups: [
          clubGroup("real", "Real Madrid", "რეალი", ["რეალ მადრიდი", "Real"]),
          clubGroup("milan", "AC Milan", "მილანი", ["Milan", "ა.ც. მილანი"]),
          clubGroup("bayern", "Bayern Munich", "ბაიერნი", ["Bayern", "ბავარია"]),
          clubGroup("liverpool", "Liverpool", "ლივერპული"),
          clubGroup("barcelona", "Barcelona", "ბარსელონა", ["Barca", "ბარსა"]),
          clubGroup("manutd", "Manchester United", "მანჩესტერ იუნაიტედი", ["Man United", "Man Utd"]),
          clubGroup("chelsea", "Chelsea", "ჩელსი"),
          clubGroup("inter", "Inter Milan", "ინტერი", ["Inter", "ინტერ მილანი"]),
          clubGroup("juventus", "Juventus", "იუვენტუსი", ["Juve"]),
          clubGroup("mancity", "Manchester City", "მანჩესტერ სიტი", ["Man City", "სიტი"]),
          clubGroup("porto", "Porto", "პორტუ", ["FC Porto"]),
          clubGroup("ajax", "Ajax", "აიაქსი"),
          clubGroup("dortmund", "Borussia Dortmund", "დორტმუნდი", ["Dortmund", "ბორუსია"]),
        ],
      },
      {
        id: "demo-cd-2",
        category: pick(locale, "World Cup", "მსოფლიო ჩემპიონატი"),
        prompt: pick(
          locale,
          "Name any country that has won the FIFA World Cup",
          "დაასახელე ნებისმიერი ქვეყანა, რომელსაც მსოფლიო ჩემპიონატი მოუგია",
        ),
        answerGroups: [
          clubGroup("brazil", "Brazil", "ბრაზილია"),
          clubGroup("germany", "Germany", "გერმანია"),
          clubGroup("italy", "Italy", "იტალია"),
          clubGroup("argentina", "Argentina", "არგენტინა"),
          clubGroup("france", "France", "საფრანგეთი"),
          clubGroup("uruguay", "Uruguay", "ურუგვაი"),
          clubGroup("england", "England", "ინგლისი"),
          clubGroup("spain", "Spain", "ესპანეთი"),
        ],
      },
      {
        id: "demo-cd-3",
        category: pick(locale, "Legends", "ლეგენდები"),
        prompt: pick(
          locale,
          "Name any club Cristiano Ronaldo has played for",
          "დაასახელე ნებისმიერი კლუბი, სადაც კრიშტიანუ რონალდუს უთამაშია",
        ),
        answerGroups: [
          clubGroup("sporting", "Sporting CP", "სპორტინგი", ["Sporting", "სპორტინგ ლისაბონი"]),
          clubGroup("manutd", "Manchester United", "მანჩესტერ იუნაიტედი", ["Man United", "Man Utd"]),
          clubGroup("real", "Real Madrid", "რეალი", ["რეალ მადრიდი", "Real"]),
          clubGroup("juventus", "Juventus", "იუვენტუსი", ["Juve"]),
          clubGroup("alnassr", "Al-Nassr", "ალ-ნასრი", ["Al Nassr", "ალ ნასრი"]),
        ],
      },
      {
        id: "demo-cd-4",
        category: pick(locale, "World Cup", "მსოფლიო ჩემპიონატი"),
        prompt: pick(
          locale,
          "Name any country that has hosted a FIFA World Cup",
          "დაასახელე ნებისმიერი ქვეყანა, რომელსაც მსოფლიო ჩემპიონატისთვის უმასპინძლია",
        ),
        answerGroups: [
          clubGroup("uruguay", "Uruguay", "ურუგვაი"),
          clubGroup("italy", "Italy", "იტალია"),
          clubGroup("france", "France", "საფრანგეთი"),
          clubGroup("brazil", "Brazil", "ბრაზილია"),
          clubGroup("mexico", "Mexico", "მექსიკა"),
          clubGroup("germany", "Germany", "გერმანია"),
          clubGroup("argentina", "Argentina", "არგენტინა"),
          clubGroup("spain", "Spain", "ესპანეთი"),
          clubGroup("usa", "United States", "აშშ", ["USA", "ამერიკა"]),
          clubGroup("japan", "Japan", "იაპონია"),
          clubGroup("southkorea", "South Korea", "სამხრეთ კორეა", ["Korea", "კორეა"]),
          clubGroup("southafrica", "South Africa", "სამხრეთ აფრიკა"),
          clubGroup("russia", "Russia", "რუსეთი"),
          clubGroup("qatar", "Qatar", "კატარი"),
          clubGroup("england", "England", "ინგლისი"),
          clubGroup("switzerland", "Switzerland", "შვეიცარია"),
          clubGroup("sweden", "Sweden", "შვედეთი"),
          clubGroup("chile", "Chile", "ჩილე"),
        ],
      },
      {
        id: "demo-cd-5",
        category: pick(locale, "Ballon d'Or", "ოქროს ბურთი"),
        prompt: pick(
          locale,
          "Name any player who has won the Ballon d'Or since 2000",
          "დაასახელე ნებისმიერი ფეხბურთელი, რომელსაც 2000 წლის შემდეგ ოქროს ბურთი მოუგია",
        ),
        answerGroups: [
          clubGroup("messi", "Lionel Messi", "მესი", ["Messi", "ლიონელ მესი"]),
          clubGroup("cr7", "Cristiano Ronaldo", "რონალდუ", ["Ronaldo", "კრიშტიანუ რონალდუ"]),
          clubGroup("modric", "Luka Modrić", "მოდრიჩი", ["Modric", "ლუკა მოდრიჩი"]),
          clubGroup("benzema", "Karim Benzema", "ბენზემა", ["Benzema", "კარიმ ბენზემა"]),
          clubGroup("rodri", "Rodri", "როდრი"),
          clubGroup("ronaldinho", "Ronaldinho", "რონალდინიო"),
          clubGroup("kaka", "Kaká", "კაკა", ["Kaka"]),
          clubGroup("cannavaro", "Fabio Cannavaro", "კანავარო", ["Cannavaro", "ფაბიო კანავარო"]),
          clubGroup("shevchenko", "Andriy Shevchenko", "შევჩენკო", ["Shevchenko", "ანდრი შევჩენკო"]),
          clubGroup("nedved", "Pavel Nedvěd", "ნედვედი", ["Nedved", "პაველ ნედვედი"]),
          clubGroup("r9", "Ronaldo Nazário", "რონალდო", ["Ronaldo Nazario", "რონალდო ნაზარიო"]),
          clubGroup("owen", "Michael Owen", "ოუენი", ["Owen", "მაიკლ ოუენი"]),
          clubGroup("figo", "Luís Figo", "ფიგუ", ["Figo", "ლუიშ ფიგუ"]),
        ],
      },
      {
        id: "demo-cd-6",
        category: pick(locale, "Premier League", "პრემიერ ლიგა"),
        prompt: pick(
          locale,
          "Name any club that has won the English Premier League",
          "დაასახელე ნებისმიერი კლუბი, რომელსაც ინგლისის პრემიერ ლიგა მოუგია",
        ),
        answerGroups: [
          clubGroup("manutd", "Manchester United", "მანჩესტერ იუნაიტედი", ["Man United", "Man Utd"]),
          clubGroup("mancity", "Manchester City", "მანჩესტერ სიტი", ["Man City", "სიტი"]),
          clubGroup("chelsea", "Chelsea", "ჩელსი"),
          clubGroup("arsenal", "Arsenal", "არსენალი"),
          clubGroup("liverpool", "Liverpool", "ლივერპული"),
          clubGroup("leicester", "Leicester City", "ლესტერი", ["Leicester", "ლესტერ სიტი"]),
          clubGroup("blackburn", "Blackburn Rovers", "ბლექბერნი", ["Blackburn"]),
        ],
      },
      {
        id: "demo-cd-7",
        category: pick(locale, "Legends", "ლეგენდები"),
        prompt: pick(
          locale,
          "Name any club Lionel Messi has played for",
          "დაასახელე ნებისმიერი კლუბი, სადაც ლიონელ მესის უთამაშია",
        ),
        answerGroups: [
          clubGroup("barcelona", "Barcelona", "ბარსელონა", ["Barca", "ბარსა"]),
          clubGroup("psg", "PSG", "პსჟ", ["Paris Saint-Germain", "პარი სენ-ჟერმენი"]),
          clubGroup("miami", "Inter Miami", "ინტერ მაიამი", ["Miami", "მაიამი"]),
        ],
      },
      {
        id: "demo-cd-8",
        category: pick(locale, "Georgian football", "ქართული ფეხბურთი"),
        prompt: pick(
          locale,
          "Name any club Kakha Kaladze played for",
          "დაასახელე ნებისმიერი კლუბი, სადაც კახა კალაძეს უთამაშია",
        ),
        answerGroups: [
          clubGroup("dinamo", "Dinamo Tbilisi", "დინამო თბილისი", ["Dinamo", "დინამო"]),
          clubGroup("kyiv", "Dynamo Kyiv", "დინამო კიევი", ["Dynamo Kiev", "კიევის დინამო"]),
          clubGroup("milan", "AC Milan", "მილანი", ["Milan", "ა.ც. მილანი"]),
          clubGroup("genoa", "Genoa", "ჯენოა", ["გენუა"]),
        ],
      },
      {
        id: "demo-cd-9",
        category: pick(locale, "Serie A", "სერია A"),
        prompt: pick(
          locale,
          "Name any Italian club that has won the Champions League / European Cup",
          "დაასახელე ნებისმიერი იტალიური კლუბი, რომელსაც ჩემპიონთა ლიგა (ევროპის თასი) მოუგია",
        ),
        answerGroups: [
          clubGroup("milan", "AC Milan", "მილანი", ["Milan", "ა.ც. მილანი"]),
          clubGroup("inter", "Inter Milan", "ინტერი", ["Inter", "ინტერ მილანი"]),
          clubGroup("juventus", "Juventus", "იუვენტუსი", ["Juve"]),
        ],
      },
      {
        id: "demo-cd-10",
        category: pick(locale, "Euros", "ევროპის ჩემპიონატი"),
        prompt: pick(
          locale,
          "Name any country that has won the European Championship",
          "დაასახელე ნებისმიერი ქვეყანა, რომელსაც ევროპის ჩემპიონატი მოუგია",
        ),
        answerGroups: [
          clubGroup("spain", "Spain", "ესპანეთი"),
          clubGroup("germany", "Germany", "გერმანია"),
          clubGroup("italy", "Italy", "იტალია"),
          clubGroup("france", "France", "საფრანგეთი"),
          clubGroup("portugal", "Portugal", "პორტუგალია"),
          clubGroup("netherlands", "Netherlands", "ნიდერლანდები", ["Holland", "ჰოლანდია"]),
          clubGroup("denmark", "Denmark", "დანია"),
          clubGroup("greece", "Greece", "საბერძნეთი"),
          clubGroup("ussr", "Soviet Union", "საბჭოთა კავშირი", ["USSR", "სსრკ"]),
          clubGroup("czech", "Czechoslovakia", "ჩეხოსლოვაკია"),
        ],
      },
    ],
  };
}

function putInOrderSession(locale: L): PutInOrderSession {
  return {
    challengeType: "putInOrder",
    title: pick(locale, "Put In Order", "დაალაგე რიგზე"),
    description: pick(
      locale,
      "Drag the items into the right order",
      "გადაათრიე და დაალაგე სწორი თანმიმდევრობით",
    ),
    roundCount: 2,
    itemsPerRound: 4,
    rounds: [
      {
        id: "demo-pio-1",
        category: pick(locale, "Ballon d'Or", "ოქროს ბურთი"),
        prompt: pick(
          locale,
          "Order these players by Ballon d'Or wins",
          "დაალაგე ფეხბურთელები ოქროს ბურთების რაოდენობით",
        ),
        // Rendered inside "Drag and drop to arrange these items from {instruction}."
        instruction: pick(
          locale,
          "most Ballon d'Or wins to fewest",
          "ყველაზე მეტი ოქროს ბურთიდან ყველაზე ნაკლებამდე",
        ),
        direction: "desc",
        // sortValue is the rank in the correct order (1 = first); array order
        // is the scrambled order the player starts from.
        items: [
          {
            id: "platini",
            label: pick(locale, "Michel Platini", "მიშელ პლატინი"),
            details: pick(locale, "3 wins", "3 ჯილდო"),
            emoji: "🇫🇷",
            sortValue: 3,
          },
          {
            id: "messi",
            label: pick(locale, "Lionel Messi", "ლიონელ მესი"),
            details: pick(locale, "8 wins", "8 ჯილდო"),
            emoji: "🇦🇷",
            sortValue: 1,
          },
          {
            id: "ronaldinho",
            label: pick(locale, "Ronaldinho", "რონალდინიო"),
            details: pick(locale, "1 win", "1 ჯილდო"),
            emoji: "🇧🇷",
            sortValue: 4,
          },
          {
            id: "ronaldo",
            label: pick(locale, "Cristiano Ronaldo", "კრიშტიანუ რონალდუ"),
            details: pick(locale, "5 wins", "5 ჯილდო"),
            emoji: "🇵🇹",
            sortValue: 2,
          },
        ],
      },
      {
        id: "demo-pio-2",
        category: pick(locale, "Transfers", "ტრანსფერები"),
        prompt: pick(
          locale,
          "Order these transfers by fee",
          "დაალაგე ტრანსფერები ღირებულებით",
        ),
        instruction: pick(
          locale,
          "most expensive to cheapest",
          "ყველაზე ძვირიდან ყველაზე იაფამდე",
        ),
        direction: "desc",
        items: [
          {
            id: "felix",
            label: pick(locale, "João Félix to Atlético", "ჟოაო ფელიქსი ატლეტიკოში"),
            details: "€126M",
            emoji: "🇵🇹",
            sortValue: 3,
          },
          {
            id: "pogba",
            label: pick(locale, "Pogba to Man United", "პოგბა მანჩესტერ იუნაიტედში"),
            details: "€105M",
            emoji: "🇫🇷",
            sortValue: 4,
          },
          {
            id: "neymar",
            label: pick(locale, "Neymar to PSG", "ნეიმარი პსჟ-ში"),
            details: "€222M",
            emoji: "🇧🇷",
            sortValue: 1,
          },
          {
            id: "mbappe",
            label: pick(locale, "Mbappé to PSG", "მბაპე პსჟ-ში"),
            details: "€180M",
            emoji: "🇫🇷",
            sortValue: 2,
          },
        ],
      },
    ],
  };
}

function imposterSession(locale: L): ImposterSession {
  return {
    challengeType: "imposter",
    title: pick(locale, "Imposter", "იმპოსტერი"),
    description: pick(
      locale,
      "Select every correct answer — avoid the imposters",
      "მონიშნე ყველა სწორი პასუხი — მოერიდე იმპოსტერებს",
    ),
    questionCount: 10,
    secondsPerQuestion: 25,
    questions: [
      {
        id: "demo-imp-1",
        category: pick(locale, "Awards", "ჯილდოები"),
        difficulty: "medium",
        prompt: pick(
          locale,
          "Which of these players have won the Ballon d'Or?",
          "ამ ფეხბურთელებიდან რომლებს აქვთ მოგებული ოქროს ბურთი?",
        ),
        options: [
          { id: "messi", text: pick(locale, "Lionel Messi", "ლიონელ მესი") },
          { id: "ramos", text: pick(locale, "Sergio Ramos", "სერხიო რამოსი") },
          { id: "modric", text: pick(locale, "Luka Modrić", "ლუკა მოდრიჩი") },
          { id: "neymar", text: pick(locale, "Neymar", "ნეიმარი") },
          { id: "ronaldo", text: pick(locale, "Cristiano Ronaldo", "კრიშტიანუ რონალდუ") },
          { id: "iniesta", text: pick(locale, "Andrés Iniesta", "ანდრეს ინიესტა") },
        ],
        correctOptionIds: ["messi", "modric", "ronaldo"],
      },
      {
        id: "demo-imp-2",
        category: pick(locale, "World Cup", "მსოფლიო ჩემპიონატი"),
        difficulty: "medium",
        prompt: pick(
          locale,
          "Which of these countries have hosted a FIFA World Cup?",
          "ამ ქვეყნებიდან რომლებს უმასპინძლიათ მსოფლიო ჩემპიონატისთვის?",
        ),
        options: [
          { id: "usa", text: pick(locale, "United States", "აშშ") },
          { id: "netherlands", text: pick(locale, "Netherlands", "ნიდერლანდები") },
          { id: "qatar", text: pick(locale, "Qatar", "კატარი") },
          { id: "portugal", text: pick(locale, "Portugal", "პორტუგალია") },
          { id: "southafrica", text: pick(locale, "South Africa", "სამხრეთ აფრიკა") },
          { id: "greece", text: pick(locale, "Greece", "საბერძნეთი") },
        ],
        correctOptionIds: ["usa", "qatar", "southafrica"],
      },
      {
        id: "demo-imp-3",
        category: pick(locale, "Barcelona", "ბარსელონა"),
        difficulty: "easy",
        prompt: pick(
          locale,
          "Which of these players have played for Barcelona?",
          "ამ ფეხბურთელებიდან რომლებს უთამაშიათ ბარსელონაში?",
        ),
        options: [
          { id: "messi", text: pick(locale, "Lionel Messi", "ლიონელ მესი") },
          { id: "zidane", text: pick(locale, "Zinedine Zidane", "ზინედინ ზიდანი") },
          { id: "ronaldinho", text: pick(locale, "Ronaldinho", "რონალდინიო") },
          { id: "beckham", text: pick(locale, "David Beckham", "დევიდ ბექჰემი") },
          { id: "neymar", text: pick(locale, "Neymar", "ნეიმარი") },
          { id: "kaka", text: pick(locale, "Kaká", "კაკა") },
        ],
        correctOptionIds: ["messi", "ronaldinho", "neymar"],
      },
      {
        id: "demo-imp-4",
        category: pick(locale, "Premier League", "პრემიერ ლიგა"),
        difficulty: "medium",
        prompt: pick(
          locale,
          "Which of these clubs have won the English Premier League?",
          "ამ კლუბებიდან რომლებს მოუგიათ ინგლისის პრემიერ ლიგა?",
        ),
        options: [
          { id: "mancity", text: pick(locale, "Manchester City", "მანჩესტერ სიტი") },
          { id: "tottenham", text: pick(locale, "Tottenham", "ტოტენჰემი") },
          { id: "leicester", text: pick(locale, "Leicester City", "ლესტერ სიტი") },
          { id: "newcastle", text: pick(locale, "Newcastle", "ნიუკასლი") },
          { id: "blackburn", text: pick(locale, "Blackburn Rovers", "ბლექბერნი") },
          { id: "everton", text: pick(locale, "Everton", "ევერტონი") },
        ],
        correctOptionIds: ["mancity", "leicester", "blackburn"],
      },
      {
        id: "demo-imp-5",
        category: pick(locale, "Positions", "პოზიციები"),
        difficulty: "easy",
        prompt: pick(
          locale,
          "Which of these players are goalkeepers?",
          "ამ ფეხბურთელებიდან რომლები არიან მეკარეები?",
        ),
        options: [
          { id: "buffon", text: pick(locale, "Gianluigi Buffon", "ჯანლუიჯი ბუფონი") },
          { id: "ramos", text: pick(locale, "Sergio Ramos", "სერხიო რამოსი") },
          { id: "neuer", text: pick(locale, "Manuel Neuer", "მანუელ ნოიერი") },
          { id: "kante", text: pick(locale, "N'Golo Kanté", "ნგოლო კანტე") },
          { id: "courtois", text: pick(locale, "Thibaut Courtois", "ტიბო კურტუა") },
          { id: "griezmann", text: pick(locale, "Antoine Griezmann", "ანტუან გრიზმანი") },
        ],
        correctOptionIds: ["buffon", "neuer", "courtois"],
      },
      {
        id: "demo-imp-6",
        category: pick(locale, "Euros", "ევროპის ჩემპიონატი"),
        difficulty: "medium",
        prompt: pick(
          locale,
          "Which of these countries have won the European Championship?",
          "ამ ქვეყნებიდან რომლებს მოუგიათ ევროპის ჩემპიონატი?",
        ),
        options: [
          { id: "greece", text: pick(locale, "Greece", "საბერძნეთი") },
          { id: "belgium", text: pick(locale, "Belgium", "ბელგია") },
          { id: "denmark", text: pick(locale, "Denmark", "დანია") },
          { id: "croatia", text: pick(locale, "Croatia", "ხორვატია") },
          { id: "portugal", text: pick(locale, "Portugal", "პორტუგალია") },
          { id: "turkey", text: pick(locale, "Turkey", "თურქეთი") },
        ],
        correctOptionIds: ["greece", "denmark", "portugal"],
      },
      {
        id: "demo-imp-7",
        category: pick(locale, "World Cup", "მსოფლიო ჩემპიონატი"),
        difficulty: "medium",
        prompt: pick(
          locale,
          "Which of these players have won the World Cup?",
          "ამ ფეხბურთელებიდან რომლებს მოუგიათ მსოფლიო ჩემპიონატი?",
        ),
        options: [
          { id: "mbappe", text: pick(locale, "Kylian Mbappé", "კილიან მბაპე") },
          { id: "cr7", text: pick(locale, "Cristiano Ronaldo", "კრიშტიანუ რონალდუ") },
          { id: "iniesta", text: pick(locale, "Andrés Iniesta", "ანდრეს ინიესტა") },
          { id: "zlatan", text: pick(locale, "Zlatan Ibrahimović", "ზლატან იბრაჰიმოვიჩი") },
          { id: "kaka", text: pick(locale, "Kaká", "კაკა") },
          { id: "salah", text: pick(locale, "Mohamed Salah", "მოჰამედ სალაჰი") },
        ],
        correctOptionIds: ["mbappe", "iniesta", "kaka"],
      },
      {
        id: "demo-imp-8",
        category: pick(locale, "La Liga", "ლა ლიგა"),
        difficulty: "easy",
        prompt: pick(
          locale,
          "Which of these clubs play in Spain's La Liga?",
          "ამ კლუბებიდან რომლები თამაშობენ ესპანეთის ლა ლიგაში?",
        ),
        options: [
          { id: "sevilla", text: pick(locale, "Sevilla", "სევილია") },
          { id: "porto", text: pick(locale, "Porto", "პორტუ") },
          { id: "sociedad", text: pick(locale, "Real Sociedad", "რეალ სოსიედადი") },
          { id: "ajax", text: pick(locale, "Ajax", "აიაქსი") },
          { id: "villarreal", text: pick(locale, "Villarreal", "ვილიარეალი") },
          { id: "celtic", text: pick(locale, "Celtic", "სელტიკი") },
        ],
        correctOptionIds: ["sevilla", "sociedad", "villarreal"],
      },
      {
        id: "demo-imp-9",
        category: pick(locale, "Managers", "მწვრთნელები"),
        difficulty: "medium",
        prompt: pick(
          locale,
          "Which of these managers have won the Champions League?",
          "ამ მწვრთნელებიდან რომლებს მოუგიათ ჩემპიონთა ლიგა?",
        ),
        options: [
          { id: "guardiola", text: pick(locale, "Pep Guardiola", "პეპ გვარდიოლა") },
          { id: "wenger", text: pick(locale, "Arsène Wenger", "არსენ ვენგერი") },
          { id: "ancelotti", text: pick(locale, "Carlo Ancelotti", "კარლო ანჩელოტი") },
          { id: "bielsa", text: pick(locale, "Marcelo Bielsa", "მარსელო ბიელსა") },
          { id: "mourinho", text: pick(locale, "José Mourinho", "ჟოზე მოურინიო") },
          { id: "pochettino", text: pick(locale, "Mauricio Pochettino", "მაურისიო პოჩეტინო") },
        ],
        correctOptionIds: ["guardiola", "ancelotti", "mourinho"],
      },
      {
        id: "demo-imp-10",
        category: pick(locale, "Georgian football", "ქართული ფეხბურთი"),
        difficulty: "easy",
        prompt: pick(
          locale,
          "Which of these players are Georgian?",
          "ამ ფეხბურთელებიდან რომლები არიან ქართველები?",
        ),
        options: [
          { id: "kvara", text: pick(locale, "Khvicha Kvaratskhelia", "ხვიჩა კვარაცხელია") },
          { id: "dzyuba", text: pick(locale, "Artem Dzyuba", "არტიომ ძიუბა") },
          { id: "mikautadze", text: pick(locale, "Georges Mikautadze", "გიორგი მიქაუტაძე") },
          { id: "shevchenko", text: pick(locale, "Andriy Shevchenko", "ანდრი შევჩენკო") },
          { id: "chakvetadze", text: pick(locale, "Giorgi Chakvetadze", "გიორგი ჩაკვეტაძე") },
          { id: "miranchuk", text: pick(locale, "Aleksei Miranchuk", "ალექსეი მირანჩუკი") },
        ],
        correctOptionIds: ["kvara", "mikautadze", "chakvetadze"],
      },
    ],
  };
}

function careerPathSession(locale: L): CareerPathSession {
  return {
    challengeType: "careerPath",
    title: pick(locale, "Career Path", "კარიერის გზა"),
    description: pick(
      locale,
      "Name the player from their transfer history",
      "გამოიცანი ფეხბურთელი მისი ტრანსფერების ისტორიით",
    ),
    questionCount: 10,
    secondsPerQuestion: 25,
    // Club names must resolve in features/daily/clubCrests.ts so the pills
    // render crests; paths are subsets of real careers chosen accordingly.
    questions: [
      {
        id: "demo-cp-1",
        category: pick(locale, "Careers", "კარიერები"),
        difficulty: "easy",
        prompt: pick(
          locale,
          "Which English midfielder followed this path?",
          "რომელმა ინგლისელმა ნახევარმცველმა გაიარა ეს გზა?",
        ),
        clubs: [
          pick(locale, "Borussia Dortmund", "ბორუსია დორტმუნდი"),
          pick(locale, "Real Madrid", "რეალ მადრიდი"),
        ],
        displayAnswer: pick(locale, "Jude Bellingham", "ჯუდ ბელინგემი"),
        acceptedAnswers: ["Jude Bellingham", "Bellingham", "ჯუდ ბელინგემი", "ბელინგემი"],
      },
      {
        id: "demo-cp-2",
        category: pick(locale, "Careers", "კარიერები"),
        difficulty: "easy",
        prompt: pick(locale, "Who followed this path?", "ვინ გაიარა ეს გზა?"),
        clubs: [
          pick(locale, "Manchester United", "მანჩესტერ იუნაიტედი"),
          pick(locale, "Real Madrid", "რეალ მადრიდი"),
          pick(locale, "Juventus", "იუვენტუსი"),
        ],
        displayAnswer: pick(locale, "Cristiano Ronaldo", "კრიშტიანუ რონალდუ"),
        acceptedAnswers: [
          "Cristiano Ronaldo",
          "Ronaldo",
          "CR7",
          "კრიშტიანუ რონალდუ",
          "რონალდუ",
        ],
      },
      {
        id: "demo-cp-3",
        category: pick(locale, "Georgian football", "ქართული ფეხბურთი"),
        difficulty: "easy",
        prompt: pick(
          locale,
          "Which Georgian star followed this path?",
          "რომელმა ქართველმა ვარსკვლავმა გაიარა ეს გზა?",
        ),
        clubs: [pick(locale, "Napoli", "ნაპოლი"), pick(locale, "PSG", "პსჟ")],
        displayAnswer: pick(locale, "Khvicha Kvaratskhelia", "ხვიჩა კვარაცხელია"),
        acceptedAnswers: [
          "Khvicha Kvaratskhelia",
          "Kvaratskhelia",
          "Kvara",
          "ხვიჩა კვარაცხელია",
          "კვარაცხელია",
          "ხვიჩა",
        ],
      },
      {
        id: "demo-cp-4",
        category: pick(locale, "Careers", "კარიერები"),
        difficulty: "easy",
        prompt: pick(
          locale,
          "Which Argentine legend followed this path?",
          "რომელმა არგენტინელმა ლეგენდამ გაიარა ეს გზა?",
        ),
        clubs: [pick(locale, "Barcelona", "ბარსელონა"), pick(locale, "PSG", "პსჟ")],
        displayAnswer: pick(locale, "Lionel Messi", "ლიონელ მესი"),
        acceptedAnswers: ["Lionel Messi", "Messi", "ლიონელ მესი", "მესი"],
      },
      {
        id: "demo-cp-5",
        category: pick(locale, "Careers", "კარიერები"),
        difficulty: "easy",
        prompt: pick(locale, "Who followed this path?", "ვინ გაიარა ეს გზა?"),
        clubs: [
          pick(locale, "Monaco", "მონაკო"),
          pick(locale, "PSG", "პსჟ"),
          pick(locale, "Real Madrid", "რეალ მადრიდი"),
        ],
        displayAnswer: pick(locale, "Kylian Mbappé", "კილიან მბაპე"),
        acceptedAnswers: ["Kylian Mbappe", "Mbappe", "კილიან მბაპე", "მბაპე"],
      },
      {
        id: "demo-cp-6",
        category: pick(locale, "Careers", "კარიერები"),
        difficulty: "medium",
        prompt: pick(locale, "Who followed this path?", "ვინ გაიარა ეს გზა?"),
        clubs: [
          pick(locale, "Sevilla", "სევილია"),
          pick(locale, "Real Madrid", "რეალ მადრიდი"),
          pick(locale, "PSG", "პსჟ"),
        ],
        displayAnswer: pick(locale, "Sergio Ramos", "სერხიო რამოსი"),
        acceptedAnswers: ["Sergio Ramos", "Ramos", "სერხიო რამოსი", "რამოსი"],
      },
      {
        id: "demo-cp-7",
        category: pick(locale, "Careers", "კარიერები"),
        difficulty: "medium",
        prompt: pick(locale, "Who followed this path?", "ვინ გაიარა ეს გზა?"),
        clubs: [
          pick(locale, "Juventus", "იუვენტუსი"),
          pick(locale, "Bayern Munich", "ბაიერნი"),
          pick(locale, "Manchester United", "მანჩესტერ იუნაიტედი"),
        ],
        displayAnswer: pick(locale, "Matthijs de Ligt", "მატაის დე ლიხტი"),
        acceptedAnswers: ["Matthijs de Ligt", "de Ligt", "De Ligt", "დე ლიხტი", "მატაის დე ლიხტი"],
      },
      {
        id: "demo-cp-8",
        category: pick(locale, "Careers", "კარიერები"),
        difficulty: "medium",
        prompt: pick(
          locale,
          "Which Senegalese forward followed this path?",
          "რომელმა სენეგალელმა თავდამსხმელმა გაიარა ეს გზა?",
        ),
        clubs: [
          pick(locale, "Liverpool", "ლივერპული"),
          pick(locale, "Bayern Munich", "ბაიერნი"),
        ],
        displayAnswer: pick(locale, "Sadio Mané", "სადიო მანე"),
        acceptedAnswers: ["Sadio Mane", "Mane", "სადიო მანე", "მანე"],
      },
      {
        id: "demo-cp-9",
        category: pick(locale, "Careers", "კარიერები"),
        difficulty: "medium",
        prompt: pick(
          locale,
          "Which Croatian midfielder followed this path?",
          "რომელმა ხორვატმა ნახევარმცველმა გაიარა ეს გზა?",
        ),
        clubs: [
          pick(locale, "Tottenham", "ტოტენჰემი"),
          pick(locale, "Real Madrid", "რეალ მადრიდი"),
        ],
        displayAnswer: pick(locale, "Luka Modrić", "ლუკა მოდრიჩი"),
        acceptedAnswers: ["Luka Modric", "Modric", "ლუკა მოდრიჩი", "მოდრიჩი"],
      },
      {
        id: "demo-cp-10",
        category: pick(locale, "Georgian football", "ქართული ფეხბურთი"),
        difficulty: "easy",
        prompt: pick(
          locale,
          "Which Georgian legend followed this path?",
          "რომელმა ქართველმა ლეგენდამ გაიარა ეს გზა?",
        ),
        clubs: [pick(locale, "AC Milan", "მილანი"), pick(locale, "Genoa", "ჯენოა")],
        displayAnswer: pick(locale, "Kakha Kaladze", "კახა კალაძე"),
        acceptedAnswers: ["Kakha Kaladze", "Kaladze", "კახა კალაძე", "კალაძე"],
      },
    ],
  };
}

function highLowSession(locale: L): HighLowSession {
  return {
    challengeType: "highLow",
    title: pick(locale, "Higher or Lower", "მეტი თუ ნაკლები"),
    description: pick(
      locale,
      "Pick the higher value to keep your chain alive",
      "აირჩიე მეტი მნიშვნელობა და შეინარჩუნე ჯაჭვი",
    ),
    roundCount: 2,
    secondsPerRound: 30,
    rounds: [
      {
        id: "demo-hl-1",
        category: pick(locale, "International goals", "ნაკრების გოლები"),
        difficulty: "medium",
        prompt: pick(
          locale,
          "Who has more international goals?",
          "ვის აქვს მეტი გოლი ეროვნულ ნაკრებში?",
        ),
        statLabel: pick(locale, "International goals", "გოლები ნაკრებში"),
        matchups: [
          {
            id: "hl-1a",
            leftName: pick(locale, "Cristiano Ronaldo", "კრიშტიანუ რონალდუ"),
            leftValue: 138,
            rightName: pick(locale, "Lionel Messi", "ლიონელ მესი"),
            rightValue: 112,
          },
          {
            id: "hl-1b",
            leftName: pick(locale, "Kylian Mbappé", "კილიან მბაპე"),
            leftValue: 50,
            rightName: pick(locale, "Neymar", "ნეიმარი"),
            rightValue: 79,
          },
          {
            id: "hl-1c",
            leftName: pick(locale, "Harry Kane", "ჰარი კეინი"),
            leftValue: 73,
            rightName: pick(locale, "Robert Lewandowski", "რობერტ ლევანდოვსკი"),
            rightValue: 85,
          },
          {
            id: "hl-1d",
            leftName: pick(locale, "Zlatan Ibrahimović", "ზლატან იბრაჰიმოვიჩი"),
            leftValue: 62,
            rightName: pick(locale, "Luis Suárez", "ლუის სუარესი"),
            rightValue: 69,
          },
          {
            id: "hl-1e",
            leftName: pick(locale, "Edinson Cavani", "ედინსონ კავანი"),
            leftValue: 58,
            rightName: pick(locale, "Sergio Agüero", "სერხიო აგუერო"),
            rightValue: 41,
          },
        ],
      },
      {
        id: "demo-hl-2",
        category: pick(locale, "English football", "ინგლისური ფეხბურთი"),
        difficulty: "medium",
        prompt: pick(
          locale,
          "Which club has more Premier League titles?",
          "რომელ კლუბს აქვს მეტი პრემიერ ლიგის ტიტული?",
        ),
        statLabel: pick(locale, "Premier League titles", "პრემიერ ლიგის ტიტულები"),
        matchups: [
          {
            id: "hl-2a",
            leftName: pick(locale, "Manchester United", "მანჩესტერ იუნაიტედი"),
            leftValue: 13,
            rightName: pick(locale, "Manchester City", "მანჩესტერ სიტი"),
            rightValue: 8,
          },
          {
            id: "hl-2b",
            leftName: pick(locale, "Chelsea", "ჩელსი"),
            leftValue: 5,
            rightName: pick(locale, "Arsenal", "არსენალი"),
            rightValue: 3,
          },
          {
            id: "hl-2c",
            leftName: pick(locale, "Liverpool", "ლივერპული"),
            leftValue: 2,
            rightName: pick(locale, "Leicester City", "ლესტერ სიტი"),
            rightValue: 1,
          },
          {
            id: "hl-2d",
            leftName: pick(locale, "Blackburn Rovers", "ბლექბერნი"),
            leftValue: 1,
            rightName: pick(locale, "Everton", "ევერტონი"),
            rightValue: 0,
          },
          {
            id: "hl-2e",
            leftName: pick(locale, "Manchester City", "მანჩესტერ სიტი"),
            leftValue: 8,
            rightName: pick(locale, "Chelsea", "ჩელსი"),
            rightValue: 5,
          },
        ],
      },
    ],
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
  switch (type) {
    case "moneyDrop":
      return moneyDropSession(locale);
    case "trueFalse":
      return trueFalseSession(locale);
    case "clues":
      return cluesSession(locale);
    case "countdown":
      return countdownSession(locale);
    case "putInOrder":
      return putInOrderSession(locale);
    case "imposter":
      return imposterSession(locale);
    case "careerPath":
      return careerPathSession(locale);
    case "highLow":
      return highLowSession(locale);
    case "footballLogic":
      return footballLogicSession(locale);
  }
}
