import type { CampaignQuizLocale } from './campaignQuiz.routes';

export interface CampaignQuizGuide {
  eyebrow: string;
  heading: string;
  introduction: string;
  tips: string[];
  practiceSlug: string;
  practiceLabel: string;
}

type GuideLocale = Extract<CampaignQuizLocale, 'en' | 'es' | 'ka' | 'tr' | 'fr'>;

const GUIDES: Record<string, Partial<Record<GuideLocale, CampaignQuizGuide>>> = {
  'guess-the-player': {
    en: {
      eyebrow: 'Guess the player quiz tips',
      heading: 'How to guess a football player from the clues',
      introduction:
        'To guess the football player, treat every clue as a filter. Start with nationality, then use the club sequence. One unusual achievement can often confirm the answer.',
      tips: [
        'Start with nationality and position. Together they can remove most of the four choices before you use a club clue.',
        'Read clubs in order. A return spell, loan or move between leagues is often more useful than the biggest club in the list.',
        'Use trophies and records as confirmation. Distinctive achievements are strong clues, but check that they fit the full career.',
        'Replay with a fresh set. Repetition helps you connect players to career routes instead of memorising one answer.',
      ],
      practiceSlug: 'career-path',
      practiceLabel: 'Practise with the Football Career Path quiz',
    },
    es: {
      eyebrow: 'Consejos para Adivina el jugador',
      heading: 'Cómo adivinar el futbolista a partir de las pistas',
      introduction:
        'Usa cada pista como un filtro. La nacionalidad reduce las opciones, la secuencia de clubes las acota todavía más y un logro poco habitual suele revelar al jugador.',
      tips: [
        'Empieza por la nacionalidad y la posición. Juntas pueden descartar casi todas las opciones antes de mirar los clubes.',
        'Lee los clubes en orden. Una cesión, una segunda etapa o un cambio de liga suele ser más útil que el club más famoso.',
        'Usa títulos y récords para confirmar. Los logros especiales son buenas pistas, pero deben encajar con toda la trayectoria.',
        'Vuelve a jugar con un grupo nuevo. La repetición ayuda a relacionar futbolistas y carreras sin memorizar una sola respuesta.',
      ],
      practiceSlug: 'career-path',
      practiceLabel: 'Practica con el quiz de trayectorias de futbolistas',
    },
    ka: {
      eyebrow: '„გამოიცანი ფეხბურთელი“ — ქვიზის რჩევები',
      heading: 'როგორ გამოიცნო ფეხბურთელი მინიშნებებით',
      introduction:
        'ფეხბურთელის გამოსაცნობად ყოველი მინიშნება ვარიანტების შესავიწროებლად გამოიყენე. დაიწყე ეროვნებით, შემდეგ კი კლუბების მიმდევრობას დააკვირდი. ერთი უჩვეულო მიღწევა ხშირად პასუხის დადასტურებაში გეხმარება.',
      tips: [
        'ეროვნებითა და პოზიციით დაიწყე. მათი დახმარებით კლუბის მინიშნების გამოყენებამდე ოთხი ვარიანტიდან უმეტესობას გამორიცხავ.',
        'კლუბებს თანმიმდევრობით დააკვირდი. იმავე კლუბში დაბრუნება, იჯარა ან ლიგებს შორის გადასვლა ხშირად სიაში ყველაზე ცნობილი კლუბის ცოდნაზე სასარგებლოა.',
        'ტიტულები და რეკორდები პასუხის დასადასტურებლად გამოიყენე. გამორჩეული მიღწევები ძლიერი მინიშნებებია, მაგრამ გადაამოწმე, რომ ფეხბურთელის მთელ კარიერას შეესაბამება.',
        'ქვიზი ახალი მინიშნებებით თავიდან ითამაშე. განმეორება დაგეხმარება, ფეხბურთელები კარიერის გზებს დაუკავშირო და ერთი პასუხი არ დაიზეპირო.',
      ],
      practiceSlug: 'career-path',
      practiceLabel: 'ივარჯიშე ქვიზში „გამოიცანი ფეხბურთელი კარიერით“',
    },
    tr: {
      eyebrow: 'Futbolcu Bilmece için ipuçları',
      heading: 'İpuçlarından futbolcu tahmin etme',
      introduction:
        'Futbolcu tahmin ederken her ipucunu seçenekleri elemek için kullan. Önce milliyetine bak, sonra kulüp sırasını incele. Alışılmadık bir başarı çoğu zaman cevabı doğrulayabilir.',
      tips: [
        'Milliyet ve mevkiden başla. Bu ikisi, kulüp ipucuna geçmeden önce dört seçenekten çoğunu elemeni sağlayabilir.',
        'Kulüpleri sırasıyla oku. Bir takıma dönüş, kiralık dönem veya ligler arasındaki geçiş, listedeki en büyük kulüpten daha faydalı olabilir.',
        'Kupaları ve rekorları cevabı doğrulamak için kullan. Öne çıkan başarılar güçlü ipuçlarıdır; yine de futbolcunun kariyerinin tamamıyla uyuştuğundan emin ol.',
        'Yeni bir soru grubuyla tekrar oyna. Tekrar etmek, tek bir cevabı ezberlemek yerine futbolcularla kariyer yolları arasında bağlantı kurmana yardımcı olur.',
      ],
      practiceSlug: 'career-path',
      practiceLabel: 'Kariyerden Futbolcu Tahmin Etme ile pratik yap',
    },
    fr: {
      eyebrow: 'Conseils pour Devine le joueur',
      heading: 'Comment deviner le joueur de foot à partir des indices',
      introduction:
        'Pour deviner le joueur, utilise chaque indice comme un filtre. Commence par la nationalité, puis suis l’ordre des clubs. Un exploit peu courant suffit souvent à confirmer la réponse.',
      tips: [
        'Commence par la nationalité et le poste. Ensemble, ils peuvent écarter la plupart des quatre choix avant même un indice sur les clubs.',
        'Lis les clubs dans l’ordre. Un retour, un prêt ou un changement de championnat aide souvent plus que le plus grand club de la liste.',
        'Sers-toi des trophées et des records pour confirmer. Un exploit marquant est un bon indice, mais vérifie qu’il colle à toute la carrière.',
        'Rejoue avec une nouvelle série. La répétition t’aide à relier les joueurs à leur parcours, plutôt qu’à mémoriser une seule réponse.',
      ],
      practiceSlug: 'career-path',
      practiceLabel: 'Entraîne-toi avec le quiz Devine le joueur avec les clubs',
    },
  },
  'career-path': {
    en: {
      eyebrow: 'Career path quiz tips',
      heading: 'How to identify a player from their career path',
      introduction:
        'Do not try to remember every transfer at once. Read the route as a sequence and look for the move that makes the player unique.',
      tips: [
        'Start with the academy or first senior club. A distinctive starting point can remove most of the options immediately.',
        'Notice league changes and return spells. A move abroad or a second spell at the same club is often the strongest clue.',
        'Separate permanent transfers from loans. Short stops can make two similar-looking careers very different.',
        'Use the final club as a check, not your first guess. Work through the whole route before committing.',
      ],
      practiceSlug: 'guess-the-player',
      practiceLabel: 'Practise with the Guess the Player quiz',
    },
    es: {
      eyebrow: 'Consejos para el quiz de trayectorias',
      heading: 'Cómo adivinar un futbolista por su trayectoria',
      introduction:
        'No intentes recordar todos los fichajes a la vez. Lee la ruta como una secuencia y busca el cambio que hace única la carrera del jugador.',
      tips: [
        'Empieza por la cantera o el primer club profesional. Un inicio poco habitual puede descartar casi todas las opciones.',
        'Fíjate en los cambios de liga y en las segundas etapas. Jugar en otro país o volver a un club suele ser la pista clave.',
        'Distingue los traspasos de las cesiones. Una etapa corta puede separar dos trayectorias muy parecidas.',
        'Usa el último club para confirmar, no para adivinar de inmediato. Recorre toda la trayectoria antes de responder.',
      ],
      practiceSlug: 'guess-the-player',
      practiceLabel: 'Practica con el quiz Adivina el futbolista',
    },
    ka: {
      eyebrow: 'კარიერის გზის ქვიზის რჩევები',
      heading: 'როგორ ამოიცნო ფეხბურთელი მისი კარიერის გზით',
      introduction:
        'ერთბაშად ყველა ტრანსფერის გახსენებას ნუ ეცდები. კარიერის გზა თანმიმდევრობად აღიქვი და მოძებნე ის გადასვლა, რომელიც ამ ფეხბურთელს გამორჩეულს ხდის.',
      tips: [
        'აკადემიით ან პირველი პროფესიული კლუბით დაიწყე. გამორჩეულმა საწყისმა ეტაპმა შეიძლება ვარიანტების უმეტესობა მაშინვე გამოგარიცხინოს.',
        'ლიგის შეცვლასა და კლუბში დაბრუნებას დააკვირდი. საზღვარგარეთ გადასვლა ან იმავე კლუბში მეორედ თამაში ხშირად ყველაზე ძლიერი მინიშნებაა.',
        'მუდმივი ტრანსფერები იჯარისგან განასხვავე. ხანმოკლე გაჩერებებმა შეიძლება ორი ერთი შეხედვით მსგავსი კარიერის გზა ერთმანეთისგან მკვეთრად განასხვაოს.',
        'ბოლო კლუბი პასუხის შესამოწმებლად გამოიყენე და არა პირველი ვარაუდისთვის. პასუხის დაფიქსირებამდე კარიერის მთელ გზას მიჰყევი.',
      ],
      practiceSlug: 'guess-the-player',
      practiceLabel: 'ივარჯიშე ქვიზში „გამოიცანი ფეხბურთელი“',
    },
    tr: {
      eyebrow: 'Kariyerden futbolcu tahmin etme ipuçları',
      heading: 'Kariyerden futbolcu tahmin etme',
      introduction:
        'Her transferi bir kerede hatırlamaya çalışma. Kariyer yolunu sırayla incele ve futbolcuyu diğerlerinden ayıran transferi bul.',
      tips: [
        'Altyapı takımından veya ilk profesyonel kulübünden başla. Ayırt edici bir başlangıç noktası, seçeneklerin çoğunu hemen elemeni sağlayabilir.',
        'Lig değişikliklerine ve geri dönüşlere dikkat et. Yurt dışına transfer veya aynı kulüpte ikinci dönem, çoğu zaman en güçlü ipucudur.',
        'Kalıcı transferleri kiralık dönemlerden ayır. Kısa süreli takımlar, birbirine benzeyen iki kariyeri tamamen farklı kılabilir.',
        'Son kulübü ilk tahminin olarak değil, kontrol etmek için kullan. Cevabı seçmeden önce tüm kariyer yolunu incele.',
      ],
      practiceSlug: 'guess-the-player',
      practiceLabel: 'Futbolcu Bilmece ile pratik yap',
    },
    fr: {
      eyebrow: 'Conseils pour Parcours du joueur',
      heading: 'Comment reconnaître un joueur grâce à son parcours',
      introduction:
        'N’essaie pas de te rappeler tous les transferts d’un coup. Lis le parcours dans l’ordre et cherche le transfert qui rend ce joueur unique.',
      tips: [
        'Commence par le centre de formation ou le premier club pro. Un point de départ singulier peut écarter tout de suite la plupart des choix.',
        'Repère les changements de championnat et les retours. Un départ à l’étranger ou un deuxième passage au même club est souvent le meilleur indice.',
        'Distingue les transferts définitifs des prêts. Un court passage peut rendre très différentes deux carrières qui se ressemblent.',
        'Garde le dernier club comme vérification, pas comme première idée. Parcours toute la carrière avant de te décider.',
      ],
      practiceSlug: 'guess-the-player',
      practiceLabel: 'Entraîne-toi avec le quiz Devine le joueur',
    },
  },
  'club-badges': {
    en: {
      eyebrow: 'Football badge quiz tips',
      heading: 'How to recognise a football club badge',
      introduction:
        'A crest is easier to remember when you connect its details to a place or story instead of memorising the whole image.',
      tips: [
        'Look for a city symbol first: ships, towers, birds and local landmarks often point directly to the club’s home.',
        'Treat colours as supporting evidence. Several clubs share the same palette, so combine it with the central symbol.',
        'Check letters, dates and mottos around the edge. Small details can separate badges with similar shapes.',
        'Allow for redesigns. Modern crests may simplify an older badge while keeping one recognisable symbol.',
      ],
      practiceSlug: 'premier-league',
      practiceLabel: 'Practise with the Premier League quiz',
    },
    es: {
      eyebrow: 'Consejos para el quiz de escudos',
      heading: 'Cómo reconocer el escudo de un club de fútbol',
      introduction:
        'Es más fácil recordar un escudo si relacionas sus detalles con una ciudad o una historia, en lugar de memorizar toda la imagen.',
      tips: [
        'Busca primero un símbolo de la ciudad: barcos, torres, aves y monumentos suelen señalar el lugar de origen del club.',
        'Usa los colores como pista secundaria. Muchos clubes comparten paleta, así que combínala con el símbolo central.',
        'Revisa letras, fechas y lemas en el borde. Los detalles pequeños distinguen escudos con formas parecidas.',
        'Ten en cuenta los rediseños. Un escudo moderno puede simplificar el antiguo y conservar solo su símbolo principal.',
      ],
      practiceSlug: 'premier-league',
      practiceLabel: 'Practica con el quiz de la Premier League',
    },
    ka: {
      eyebrow: 'ფეხბურთის ემბლემების ქვიზის რჩევები',
      heading: 'როგორ ამოიცნო საფეხბურთო კლუბის ემბლემა',
      introduction:
        'ემბლემის დამახსოვრება გაგიადვილდება, თუ მის დეტალებს კონკრეტულ ადგილს ან ამბავს დაუკავშირებ და მთლიანი გამოსახულების დაზეპირებას არ ეცდები.',
      tips: [
        'ჯერ ქალაქის სიმბოლო მოძებნე: გემი, კოშკი, ფრინველი ან ადგილობრივი ღირსშესანიშნაობა ხშირად პირდაპირ მიგანიშნებს, სად არის კლუბი.',
        'ფერები დამატებით მინიშნებად გამოიყენე. რამდენიმე კლუბს ერთი და იგივე ფერები აქვს, ამიტომ ისინი ცენტრალურ სიმბოლოს შეუხამე.',
        'ემბლემის კიდეებზე წარწერებს, თარიღებსა და დევიზს დააკვირდი. პატარა დეტალები მსგავსი ფორმის ემბლემების გარჩევაში დაგეხმარება.',
        'გაითვალისწინე, რომ ემბლემები შეიძლება შეიცვალოს. თანამედროვე ვერსიაში ძველი ემბლემა შეიძლება გამარტივებული იყოს, თუმცა ერთი ცნობადი სიმბოლო შენარჩუნებული დარჩეს.',
      ],
      practiceSlug: 'premier-league',
      practiceLabel: 'ივარჯიშე ქვიზში „პრემიერ ლიგის ქვიზი“',
    },
    tr: {
      eyebrow: 'Logodan takım bilme ipuçları',
      heading: 'Logodan takım bilme: Bir futbol kulübünün arması nasıl tanınır?',
      introduction:
        'Bir armanın ayrıntılarını tek tek ezberlemek yerine onları bir yer veya hikâyeyle ilişkilendirmek, akılda tutmayı kolaylaştırır.',
      tips: [
        'Önce şehir simgesine bak: gemiler, kuleler, kuşlar ve yerel yapılar çoğu zaman kulübün bulunduğu yeri doğrudan gösterir.',
        'Renkleri yardımcı ipucu olarak değerlendir. Birçok kulüp aynı renkleri kullanır; bu yüzden renkleri merkezdeki simgeyle birlikte düşün.',
        'Kenarlardaki harfleri, tarihleri ve sloganları kontrol et. Küçük ayrıntılar, şekli birbirine benzeyen armaları ayırt etmene yardımcı olabilir.',
        'Logo değişikliklerini hesaba kat. Güncel armalar eski tasarımları sadeleştirmiş olabilir, ancak genellikle tanınabilir bir simgeyi korur.',
      ],
      practiceSlug: 'premier-league',
      practiceLabel: 'Premier Lig Quiz ile pratik yap',
    },
    fr: {
      eyebrow: 'Conseils pour le quiz logo foot',
      heading: 'Comment reconnaître le logo d’un club de foot',
      introduction:
        'Un logo se retient plus facilement quand tu relies ses détails à un lieu ou à une histoire, au lieu de mémoriser toute l’image.',
      tips: [
        'Cherche d’abord un symbole de la ville : bateaux, tours, oiseaux et monuments locaux mènent souvent directement au club.',
        'Vois les couleurs comme un indice d’appoint. Plusieurs clubs ont les mêmes, alors associe-les au symbole central.',
        'Regarde les lettres, les dates et les devises sur le pourtour. Un petit détail peut séparer deux logos de forme proche.',
        'Pense aux changements de logo. Une version moderne simplifie parfois un ancien logo, tout en gardant un symbole reconnaissable.',
      ],
      practiceSlug: 'premier-league',
      practiceLabel: 'Entraîne-toi avec le quiz Premier League',
    },
  },
};

export function getCampaignQuizGuide(
  slug: string,
  locale: CampaignQuizLocale,
): CampaignQuizGuide | undefined {
  return GUIDES[slug]?.[locale as GuideLocale];
}
