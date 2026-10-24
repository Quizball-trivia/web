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
  ru: {
    metaTitle: "Редакционная методика QuizBall — как проверяются вопросы",
    metaDescription:
      "Узнай, как QuizBall изучает, проверяет, обновляет и исправляет футбольные вопросы для бесплатных викторин и многопользовательской игры.",
    backLabel: "О QuizBall",
    eyebrow: "Редакционные стандарты",
    title: "Как QuizBall проверяет вопросы о футболе",
    intro:
      "Хорошие вопросы о футболе должны проверять знания, а не умение разбираться в расплывчатых формулировках. Вот как мы делаем вопросы понятными, актуальными и честными.",
    updated: "Последнее обновление: 30 августа 2026 года",
    sections: [
      {
        title: "1. Начинаем с проверяемого футбольного факта",
        body:
          "В основе каждого вопроса — конкретный факт об игроке, клубе, турнире, матче или рекорде. По возможности мы опираемся на официальные источники турниров и клубов, авторитетные статистические базы и надёжные СМИ, а не на списки без источников.",
      },
      {
        title: "2. Проверяем ответ и все варианты",
        body:
          "Мы вместе проверяем правильный ответ, формулировку вопроса и каждый вариант. Неправильный вариант должен выглядеть правдоподобно, чтобы вопрос был интересным, но не создавать ещё один ответ, который тоже можно обосновать.",
      },
      {
        title: "3. Указываем дату или сезон, если факты могут измениться",
        body:
          "Трансферы, рекорды, рейтинги и составы меняются. Вопросы о таких фактах должны содержать нужный сезон, турнир или дату, чтобы ответ оставался однозначным.",
      },
      {
        title: "4. Подбираем сложность без подвохов",
        body:
          "Сложность должна зависеть от нужных футбольных знаний, а не от запутанной грамматики или скрытых допущений. Мы чередуем простые вопросы с менее очевидными фактами и изучаем статистику ответов, когда игроков накопится достаточно.",
      },
      {
        title: "5. Отделяем открытые викторины от рейтинговых матчей",
        body:
          "Публикация викторины для посетителей из поисковиков не добавляет её вопросы в рейтинговые матчи автоматически. Для открытых страниц викторин и соревновательного пула вопросов предусмотрены отдельные настройки доступности.",
      },
      {
        title: "6. Исправляем существенные ошибки и отмечаем реальные обновления",
        body:
          "Если мы обнаруживаем существенную ошибку, то исправляем или удаляем соответствующий вопрос. Даты обновления страницы, включая даты в карте сайта, должны меняться только после значимого обновления контента, а не автоматически при каждом запросе.",
      },
    ],
    correctionHeading: "Нашёл вопрос, который стоит перепроверить?",
    correctionBody:
      "Пришли название викторины, вопрос и источник, который подтверждает исправление. Мы перепроверим сам факт и формулировку.",
    correctionLink: "Напиши на support@quizball.io",
    exploreHeading: "Посмотри, как это работает",
    exploreBody:
      "Начни с двух самых полезных форматов QuizBall для проверки футбольных знаний или загляни во все бесплатные викторины.",
    hubLink: "Все футбольные викторины",
    careerPathLink: "Викторина «Карьера футболиста»",
    clubBadgesLink: "Викторина «Эмблемы футбольных клубов»",
  },
  pt: {
    metaTitle: "Metodologia editorial do QuizBall — Como verificamos as perguntas",
    metaDescription:
      "Veja como o QuizBall pesquisa, revisa, atualiza e corrige perguntas sobre futebol para seus quizzes gratuitos e seu jogo multijogador.",
    backLabel: "Sobre o QuizBall",
    eyebrow: "Padrões editoriais",
    title: "Como o QuizBall verifica as perguntas sobre futebol",
    intro:
      "Um bom quiz de futebol deve testar seu conhecimento, sem depender de enunciados vagos. Este é o processo que usamos para deixar as perguntas claras, atualizadas e justas.",
    updated: "Última atualização: 30 de agosto de 2026",
    sections: [
      {
        title: "1. Começamos com um fato verificável sobre futebol",
        body:
          "Cada pergunta começa com um fato identificável sobre um jogador, clube, competição, partida ou recorde. Sempre que possível, preferimos fontes oficiais de competições e clubes, bancos de dados estatísticos reconhecidos e reportagens confiáveis, em vez de listas sem fontes.",
      },
      {
        title: "2. Conferimos a resposta e todas as alternativas",
        body:
          "Revisamos juntos a resposta correta, o enunciado e cada alternativa. Uma opção incorreta deve ser plausível o bastante para deixar a pergunta interessante, mas não pode criar uma segunda resposta defensável.",
      },
      {
        title: "3. Incluímos a data ou a temporada quando os fatos podem mudar",
        body:
          "Transferências, recordes, rankings e elencos atuais mudam. Perguntas sobre fatos que podem mudar devem incluir a temporada, a competição ou a data relevante para que a resposta continue inequívoca.",
      },
      {
        title: "4. Definimos a dificuldade sem truques",
        body:
          "A dificuldade deve vir do conhecimento de futebol necessário, não de uma gramática confusa nem de suposições ocultas. Misturamos perguntas acessíveis com fatos menos conhecidos e analisamos os dados de desempenho quando há respostas de jogadores suficientes.",
      },
      {
        title: "5. Separamos os quizzes públicos das partidas ranqueadas",
        body:
          "Publicar um quiz para quem chega pelos mecanismos de busca não inclui automaticamente suas perguntas nas partidas ranqueadas. As páginas públicas de quiz e o banco de perguntas para partidas ranqueadas têm controles de disponibilidade separados.",
      },
      {
        title: "6. Corrigimos erros relevantes e registramos atualizações reais",
        body:
          "Quando encontramos um erro relevante, corrigimos ou removemos a pergunta afetada. Os sinais de atualização da página, incluindo as datas do sitemap, só devem mudar após uma atualização significativa do conteúdo, não automaticamente a cada solicitação.",
      },
    ],
    correctionHeading: "Encontrou uma pergunta que merece ser revista?",
    correctionBody:
      "Envie o nome do quiz, a pergunta e a fonte que, na sua opinião, confirma a correção. Vamos revisar o fato e o enunciado.",
    correctionLink: "Fale com a gente pelo e-mail support@quizball.io",
    exploreHeading: "Veja o método na prática",
    exploreBody:
      "Comece por dois dos formatos do QuizBall que melhor testam seus conhecimentos sobre futebol ou explore todos os quizzes gratuitos.",
    hubLink: "Explore todos os quizzes de futebol",
    careerPathLink: "Adivinhe o jogador pela carreira",
    clubBadgesLink: "Quiz dos escudos de clubes de futebol",
  },
  de: {
    metaTitle: "Redaktionelle Methodik von QuizBall — So prüfen wir Fragen",
    metaDescription:
      "Erfahre, wie QuizBall Fußballquizfragen für kostenlose Quizze und das Mehrspieler-Spiel recherchiert, prüft, aktualisiert und korrigiert.",
    backLabel: "Über QuizBall",
    eyebrow: "Redaktionelle Standards",
    title: "So prüft QuizBall Fußballquizfragen",
    intro:
      "Gute Fußballfragen sollten Wissen testen, nicht vage Formulierungen. So sorgen wir für klare, aktuelle und faire Fragen.",
    updated: "Zuletzt aktualisiert: 30. August 2026",
    sections: [
      {
        title: "1. Mit einer überprüfbaren Fußballtatsache beginnen",
        body:
          "Jede Frage beruht auf einer konkreten Tatsache über einen Spieler, einen Verein, einen Wettbewerb, ein Match oder einen Rekord. Wo möglich, bevorzugen wir offizielle Quellen von Wettbewerben und Vereinen, etablierte Statistikdatenbanken und seriöse Berichterstattung statt unbelegter Listen.",
      },
      {
        title: "2. Antwort und Alternativen prüfen",
        body:
          "Wir prüfen die richtige Antwort, die Formulierung und alle Alternativen gemeinsam. Eine falsche Antwortoption sollte plausibel genug sein, um die Frage interessant zu machen, aber keine zweite vertretbare Antwort ermöglichen.",
      },
      {
        title: "3. Bei veränderlichen Fakten Datum oder Saison angeben",
        body:
          "Transfers, Rekorde, Ranglisten und aktuelle Kader ändern sich. Fragen zu solchen Fakten sollten die passende Saison, den Wettbewerb oder das Datum nennen, damit die Antwort eindeutig bleibt.",
      },
      {
        title: "4. Den Schwierigkeitsgrad ohne Tricks festlegen",
        body:
          "Der Schwierigkeitsgrad sollte vom nötigen Fußballwissen abhängen, nicht von verwirrender Grammatik oder versteckten Annahmen. Wir mischen zugängliche Fragen mit weniger bekannten Fakten und werten die Antwortdaten aus, sobald genügend Spieler geantwortet haben.",
      },
      {
        title: "5. Öffentliche Quizze getrennt von Ranked-Matches halten",
        body:
          "Ein Quiz für Besucher über Suchmaschinen zu veröffentlichen, fügt seine Fragen nicht automatisch zu Ranked-Matches hinzu. Für öffentliche Quizseiten und den Wettbewerbsfragenpool gelten getrennte Verfügbarkeitskontrollen.",
      },
      {
        title: "6. Wesentliche Fehler korrigieren und echte Änderungen festhalten",
        body:
          "Wenn wir einen wesentlichen Fehler finden, korrigieren oder entfernen wir die betroffene Frage. Aktualisierungshinweise für Seiten, einschließlich Sitemap-Daten, sollten sich nur nach einer relevanten Inhaltsänderung ändern – nicht automatisch bei jeder Anfrage.",
      },
    ],
    correctionHeading: "Eine Frage entdeckt, die wir noch einmal prüfen sollten?",
    correctionBody:
      "Schick uns den Quiznamen, die Frage und die Quelle, die deiner Meinung nach eine Korrektur stützt. Wir prüfen die zugrunde liegende Tatsache und die Formulierung.",
    correctionLink: "E-Mail an support@quizball.io",
    exploreHeading: "Die Methodik in der Praxis",
    exploreBody:
      "Starte mit zwei besonders nützlichen Fußballquiz-Formaten von QuizBall oder entdecke alle kostenlosen Quizze.",
    hubLink: "Alle Fußballquizze ansehen",
    careerPathLink: "Quiz zum Karriereweg eines Fußballers",
    clubBadgesLink: "Quiz zu Fußballvereinswappen",
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
  ru: {
    eyebrow: "Футбольные викторины, которым можно доверять",
    title: "Понятные вопросы, проверенные факты и прозрачные обновления",
    body:
      "QuizBall рассказывает, откуда берутся вопросы, как их проверяют и исправляют. Открытые викторины для поисковиков также управляются отдельно от пула рейтинговых матчей.",
    methodologyLink: "Читай нашу редакционную методику",
    reportLink: "Читай Индекс футбольных знаний 2026 года",
    pressLink: "Материалы для прессы и источники",
    exploreHeading: "Открой QuizBall",
    exploreBody:
      "Загляни во все бесплатные футбольные викторины или начни с «Карьеры футболиста» и «Эмблем клубов» — эти форматы особенно увлекают болельщиков.",
    hubLink: "Все футбольные викторины",
    careerPathLink: "Викторина «Карьера футболиста»",
    clubBadgesLink: "Викторина «Эмблемы клубов»",
  },
  pt: {
    eyebrow: "Quizzes de futebol em que você pode confiar",
    title: "Perguntas claras, fatos verificados e atualizações transparentes",
    body:
      "O QuizBall mostra como as perguntas são pesquisadas, revisadas e corrigidas. Os quizzes públicos encontrados pelos mecanismos de busca também são gerenciados separadamente do banco de partidas ranqueadas.",
    methodologyLink: "Leia nossa metodologia editorial",
    reportLink: "Leia o Índice de Conhecimento sobre Futebol 2026",
    pressLink: "Recursos para imprensa e citações",
    exploreHeading: "Explore o QuizBall",
    exploreBody:
      "Explore todos os quizzes gratuitos de futebol ou experimente Adivinhe o jogador pela carreira e o quiz de escudos de clubes, dois formatos preferidos pelos torcedores.",
    hubLink: "Todos os quizzes de futebol",
    careerPathLink: "Adivinhe o jogador pela carreira",
    clubBadgesLink: "Quiz dos escudos de clubes",
  },
  de: {
    eyebrow: "Fußballwissen, dem du vertrauen kannst",
    title: "Klare Fragen, geprüfte Fakten und transparente Aktualisierungen",
    body:
      "QuizBall dokumentiert, wie Fragen recherchiert, geprüft und korrigiert werden. Öffentliche Suchquizze werden außerdem getrennt vom Fragenpool für Ranked-Matches verwaltet.",
    methodologyLink: "Unsere redaktionelle Methodik lesen",
    reportLink: "Den Fußball-Wissensindex 2026 lesen",
    pressLink: "Presse- und Quellenmaterial",
    exploreHeading: "QuizBall entdecken",
    exploreBody:
      "Entdecke alle kostenlosen Fußballquizze oder starte mit Karriereweg und Vereinswappen – zwei Formaten, die Fans besonders gern spielen.",
    hubLink: "Alle Fußballquizze",
    careerPathLink: "Karriereweg-Quiz",
    clubBadgesLink: "Vereinswappen-Quiz",
  },
};

export function getEditorialMethodologyCopy(locale: Locale): EditorialMethodologyCopy {
  return methodologyCopy[locale];
}
