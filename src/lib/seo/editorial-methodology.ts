import type { Locale } from "@/lib/i18n/locale";

interface MethodologySection {
  title: string;
  body: string;
}

export interface EditorialMethodologyCopy {
  metaTitle: string;
  metaDescription: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  sections: MethodologySection[];
  correctionHeading: string;
  correctionBody: string;
  correctionLink: string;
  exploreHeading: string;
  exploreBody: string;
  hubLink: string;
  careerPathLink: string;
  clubBadgesLink: string;
}

export interface AboutCredibilityCopy {
  eyebrow: string;
  title: string;
  body: string;
  methodologyLink: string;
  reportLink: string;
  pressLink: string;
  exploreHeading: string;
  exploreBody: string;
  hubLink: string;
  careerPathLink: string;
  clubBadgesLink: string;
}

const methodologyCopy: Record<Locale, EditorialMethodologyCopy> = {
  en: {
    metaTitle: "QuizBall Editorial Methodology — How Questions Are Checked",
    metaDescription:
      "See how QuizBall researches, reviews, updates and corrects football trivia questions for its free quizzes and multiplayer game.",
    backLabel: "About QuizBall",
    eyebrow: "Editorial standards",
    title: "How QuizBall checks football quiz questions",
    intro:
      "Good football trivia should test knowledge, not vague wording. This is the process we use to make questions clear, current and fair.",
    updated: "Last updated: 30 August 2026",
    sections: [
      {
        title: "1. Start with a verifiable football fact",
        body:
          "Each question begins with an identifiable fact about a player, club, competition, match or record. Where possible, we prefer official competition and club sources, established statistical databases and reputable reporting over unsourced lists.",
      },
      {
        title: "2. Check the answer and the alternatives",
        body:
          "We review the correct answer, the wording and every alternative together. A distractor should be plausible enough to make the question interesting, but it must not create a second defensible answer.",
      },
      {
        title: "3. Add a date or season when facts can change",
        body:
          "Transfers, records, rankings and current squads change. Questions about moving facts should include the relevant season, competition or date so the answer remains unambiguous.",
      },
      {
        title: "4. Set difficulty without using tricks",
        body:
          "Difficulty should come from the football knowledge required, not confusing grammar or hidden assumptions. We mix accessible questions with deeper facts and review performance data when enough players have answered.",
      },
      {
        title: "5. Keep public quizzes separate from ranked availability",
        body:
          "Publishing a quiz for search visitors does not automatically publish those questions into ranked matches. Public quiz pages and the competitive question pool have separate availability controls.",
      },
      {
        title: "6. Correct material errors and record real updates",
        body:
          "When we find a material error, we correct or remove the affected question. Page update signals, including sitemap dates, should change only after a meaningful content update—not automatically on every request.",
      },
    ],
    correctionHeading: "Found a question that needs another look?",
    correctionBody:
      "Send the quiz name, question and the source you believe supports a correction. We will review the underlying fact and wording.",
    correctionLink: "Email support@quizball.io",
    exploreHeading: "See the method in action",
    exploreBody:
      "Start with two of QuizBall’s most useful football knowledge formats, or browse every free quiz.",
    hubLink: "Browse all football quizzes",
    careerPathLink: "Football Career Path Quiz",
    clubBadgesLink: "Football Club Badges Quiz",
  },
  ka: {
    metaTitle: "QuizBall-ის სარედაქციო მეთოდოლოგია — კითხვების გადამოწმება",
    metaDescription:
      "გაიგეთ, როგორ იკვლევს, ამოწმებს, აახლებს და ასწორებს QuizBall საფეხბურთო ქვიზის კითხვებს.",
    backLabel: "QuizBall-ის შესახებ",
    eyebrow: "სარედაქციო სტანდარტები",
    title: "როგორ ამოწმებს QuizBall საფეხბურთო ქვიზის კითხვებს",
    intro:
      "კარგი საფეხბურთო ქვიზი ცოდნას უნდა ამოწმებდეს და არა ბუნდოვან ფორმულირებას. ამ პროცესით კითხვებს მკაფიოს, აქტუალურსა და სამართლიანს ვხდით.",
    updated: "ბოლო განახლება: 30 აგვისტო, 2026",
    sections: [
      {
        title: "1. ვიწყებთ გადამოწმებადი საფეხბურთო ფაქტით",
        body:
          "თითოეული კითხვა ეფუძნება მოთამაშის, კლუბის, ტურნირის, მატჩის ან რეკორდის იდენტიფიცირებად ფაქტს. შეძლებისდაგვარად, უპირატესობას ვანიჭებთ ოფიციალურ წყაროებს, სანდო სტატისტიკურ ბაზებსა და ავტორიტეტულ მედიას.",
      },
      {
        title: "2. ვამოწმებთ პასუხსა და ყველა ვარიანტს",
        body:
          "სწორ პასუხს, კითხვის ფორმულირებასა და ყველა ვარიანტს ერთად ვამოწმებთ. არასწორი ვარიანტი საინტერესო უნდა იყოს, მაგრამ მეორე დასაბუთებულ პასუხს არ უნდა ქმნიდეს.",
      },
      {
        title: "3. ცვალებად ფაქტებს ვურთავთ თარიღს ან სეზონს",
        body:
          "ტრანსფერები, რეკორდები, რეიტინგები და შემადგენლობები იცვლება. ასეთ კითხვებში ვუთითებთ შესაბამის სეზონს, ტურნირს ან თარიღს, რათა პასუხი ერთმნიშვნელოვანი დარჩეს.",
      },
      {
        title: "4. სირთულე ცოდნაზეა დაფუძნებული და არა ხრიკებზე",
        body:
          "კითხვის სირთულე საჭირო საფეხბურთო ცოდნიდან უნდა მოდიოდეს და არა გაუგებარი გრამატიკიდან ან ფარული დაშვებებიდან. საკმარისი პასუხების დაგროვების შემდეგ მოთამაშეთა შედეგებსაც ვაანალიზებთ.",
      },
      {
        title: "5. საჯარო ქვიზები რეიტინგული თამაშისგან განცალკევებულია",
        body:
          "საძიებო ვიზიტორებისთვის ქვიზის გამოქვეყნება კითხვებს ავტომატურად არ ამატებს რეიტინგულ მატჩებში. საჯარო გვერდებსა და შეჯიბრებით კითხვების ბანკს ცალკე ხელმისაწვდომობის კონტროლი აქვს.",
      },
      {
        title: "6. მნიშვნელოვან შეცდომებს ვასწორებთ და რეალურ განახლებებს ვაფიქსირებთ",
        body:
          "მნიშვნელოვანი შეცდომის აღმოჩენისას კითხვას ვასწორებთ ან ვშლით. გვერდის განახლების სიგნალი, მათ შორის sitemap-ის თარიღი, მხოლოდ შინაარსობრივი ცვლილების შემდეგ იცვლება.",
      },
    ],
    correctionHeading: "იპოვეთ კითხვა, რომელიც ხელახლა უნდა გადავამოწმოთ?",
    correctionBody:
      "გამოგვიგზავნეთ ქვიზის სახელი, კითხვა და წყარო, რომელიც შესწორებას ადასტურებს. ჩვენ ფაქტსა და ფორმულირებას გადავამოწმებთ.",
    correctionLink: "მისწერეთ support@quizball.io-ს",
    exploreHeading: "ნახეთ მეთოდი პრაქტიკაში",
    exploreBody:
      "დაიწყეთ QuizBall-ის ორი გამორჩეული ფორმატით ან დაათვალიერეთ ყველა უფასო ქვიზი.",
    hubLink: "ყველა საფეხბურთო ქვიზი",
    careerPathLink: "ფეხბურთელის კარიერის ქვიზი",
    clubBadgesLink: "საფეხბურთო კლუბების ემბლემების ქვიზი",
  },
  es: {
    metaTitle: "Metodología editorial de QuizBall — Cómo revisamos las preguntas",
    metaDescription:
      "Descubre cómo QuizBall investiga, revisa, actualiza y corrige las preguntas de trivia de fútbol.",
    backLabel: "Acerca de QuizBall",
    eyebrow: "Estándares editoriales",
    title: "Cómo revisa QuizBall las preguntas de fútbol",
    intro:
      "Una buena trivia de fútbol debe poner a prueba tus conocimientos, no una redacción ambigua. Este es el proceso que usamos para crear preguntas claras, actuales y justas.",
    updated: "Última actualización: 30 de agosto de 2026",
    sections: [
      {
        title: "1. Empezamos con un dato de fútbol verificable",
        body:
          "Cada pregunta parte de un dato identificable sobre un jugador, club, competición, partido o récord. Siempre que es posible, preferimos fuentes oficiales, bases estadísticas reconocidas y medios fiables frente a listas sin referencias.",
      },
      {
        title: "2. Revisamos la respuesta y todas las alternativas",
        body:
          "Comprobamos juntos la respuesta correcta, la redacción y cada opción. Una alternativa debe ser plausible para que la pregunta resulte interesante, pero no puede crear una segunda respuesta defendible.",
      },
      {
        title: "3. Añadimos fecha o temporada cuando el dato puede cambiar",
        body:
          "Los fichajes, récords, clasificaciones y plantillas cambian. Estas preguntas deben incluir la temporada, competición o fecha relevante para que la respuesta siga siendo inequívoca.",
      },
      {
        title: "4. La dificultad viene del conocimiento, no de trucos",
        body:
          "La dificultad debe depender del conocimiento futbolístico necesario, no de una gramática confusa ni de supuestos ocultos. Cuando hay suficientes respuestas, también revisamos el rendimiento de los jugadores.",
      },
      {
        title: "5. Los quizzes públicos están separados del modo clasificatorio",
        body:
          "Publicar un quiz para visitantes de buscadores no publica automáticamente sus preguntas en partidas clasificatorias. Las páginas públicas y el banco competitivo tienen controles de disponibilidad separados.",
      },
      {
        title: "6. Corregimos errores materiales y registramos cambios reales",
        body:
          "Si encontramos un error material, corregimos o retiramos la pregunta. Las señales de actualización, incluidas las fechas del sitemap, solo deben cambiar tras una modificación relevante del contenido.",
      },
    ],
    correctionHeading: "¿Has encontrado una pregunta que deberíamos revisar?",
    correctionBody:
      "Envíanos el nombre del quiz, la pregunta y la fuente que respalda la corrección. Revisaremos el dato y la redacción.",
    correctionLink: "Escribir a support@quizball.io",
    exploreHeading: "Mira el método en acción",
    exploreBody:
      "Empieza con dos de los formatos más útiles de QuizBall o explora todos los quizzes gratuitos.",
    hubLink: "Ver todos los quizzes de fútbol",
    careerPathLink: "Quiz de Trayectoria del Jugador",
    clubBadgesLink: "Quiz de Escudos de Fútbol",
  },
  tr: {
    metaTitle: "QuizBall Editoryal Metodolojisi — Sorular Nasıl Kontrol Edilir",
    metaDescription:
      "QuizBall'un ücretsiz quizleri ve çok oyunculu oyunu için futbol bilgi sorularını nasıl araştırdığını, incelediğini, güncellediğini ve düzelttiğini gör.",
    backLabel: "QuizBall Hakkında",
    eyebrow: "Editoryal standartlar",
    title: "QuizBall futbol quiz sorularını nasıl kontrol eder",
    intro:
      "İyi bir futbol bilgi yarışması belirsiz ifadeleri değil bilgiyi sınamalı. Soruları açık, güncel ve adil yapmak için kullandığımız süreç bu.",
    updated: "Son güncelleme: 30 Ağustos 2026",
    sections: [
      {
        title: "1. Doğrulanabilir bir futbol gerçeğiyle başla",
        body:
          "Her soru bir oyuncu, kulüp, turnuva, maç veya rekor hakkında tanımlanabilir bir gerçekle başlar. Mümkün olduğunda kaynaksız listeler yerine resmi turnuva ve kulüp kaynaklarını, yerleşik istatistik veri tabanlarını ve güvenilir haberciliği tercih ederiz.",
      },
      {
        title: "2. Cevabı ve alternatifleri kontrol et",
        body:
          "Doğru cevabı, ifadeyi ve her alternatifi birlikte inceleriz. Bir çeldirici soruyu ilginç kılacak kadar makul olmalı, ancak savunulabilir ikinci bir cevap yaratmamalıdır.",
      },
      {
        title: "3. Gerçekler değişebiliyorsa tarih veya sezon ekle",
        body:
          "Transferler, rekorlar, sıralamalar ve güncel kadrolar değişir. Değişken gerçeklerle ilgili sorular, cevabın belirsizliğe düşmemesi için ilgili sezonu, turnuvayı veya tarihi içermelidir.",
      },
      {
        title: "4. Zorluğu hile kullanmadan belirle",
        body:
          "Zorluk kafa karıştırıcı dil bilgisinden veya gizli varsayımlardan değil, gereken futbol bilgisinden gelmelidir. Erişilebilir soruları daha derin gerçeklerle harmanlarız ve yeterince oyuncu cevapladığında performans verilerini inceleriz.",
      },
      {
        title: "5. Herkese açık quizleri dereceli havuzdan ayrı tut",
        body:
          "Arama ziyaretçileri için bir quiz yayınlamak, o soruları otomatik olarak dereceli maçlara eklemez. Herkese açık quiz sayfaları ile rekabetçi soru havuzunun ayrı kullanılabilirlik kontrolleri vardır.",
      },
      {
        title: "6. Önemli hataları düzelt ve gerçek güncellemeleri kaydet",
        body:
          "Önemli bir hata bulduğumuzda ilgili soruyu düzeltir veya kaldırırız. Site haritası tarihleri dahil sayfa güncelleme sinyalleri her istekte otomatik olarak değil, yalnızca anlamlı bir içerik güncellemesinden sonra değişmelidir.",
      },
    ],
    correctionHeading: "Yeniden bakılması gereken bir soru mu buldun?",
    correctionBody:
      "Quiz adını, soruyu ve düzeltmeyi desteklediğini düşündüğün kaynağı gönder. Temel gerçeği ve ifadeyi inceleyeceğiz.",
    correctionLink: "support@quizball.io adresine yaz",
    exploreHeading: "Yöntemi iş başında gör",
    exploreBody:
      "QuizBall'un en faydalı iki futbol bilgisi formatıyla başla ya da tüm ücretsiz quizlere göz at.",
    hubLink: "Tüm futbol quizlerine göz at",
    careerPathLink: "Futbol Kariyer Yolu Quizi",
    clubBadgesLink: "Futbol Kulüp Armaları Quizi",
  },
};

export const ABOUT_CREDIBILITY_COPY: Record<Locale, AboutCredibilityCopy> = {
  en: {
    eyebrow: "Built for trustworthy football trivia",
    title: "Clear questions, checked facts and transparent updates",
    body:
      "QuizBall documents how questions are sourced, reviewed and corrected. Public search quizzes also remain separately controlled from the ranked match pool.",
    methodologyLink: "Read our editorial methodology",
    reportLink: "Read the 2026 Football Knowledge Index",
    pressLink: "Press and citation resources",
    exploreHeading: "Explore QuizBall",
    exploreBody:
      "Browse every free football quiz or start with Career Path and Club Badges—two formats fans engage with most.",
    hubLink: "All football quizzes",
    careerPathLink: "Career Path Quiz",
    clubBadgesLink: "Club Badges Quiz",
  },
  ka: {
    eyebrow: "სანდო საფეხბურთო ტრივიისთვის შექმნილი",
    title: "მკაფიო კითხვები, გადამოწმებული ფაქტები და გამჭვირვალე განახლებები",
    body:
      "QuizBall განმარტავს, როგორ ვეძებთ, ვამოწმებთ და ვასწორებთ კითხვებს. საჯარო საძიებო ქვიზები რეიტინგული მატჩების კითხვების ბანკისგან ცალკე იმართება.",
    methodologyLink: "წაიკითხეთ ჩვენი სარედაქციო მეთოდოლოგია",
    reportLink: "წაიკითხეთ 2026 წლის Football Knowledge Index",
    pressLink: "პრესისა და ციტირების რესურსები",
    exploreHeading: "აღმოაჩინეთ QuizBall",
    exploreBody:
      "დაათვალიერეთ ყველა უფასო საფეხბურთო ქვიზი ან დაიწყეთ კარიერისა და ემბლემების ყველაზე პოპულარული ფორმატებით.",
    hubLink: "ყველა საფეხბურთო ქვიზი",
    careerPathLink: "კარიერის ქვიზი",
    clubBadgesLink: "ემბლემების ქვიზი",
  },
  es: {
    eyebrow: "Trivia de fútbol en la que puedes confiar",
    title: "Preguntas claras, datos revisados y actualizaciones transparentes",
    body:
      "QuizBall explica cómo se investigan, revisan y corrigen las preguntas. Los quizzes públicos también se gestionan por separado del banco de partidas clasificatorias.",
    methodologyLink: "Lee nuestra metodología editorial",
    reportLink: "Lee el Índice de conocimiento futbolístico 2026",
    pressLink: "Recursos para prensa y citas",
    exploreHeading: "Explora QuizBall",
    exploreBody:
      "Descubre todos los quizzes de fútbol o empieza con Trayectorias y Escudos, dos formatos especialmente útiles para los aficionados.",
    hubLink: "Todos los quizzes de fútbol",
    careerPathLink: "Quiz de Trayectoria",
    clubBadgesLink: "Quiz de Escudos",
  },
  tr: {
    eyebrow: "Güvenilir futbol bilgi yarışması için tasarlandı",
    title: "Açık sorular, kontrol edilmiş gerçekler ve şeffaf güncellemeler",
    body:
      "QuizBall soruların nasıl kaynaklandığını, incelendiğini ve düzeltildiğini belgeler. Herkese açık arama quizleri de dereceli maç havuzundan ayrı olarak kontrol edilir.",
    methodologyLink: "Editoryal metodolojimizi oku",
    reportLink: "2026 Futbol Bilgi Endeksi'ni oku",
    pressLink: "Basın ve alıntı kaynakları",
    exploreHeading: "QuizBall'u keşfet",
    exploreBody:
      "Tüm ücretsiz futbol quizlerine göz at ya da taraftarların en çok ilgi gösterdiği iki format olan Kariyer Yolu ve Kulüp Armaları ile başla.",
    hubLink: "Tüm futbol quizleri",
    careerPathLink: "Kariyer Yolu Quizi",
    clubBadgesLink: "Kulüp Armaları Quizi",
  },
};

export function getEditorialMethodologyCopy(locale: Locale): EditorialMethodologyCopy {
  return methodologyCopy[locale];
}
