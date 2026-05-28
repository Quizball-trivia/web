import type { Locale } from "./locale";

export interface AboutCopy {
  metaTitle: string;
  metaDescription: string;
  title: string;
  subtitle: string;
  paragraphs: string[];
}

export interface LegalSection {
  title: string;
  body: string;
  bullets?: string[];
}

export interface LegalCopy {
  metaTitle: string;
  metaDescription: string;
  title: string;
  updated: string;
  sections: LegalSection[];
}

export interface LandingCopy {
  metaTitle: string;
  metaDescription: string;
  languageSwitch: string;
  aboutLink: string;
  termsLink: string;
  privacyLink: string;
}

export interface LocaleCopy {
  about: AboutCopy;
  terms: LegalCopy;
  privacy: LegalCopy;
  landing: LandingCopy;
}

// English source of truth. Georgian translation produced by
// `tmp/translate-marketing.mjs` (Gemini via OpenRouter). Reviewed for legal
// terminology and idiomatic phrasing before commit.
const en: LocaleCopy = {
  about: {
    metaTitle: "About QuizBall – Multiplayer Football Trivia Game",
    metaDescription:
      "Learn about QuizBall, a multiplayer football trivia game where fans answer questions, control possession, score goals, and compete with friends.",
    title: "About QuizBall",
    subtitle: "Multiplayer football trivia — closer to a match than a quiz",
    paragraphs: [
      "QuizBall is a multiplayer football trivia game built for fans who want more than a simple quiz.",
      "Instead of only answering questions for points, players compete in live football-style matches. Correct answers help you control possession, create momentum, and score goals. The goal is to make football knowledge feel like an actual match: competitive, fast, social, and tense.",
      "QuizBall is designed for fans who follow clubs, players, tournaments, transfers, football history, and the small details that make the game interesting. You can challenge friends, test your football IQ, climb the leaderboard, and prove who really knows the game.",
      "Our mission is to turn football trivia into a real competitive experience — closer to a game than a static quiz.",
      "QuizBall is currently being developed and improved continuously. New modes, questions, rankings, and social features will be added over time.",
    ],
  },
  terms: {
    metaTitle: "Terms of Service – QuizBall",
    metaDescription:
      "Read the QuizBall Terms of Service — the rules for playing our football trivia game and using the platform.",
    title: "Terms of Service",
    updated: "Last updated: January 30, 2026",
    sections: [
      {
        title: "1. Acceptance of Terms",
        body: 'By accessing or using QuizBall ("the Service"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Service.',
      },
      {
        title: "2. Description of Service",
        body: "QuizBall is a real-time multiplayer football trivia game. We provide a platform for users to compete in quiz matches, earn ratings, and track their progress. We reserve the right to modify or discontinue the Service at any time without notice.",
      },
      {
        title: "3. User Accounts",
        body: "You are responsible for maintaining the confidentiality of your account credentials. You agree to accept responsibility for all activities that occur under your account. We reserve the right to terminate accounts that violate our community guidelines or cheat in competitive play.",
      },
      {
        title: "4. Virtual Currency and Items",
        body: 'The Service may include virtual currency ("Coins") or items. These items have no real-world value and cannot be exchanged for cash. We do not guarantee, and are not responsible for, the persistence of user data or virtual items.',
      },
      {
        title: "5. Prohibited Conduct",
        body: "You agree not to use the Service for any unlawful purpose or to:",
        bullets: [
          "Harass, abuse, or harm another person.",
          "Use bots, cheats, or automation software.",
          "Interfere with the proper operation of the Service.",
        ],
      },
      {
        title: "6. Limitation of Liability",
        body: "In no event shall QuizBall, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.",
      },
      {
        title: "7. Changes to Terms",
        body: "We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days notice prior to any new terms taking effect.",
      },
      {
        title: "8. Contact Us",
        body: "If you have any questions about these Terms, please contact us at support@quizball.com.",
      },
    ],
  },
  privacy: {
    metaTitle: "Privacy Policy – QuizBall",
    metaDescription:
      "Read the QuizBall Privacy Policy — how we collect, use, and protect data when you play our football trivia game.",
    title: "Privacy Policy",
    updated: "Last updated: January 30, 2026",
    sections: [
      {
        title: "1. Introduction",
        body: 'QuizBall ("us", "we", or "our") operates the quizball.com website and mobile application (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.',
      },
      {
        title: "2. Information Collection and Use",
        body: "We collect several different types of information for various purposes to provide and improve our Service to you:",
        bullets: [
          "Personal Data: While using our Service, we may ask you to provide certain personally identifiable information (e.g., email address, nickname).",
          "Usage Data: We may also collect information on how the Service is accessed and used (e.g., gameplay statistics, device information).",
        ],
      },
      {
        title: "3. Use of Data",
        body: "QuizBall uses the collected data for various purposes:",
        bullets: [
          "To provide and maintain the Service",
          "To notify you about changes to our Service",
          "To allow you to participate in interactive features",
          "To provide customer care and support",
          "To monitor the usage of the Service",
        ],
      },
      {
        title: "4. Data Security",
        body: "The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.",
      },
      {
        title: "5. Third-Party Services",
        body: 'We may employ third party companies and individuals to facilitate our Service ("Service Providers"), to provide the Service on our behalf, or to assist us in analyzing how our Service is used. These third parties have access to your Personal Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.',
      },
      {
        title: "6. Data Retention and Deletion",
        body: "You can request deletion of your QuizBall account and associated personal data by signing in, opening Settings, going to Account & Safety, and selecting Delete Account. Your account is disabled immediately and scheduled for deletion. You may also contact us at privacy@quizball.com for help with deletion requests.",
      },
    ],
  },
  landing: {
    metaTitle: "QuizBall – Multiplayer Football Trivia Game",
    metaDescription:
      "Play live football trivia battles with friends. Answer questions, control possession, score goals, and climb the leaderboard.",
    languageSwitch: "ქართული",
    aboutLink: "About Us",
    termsLink: "Terms",
    privacyLink: "Privacy",
  },
};

const ka: LocaleCopy = {
  about: {
    metaTitle: "QuizBall-ის შესახებ – მრავალმოთამაშიანი საფეხბურთო ქვიზი",
    metaDescription:
      "გაიგეთ მეტი QuizBall-ის შესახებ. ეს არის მრავალმოთამაშიანი საფეხბურთო ქვიზი, სადაც გულშემატკივრები პასუხობენ კითხვებს, აკონტროლებენ ბურთს, გააქვთ გოლები და ეჯიბრებიან მეგობრებს.",
    title: "QuizBall-ის შესახებ",
    subtitle:
      "მრავალმოთამაშიანი საფეხბურთო ქვიზი — უფრო მეტი, ვიდრე უბრალოდ კითხვები",
    paragraphs: [
      "QuizBall არის მრავალმოთამაშიანი საფეხბურთო ქვიზი, რომელიც შექმნილია იმ გულშემატკივრებისთვის, ვისაც მარტივ კითხვებზე მეტი სურს.",
      "ქულებისთვის კითხვებზე პასუხის გაცემის ნაცვლად, მოთამაშეები ერთმანეთს რეალურ დროში, საფეხბურთო მატჩის სტილში ეჯიბრებიან. სწორი პასუხები გეხმარებათ ბურთის ფლობაში, უპირატესობის მოპოვებასა და გოლების გატანაში. ჩვენი მიზანია, ფეხბურთის ცოდნა ნამდვილ მატჩად ვაქციოთ: კონკურენტულ, სწრაფ, სოციალურ და დაძაბულ გამოცდილებად.",
      "QuizBall შექმნილია მათთვის, ვინც თვალს ადევნებს კლუბებს, მოთამაშეებს, ტურნირებს, ტრანსფერებს, ფეხბურთის ისტორიასა და იმ წვრილმან დეტალებს, რაც ამ თამაშს ასე საინტერესოს ხდის. თქვენ შეგიძლიათ გამოიწვიოთ მეგობრები, შეამოწმოთ თქვენი საფეხბურთო IQ, დაწინაურდეთ რეიტინგში და დაამტკიცოთ, ვინ ფლობს საუკეთესო ცოდნას.",
      "ჩვენი მისიაა, საფეხბურთო ქვიზი ნამდვილ შეჯიბრად ვაქციოთ — ის უფრო ახლოსაა თამაშთან, ვიდრე სტატიკურ კითხვარებთან.",
      "QuizBall ამჟამად განვითარების პროცესშია და მუდმივად იხვეწება. დროთა განმავლობაში დაემატება ახალი რეჟიმები, კითხვები, რეიტინგები და სოციალური ფუნქციები.",
    ],
  },
  terms: {
    metaTitle: "მომსახურების პირობები – QuizBall",
    metaDescription:
      "წაიკითხეთ QuizBall-ის მომსახურების პირობები — ჩვენი საფეხბურთო ქვიზ-თამაშის წესები და პლატფორმით სარგებლობის ინსტრუქციები.",
    title: "მომსახურების პირობები",
    updated: "ბოლო განახლება: 30 იანვარი, 2026",
    sections: [
      {
        title: "1. პირობებზე დათანხმება",
        body: "QuizBall-ზე („მომსახურება“) წვდომით ან მისი გამოყენებით, თქვენ ეთანხმებით წინამდებარე მომსახურების პირობებს. თუ თქვენ არ ეთანხმებით პირობების რომელიმე ნაწილს, თქვენ არ გაქვთ მომსახურებაზე წვდომის უფლება.",
      },
      {
        title: "2. მომსახურების აღწერა",
        body: "QuizBall არის რეალურ დროში მრავალმოთამაშიანი საფეხბურთო ქვიზ-თამაში. ჩვენ მომხმარებლებს ვთავაზობთ პლატფორმას ქვიზ-მატჩებში ასასპარეზებლად, რეიტინგების მოსაპოვებლად და პროგრესის სათვალთვალოდ. ჩვენ ვიტოვებთ უფლებას, ნებისმიერ დროს, წინასწარი შეტყობინების გარეშე შევცვალოთ ან შევწყვიტოთ მომსახურების მიწოდება.",
      },
      {
        title: "3. მომხმარებლის ანგარიშები",
        body: "თქვენ ხართ პასუხისმგებელი თქვენი ანგარიშის მონაცემების კონფიდენციალურობის დაცვაზე. თქვენ თანხმდებით პასუხისმგებლობის აღებაზე ყველა იმ ქმედებაზე, რომელიც განხორციელდება თქვენი ანგარიშის მეშვეობით. ჩვენ ვიტოვებთ უფლებას, გავაუქმოთ ის ანგარიშები, რომლებიც არღვევენ ჩვენი საზოგადოების წესებს ან იყენებენ თაღლითურ მეთოდებს შეჯიბრებით თამაშებში.",
      },
      {
        title: "4. ვირტუალური ვალუტა და ნივთები",
        body: "მომსახურება შეიძლება მოიცავდეს ვირტუალურ ვალუტას („მონეტები“) ან ნივთებს. ამ ნივთებს არ გააჩნიათ რეალური ღირებულება და მათი გადაცვლა ნაღდ ფულზე შეუძლებელია. ჩვენ არ ვიძლევით გარანტიას და არ ვართ პასუხისმგებელნი მომხმარებლის მონაცემების ან ვირტუალური ნივთების შენარჩუნებაზე.",
      },
      {
        title: "5. აკრძალული ქმედებები",
        body: "თქვენ თანხმდებით, რომ არ გამოიყენებთ მომსახურებას რაიმე უკანონო მიზნით ან შემდეგი ქმედებებისთვის:",
        bullets: [
          "სხვა პირის შევიწროება, შეურაცხყოფა ან ზიანის მიყენება.",
          "ბოტების, თაღლითური პროგრამების (cheats) ან ავტომატიზაციის პროგრამული უზრუნველყოფის გამოყენება.",
          "მომსახურების გამართულ ფუნქციონირებაში ჩარევა.",
        ],
      },
      {
        title: "6. პასუხისმგებლობის შეზღუდვა",
        body: "არავითარ შემთხვევაში QuizBall, მისი დირექტორები, თანამშრომლები, პარტნიორები, აგენტები, მომწოდებლები ან შვილობილი კომპანიები არ არიან პასუხისმგებელნი რაიმე არაპირდაპირ, შემთხვევით, სპეციალურ, შედეგობრივ ან საჯარიმო ზიანზე, მათ შორის, შეზღუდვის გარეშე, მოგების, მონაცემების, სარგებლობის, რეპუტაციის დაკარგვაზე ან სხვა არამატერიალურ ზარალზე.",
      },
      {
        title: "7. ცვლილებები პირობებში",
        body: "ჩვენ ვიტოვებთ უფლებას, ჩვენი შეხედულებისამებრ, ნებისმიერ დროს შევცვალოთ ან ჩავანაცვლოთ წინამდებარე პირობები. თუ ცვლილება არსებითია, ჩვენ შევეცდებით მოგაწოდოთ შეტყობინება ახალი პირობების ძალაში შესვლამდე მინიმუმ 30 დღით ადრე.",
      },
      {
        title: "8. კონტაქტი",
        body: "თუ გაქვთ რაიმე შეკითხვა ამ პირობებთან დაკავშირებით, გთხოვთ, დაგვიკავშირდეთ მისამართზე: support@quizball.com.",
      },
    ],
  },
  privacy: {
    metaTitle: "კონფიდენციალურობის პოლიტიკა – QuizBall",
    metaDescription:
      "წაიკითხეთ QuizBall-ის კონფიდენციალურობის პოლიტიკა — როგორ ვაგროვებთ, ვიყენებთ და ვიცავთ მონაცემებს, როდესაც თამაშობთ ჩვენს საფეხბურთო ქვიზს.",
    title: "კონფიდენციალურობის პოლიტიკა",
    updated: "ბოლო განახლება: 30 იანვარი, 2026",
    sections: [
      {
        title: "1. შესავალი",
        body: "QuizBall („ჩვენ“, „ჩვენი“ ან „ჩვენს“) მართავს quizball.com ვებსაიტს და მობილურ აპლიკაციას („მომსახურება“). ეს გვერდი გაწვდით ინფორმაციას ჩვენი პოლიტიკის შესახებ, რომელიც ეხება პერსონალური მონაცემების შეგროვებას, გამოყენებასა და გამჟღავნებას ჩვენი მომსახურებით სარგებლობისას, ასევე იმ არჩევანის შესახებ, რომელიც თქვენ გაქვთ ამ მონაცემებთან დაკავშირებით.",
      },
      {
        title: "2. ინფორმაციის შეგროვება და გამოყენება",
        body: "ჩვენ ვაგროვებთ რამდენიმე სხვადასხვა ტიპის ინფორმაციას სხვადასხვა მიზნით, რათა მოგაწოდოთ და გავაუმჯობესოთ ჩვენი მომსახურება:",
        bullets: [
          "პერსონალური მონაცემები: ჩვენი მომსახურებით სარგებლობისას, შესაძლოა გთხოვოთ მოგვაწოდოთ გარკვეული პერსონალური იდენტიფიცირებადი ინფორმაცია (მაგ. ელფოსტის მისამართი, მეტსახელი).",
          "გამოყენების მონაცემები: ჩვენ ასევე შეგვიძლია შევაგროვოთ ინფორმაცია იმის შესახებ, თუ როგორ ხდება მომსახურებაზე წვდომა და მისი გამოყენება (მაგ. თამაშის სტატისტიკა, მოწყობილობის ინფორმაცია).",
        ],
      },
      {
        title: "3. მონაცემთა გამოყენება",
        body: "QuizBall შეგროვებულ მონაცემებს იყენებს სხვადასხვა მიზნით:",
        bullets: [
          "მომსახურების უზრუნველსაყოფად და შესანარჩუნებლად",
          "ჩვენს მომსახურებაში განხორციელებული ცვლილებების შესახებ თქვენს ინფორმირებისთვის",
          "ინტერაქტიულ ფუნქციებში თქვენი მონაწილეობის შესაძლებლობისთვის",
          "მომხმარებელთა მხარდაჭერისა და დახმარების უზრუნველსაყოფად",
          "მომსახურების გამოყენების მონიტორინგისთვის",
        ],
      },
      {
        title: "4. მონაცემთა უსაფრთხოება",
        body: "თქვენი მონაცემების უსაფრთხოება ჩვენთვის მნიშვნელოვანია, თუმცა გახსოვდეთ, რომ ინტერნეტით მონაცემთა გადაცემის ან ელექტრონული შენახვის არცერთი მეთოდი არ არის 100%-ით უსაფრთხო. მიუხედავად იმისა, რომ ჩვენ ვცდილობთ გამოვიყენოთ კომერციულად მისაღები საშუალებები თქვენი პერსონალური მონაცემების დასაცავად, ჩვენ ვერ ვიძლევით მისი აბსოლუტური უსაფრთხოების გარანტიას.",
      },
      {
        title: "5. მესამე მხარის მომსახურებები",
        body: "ჩვენ შეიძლება დავიქირაოთ მესამე მხარის კომპანიები და ფიზიკური პირები ჩვენი მომსახურების ხელშეწყობისთვის („მომსახურების მომწოდებლები“), ჩვენი სახელით მომსახურების გასაწევად ან ჩვენი მომსახურების გამოყენების ანალიზში დასახმარებლად. ამ მესამე მხარეებს აქვთ წვდომა თქვენს პერსონალურ მონაცემებზე მხოლოდ ამ დავალებების ჩვენი სახელით შესასრულებლად და ვალდებულნი არიან არ გაამჟღავნონ ან გამოიყენონ ისინი სხვა მიზნით.",
      },
      {
        title: "6. მონაცემთა შენახვა და წაშლა",
        body: "თქვენ შეგიძლიათ მოითხოვოთ თქვენი QuizBall ანგარიშისა და მასთან დაკავშირებული პერსონალური მონაცემების წაშლა: შედით ანგარიშში, გახსენით Settings, გადადით Account & Safety განყოფილებაში და აირჩიეთ Delete Account. თქვენი ანგარიში დაუყოვნებლივ გაითიშება და დაიგეგმება წაშლისთვის. წაშლის მოთხოვნებთან დაკავშირებით დახმარებისთვის ასევე შეგიძლიათ დაგვიკავშირდეთ მისამართზე privacy@quizball.com.",
      },
    ],
  },
  landing: {
    metaTitle: "QuizBall – მრავალმოთამაშიანი საფეხბურთო ქვიზ-თამაში",
    metaDescription:
      "ითამაშეთ საფეხბურთო ქვიზ-ბრძოლები მეგობრებთან ერთად რეალურ დროში. უპასუხეთ კითხვებს, აკონტროლეთ ბურთი, გაიტანეთ გოლები და დაიკავეთ ადგილი ლიდერბორდში.",
    languageSwitch: "English",
    aboutLink: "ჩვენს შესახებ",
    termsLink: "წესები",
    privacyLink: "კონფიდენციალურობა",
  },
};

const copy: Record<Locale, LocaleCopy> = { en, ka };

export function getCopy(locale: Locale): LocaleCopy {
  return copy[locale];
}
