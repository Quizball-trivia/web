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
      "QuizBall is a multiplayer football trivia game where correct answers win possession, create chances and score goals. Play live 1v1 matches, challenge friends, return for daily formats and climb the leaderboard.",
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
      "QuizBall არის მრავალმოთამაშიანი საფეხბურთო ქვიზი, სადაც სწორი პასუხები გაძლევს ბურთის ფლობას, ქმნის საგოლე შანსებს და გატანინებს გოლებს. ითამაშე ცოცხალი 1v1 მატჩები, გამოიწვიე მეგობრები, დაბრუნდი ყოველდღიური ფორმატებისთვის და დაწინაურდი ლიდერბორდზე.",
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

const es: LocaleCopy = {
  about: {
    metaTitle: "Acerca de QuizBall – Juego de Trivia de Fútbol Multijugador",
    metaDescription:
      "Aprende sobre QuizBall, un juego multijugador de trivia de fútbol donde los aficionados responden preguntas, controlan la posesión, marcan goles y compiten con amigos.",
    title: "Acerca de QuizBall",
    subtitle: "Trivia de fútbol multijugador — más parecida a un partido que a un concurso",
    paragraphs: [
      "QuizBall es un juego multijugador de trivia de fútbol donde las respuestas correctas ganan la posesión, crean ocasiones y marcan goles. Juega partidos 1 contra 1, desafía a tus amigos, vuelve para nuevos formatos diarios y sube en la clasificación.",
    ],
  },
  terms: {
    metaTitle: "Términos de Servicio – QuizBall",
    metaDescription:
      "Lee los Términos de Servicio de QuizBall — las reglas para jugar nuestro juego de trivia de fútbol y usar la plataforma.",
    title: "Términos de Servicio",
    updated: "Última actualización: 30 de enero de 2026",
    sections: [
      {
        title: "1. Aceptación de los Términos",
        body: 'Al acceder o utilizar QuizBall ("el Servicio"), aceptas regirte por estos Términos de Servicio. Si no estás de acuerdo con alguna parte de los términos, no podrás acceder al Servicio.',
      },
      {
        title: "2. Descripción del Servicio",
        body: "QuizBall es un juego de trivia de fútbol multijugador en tiempo real. Proporcionamos una plataforma para que los usuarios compitan en partidos de trivia, ganen clasificaciones y sigan su progreso. Nos reservamos el derecho de modificar o descontinuar el Servicio en cualquier momento sin previo aviso.",
      },
      {
        title: "3. Cuentas de Usuario",
        body: "Eres responsable de mantener la confidencialidad de las credenciales de tu cuenta. Aceptas asumir la responsabilidad de todas las actividades que ocurran bajo tu cuenta. Nos reservamos el derecho de cerrar cuentas que violen nuestras directrices comunitarias o hagan trampa en competiciones.",
      },
      {
        title: "4. Moneda Virtual y Objetos",
        body: 'El Servicio puede incluir moneda virtual ("Monedas") u objetos. Estos objetos no tienen valor en el mundo real y no pueden canjearse por dinero en efectivo. No garantizamos ni somos responsables de la persistencia de los datos del usuario o los objetos virtuales.',
      },
      {
        title: "5. Conducta Prohibida",
        body: "Aceptas no utilizar el Servicio para ningún propósito ilegal ni para:",
        bullets: [
          "Acosar, abusar o dañar a otra persona.",
          "Usar bots, trampas o software de automatización.",
          "Interferir con el correcto funcionamiento del Servicio.",
        ],
      },
      {
        title: "6. Limitación de Responsabilidad",
        body: "En ningún caso QuizBall, ni sus directores, empleados, socios, agentes, proveedores o afiliados, serán responsables de ningún daño indirecto, incidental, especial, consecuente o punitivo, incluyendo, entre otros, la pérdida de beneficios, datos, uso, buena voluntad u otras pérdidas intangibles.",
      },
      {
        title: "7. Cambios en los Términos",
        body: "Nos reservamos el derecho, a nuestra única discreción, de modificar o reemplazar estos Términos en cualquier momento. Si una revisión es material, intentaremos proporcionar un aviso de al menos 30 días antes de que cualquier término nuevo entre en vigor.",
      },
      {
        title: "8. Contacto",
        body: "Si tienes alguna pregunta sobre estos Términos, contáctanos en support@quizball.io.",
      },
    ],
  },
  privacy: {
    metaTitle: "Política de privacidad – QuizBall",
    metaDescription:
      "Lee la Política de Privacidad de QuizBall: cómo recopilamos, usamos y protegemos los datos cuando juegas a nuestro juego de trivia de fútbol.",
    title: "Política de privacidad",
    updated: "Última actualización: 30 de enero de 2026",
    sections: [
      {
        title: "1. Introducción",
        body: 'QuizBall ("nosotros", "nuestro" o "nuestra") opera el sitio web quizball.io y la aplicación móvil (el "Servicio"). Esta página te informa sobre nuestras políticas relativas a la recopilación, uso y divulgación de datos personales cuando utilizas nuestro Servicio y las opciones que tienes asociadas a esos datos.',
      },
      {
        title: "2. Recopilación y uso de información",
        body: "Recopilamos varios tipos de información para diversos fines, con el objetivo de proporcionarte y mejorar nuestro Servicio:",
        bullets: [
          "Datos personales: Al utilizar nuestro Servicio, podemos solicitarte cierta información de identificación personal (por ejemplo, dirección de correo electrónico o apodo).",
          "Datos de uso: También podemos recopilar información sobre cómo se accede y se utiliza el Servicio (por ejemplo, estadísticas de juego e información del dispositivo).",
        ],
      },
      {
        title: "3. Uso de Datos",
        body: "QuizBall utiliza los datos recopilados para diversos fines:",
        bullets: [
          "Proporcionar y mantener el Servicio",
          "Notificarte sobre cambios en nuestro Servicio",
          "Permitirte participar en funciones interactivas",
          "Proporcionar atención y soporte al cliente",
          "Supervisar el uso del Servicio",
        ],
      },
      {
        title: "4. Seguridad de Datos",
        body: "La seguridad de tus datos es importante para nosotros, pero recuerda que ningún método de transmisión por Internet ni de almacenamiento electrónico es 100 % seguro. Aunque nos esforzamos por utilizar medios comercialmente aceptables para proteger tus Datos Personales, no podemos garantizar su seguridad absoluta.",
      },
      {
        title: "5. Servicios de terceros",
        body: 'Podemos emplear a empresas y personas externas para facilitar nuestro Servicio ("Proveedores de Servicios"), proporcionarlo en nuestro nombre o ayudarnos a analizar cómo se utiliza. Estos terceros tienen acceso a tus Datos Personales solo para realizar estas tareas en nuestro nombre y están obligados a no divulgarlos ni utilizarlos para ningún otro propósito.',
      },
      {
        title: "6. Retención y eliminación de datos",
        body: "Puedes solicitar la eliminación de tu cuenta de QuizBall y los datos personales asociados iniciando sesión, abriendo Configuración, entrando en Cuenta y seguridad y seleccionando Eliminar cuenta. Tu cuenta se deshabilita inmediatamente y se programa para su eliminación. También puedes contactarnos en privacy@quizball.io para obtener ayuda.",
      },
    ],
  },
  landing: {
    metaTitle: "QuizBall – Juego Multijugador de Trivia de Fútbol",
    metaDescription:
      "Juega batallas de trivia de fútbol en vivo con amigos. Responde preguntas, controla la posesión, marca goles y sube en la clasificación.",
    languageSwitch: "English",
    aboutLink: "Sobre nosotros",
    termsLink: "Términos",
    privacyLink: "Privacidad",
  },
};

const copy: Record<Locale, LocaleCopy> = { en, ka, es };

export function getCopy(locale: Locale): LocaleCopy {
  return copy[locale];
}
