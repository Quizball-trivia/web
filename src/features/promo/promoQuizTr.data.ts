import type {
  FootballLogicSession,
  ImposterSession,
  TrueFalseSession,
} from '@/lib/domain/dailyChallenge';
import type { PromoContentPack } from './promoContent';
import type { PromoRound } from './promoQuiz.data';
import type { ChainPlayer, ChainPuzzle } from './promoPassChain.data';

// Turkish (Trabzonspor-era) edition of the promo quiz — owner-supplied
// editorial content translated to Turkish via the Gemini API. 13 rounds:
// 3 MC, 2 photo MC, put-in-order, who-am-I, T/F ×2, pass chain ×2,
// football logic, imposter.

const EMBEDDED_SECONDS = 999;

function trueFalseSession(question: TrueFalseSession['questions'][number]): TrueFalseSession {
  return {
    challengeType: 'trueFalse',
    title: 'Doğru mu Yanlış mı?',
    description: "Şota Arveladze'nin kariyerinden bilgiler",
    questionCount: 1,
    secondsPerQuestion: EMBEDDED_SECONDS,
    questions: [question],
  };
}

const TR_TF_1 = trueFalseSession({
  id: 'promo-tr-tf-1',
  category: 'Şota Arveladze',
  difficulty: 'medium',
  prompt: "Şota Arveladze, Türkiye'deki ilk hat-trick'ini Karşıyaka'ya karşı yaptı.",
  trueLabel: 'Doğru',
  falseLabel: 'Yanlış',
  correctAnswer: false,
});

const TR_TF_2 = trueFalseSession({
  id: 'promo-tr-tf-2',
  category: 'Şota Arveladze',
  difficulty: 'medium',
  prompt: "Şota Arveladze, Trabzonspor'da bir maçta 4 gol atmadan önce tek bir maçta 4 asist yapmayı da başarmıştı.",
  trueLabel: 'Doğru',
  falseLabel: 'Yanlış',
  correctAnswer: true,
});

const TR_IMPOSTER: ImposterSession = {
  challengeType: 'imposter',
  title: 'Sahteleri Bul',
  description: "Trabzonspor'daki Gürcüler",
  questionCount: 1,
  secondsPerQuestion: EMBEDDED_SECONDS,
  questions: [
    {
      id: 'promo-tr-imp-1',
      category: 'Şota Arveladze',
      difficulty: 'hard',
      prompt:
        "Bu Gürcü futbolculardan 6'sı gerçekten Trabzonspor'da oynadı — o 6 ismi seçin",
      options: [
        { id: 'shota', text: 'Şota Arveladze' },
        { id: 'archil', text: 'Arçil Arveladze' },
        { id: 'kacharava', text: 'Kakhaber Kaçarava' },
        { id: 'beradze', text: 'Besik Beradze' },
        { id: 'nemsadze', text: 'Giorgi Nemsadze' },
        { id: 'jamarauli', text: 'Goça Camarauli' },
        { id: 'amisulashvili', text: 'Aleksandre Amisulaşvili' },
        { id: 'khizanishvili', text: 'Zurab Hizanişvili' },
        { id: 'shengelia', text: 'Levan Şengelia' },
        { id: 'dvali', text: 'Laşa Dvali' },
      ],
      // Per the owner: the player SELECTS the six who played for Trabzonspor
      // (Shota, Archil, Kacharava, Beradze, Nemsadze, Jamarauli); the other
      // four are the decoys left unselected.
      correctOptionIds: ['shota', 'archil', 'kacharava', 'beradze', 'nemsadze', 'jamarauli'],
    },
  ],
};

const TR_LOGIC: FootballLogicSession = {
  challengeType: 'footballLogic',
  title: 'Futbol Mantığı',
  description: 'Futbolcuyu tahmin et',
  questionCount: 1,
  secondsPerQuestion: EMBEDDED_SECONDS,
  questions: [
    {
      id: 'promo-tr-fl-1',
      category: 'Şota Arveladze',
      difficulty: 'medium',
      prompt: "Trabzonspor'dan Schalke 04'e 3,5 milyon euro karşılığında transfer oldu. Bu futbolcu kimdir?",
      imageAUrl: '/promo/trabzonspor-crest.png',
      imageBUrl: '/promo/schalke-crest.png',
      displayAnswer: 'Hami Mandıralı',
      acceptedAnswers: ['hami mandıralı', 'hami mandirali', 'mandıralı', 'mandirali', 'hami'],
      explanation:
        "Trabzonspor'un kulüp efsanesi Hami Mandıralı, Schalke 04'e transfer olarak Bundesliga'da bir sezon geçirmişti.",
    },
  ],
};

export const PROMO_TR_CHAIN_PLAYERS: ChainPlayer[] = [
  {
    id: 'shota',
    imageUrl: '/promo/players/shota.jpg',
    name: 'Şota Arveladze',
    accepted: ['şota', 'shota', 'arveladze', 'şota arveladze', 'shota arveladze'],
    clubs: ['Dinamo Tiflis', 'Trabzonspor', 'Ajax', 'Rangers', 'AZ Alkmaar', 'Levante'],
  },
  {
    id: 'drogba',
    imageUrl: '/promo/players/drogba.jpg',
    name: 'Didier Drogba',
    accepted: ['drogba', 'didier drogba'],
    clubs: ['Marsilya', 'Chelsea', 'Galatasaray'],
  },
  {
    id: 'calhanoglu',
    imageUrl: '/promo/players/calhanoglu.jpg',
    name: 'Hakan Çalhanoğlu',
    accepted: ['çalhanoğlu', 'calhanoglu', 'hakan çalhanoğlu', 'hakan calhanoglu', 'hakan'],
    clubs: ['Hamburg', 'Bayer Leverkusen', 'Milan', 'Inter'],
  },
  {
    id: 'mido',
    imageUrl: '/promo/players/mido.jpg',
    name: 'Mido',
    accepted: ['mido', 'ahmed hossam', 'ahmed hossam mido'],
    clubs: ['Ajax', 'Marsilya', 'Roma', 'Tottenham', 'Middlesbrough'],
  },
  {
    id: 'zlatan',
    imageUrl: '/promo/players/zlatan.jpg',
    name: 'Zlatan Ibrahimović',
    accepted: ['zlatan', 'ibrahimovic', 'ibrahimović', 'zlatan ibrahimovic', 'ibra'],
    clubs: ['Ajax', 'Juventus', 'Inter', 'Barcelona', 'Milan', 'PSG', 'Manchester United'],
  },
  {
    id: 'vandervaart',
    imageUrl: '/promo/players/vandervaart.jpg',
    name: 'Rafael van der Vaart',
    accepted: ['van der vaart', 'rafael van der vaart', 'vaart'],
    clubs: ['Ajax', 'Hamburg', 'Real Madrid', 'Tottenham'],
  },
];

// Shota → Drogba via Mido (Ajax → Marsilya); Shota → Çalhanoğlu via Zlatan
// (Ajax → Milan/Inter) or Van der Vaart (Ajax → Hamburg). Start/end never
// share a club directly.
export const PROMO_TR_CHAIN_PUZZLES: ChainPuzzle[] = [
  { startId: 'shota', endId: 'drogba' },
  { startId: 'shota', endId: 'calhanoglu' },
];

export const PROMO_TR_ROUNDS: PromoRound[] = [
  {
    kind: 'multipleChoice',
    points: 100,
    units: 1,
    question: {
      id: 'promo-tr-q1',
      prompt:
        "1995-96 sezonunda Galatasaray'ı 4-1 mağlup ettiğiniz maçta 2 gol ve 1 asistle oynadın. Attığın iki golün asistini de aynı oyuncu yapmış, sen de onun golünün asistini vermiştin. Bu futbolcu kimdi?",
      options: ['Hakan Ünsal', 'Hami Mandıralı', 'Arçil Arveladze', 'Kubilay Türkyılmaz'],
      correctIndex: 1,
      categoryName: 'Şota Arveladze',
    },
  },
  {
    kind: 'multipleChoice',
    points: 100,
    units: 1,
    question: {
      id: 'promo-tr-q2',
      prompt: "1995-96 sezonunun son haftasında Eskişehirspor'a 5 gol attın. Karşılaşma hangi skorla sona erdi?",
      options: ['6-1', '7-2', '7-1', '6-2'],
      correctIndex: 2,
      categoryName: 'Şota Arveladze',
    },
  },
  {
    kind: 'multipleChoice',
    points: 100,
    units: 1,
    question: {
      id: 'promo-tr-q3',
      prompt:
        "Şota'nın ünlü fair play jestine yol açan golden hemen önce Kasımpaşa'da sakatlanıp yerde kalan futbolcu kimdi?",
      options: ['Ryan Donk', 'Ryan Babel', 'Eren Derdiyok', 'André Castro'],
      correctIndex: 1,
      categoryName: 'Şota Arveladze',
    },
  },
  {
    kind: 'multipleChoice',
    points: 100,
    units: 1,
    question: {
      id: 'promo-tr-p1',
      prompt: "Trabzonspor'un hangi sezonuna ait üçüncü forması bu?",
      options: ['1993-94', '1994-95', '1995-96', '1996-97'],
      correctIndex: 2,
      categoryName: 'Şota Arveladze',
      image: {
        url: '/promo/ts-third-kit.jpg',
        width: 800,
        height: 800,
      },
    },
  },
  {
    kind: 'multipleChoice',
    points: 100,
    units: 1,
    question: {
      id: 'promo-tr-p2',
      prompt: "Burada Eskişehirspor'a attığın golü kutluyorsun. Golü atmadan önce topu kafanla kaç kez sektirdin?",
      options: ['1', '2', '3', '4'],
      correctIndex: 3,
      categoryName: 'Şota Arveladze',
      image: {
        url: '/promo/ts-eskisehir-goal.png',
        width: 1600,
        height: 1143,
      },
    },
  },
  {
    kind: 'putInOrder',
    points: 100,
    units: 1,
    question: {
      kind: 'putInOrder',
      id: 'promo-tr-q4',
      prompt: 'Trabzonspor tarihindeki toplam gol sayılarına göre yabancı futbolcular',
      instruction:
        'Bu yabancı futbolcuları Trabzonspor formasıyla attıkları toplam gol sayısına göre en yüksekten en düşüğe doğru sıralayın',
      direction: 'desc',
      // Displayed scrambled; the correct order is pioCorrectIds in the pack.
      items: [
        { id: 'sorloth', label: 'Alexander Sørloth' },
        { id: 'shota', label: 'Şota Arveladze' },
        { id: 'yattara', label: 'Ibrahima Yattara' },
        { id: 'nwakaeme', label: 'Anthony Nwakaeme' },
      ],
      categoryName: 'Şota Arveladze',
    },
  },
  {
    kind: 'clues',
    points: 100,
    units: 1,
    question: {
      kind: 'clues',
      id: 'promo-tr-q5',
      prompt: 'Ben kimim?',
      clues: [
        { type: 'text', content: "Profesyonel futbol kariyerime 1984'te Gaziantepspor'da başladım, ardından Malatyaspor'da adımı duyurdum." },
        { type: 'text', content: "Daha sonra teknik direktörlüğünü de üstleneceğim Ankaragücü'nde geçirdiğim tek sezonun ardından 2000 yılında futbolculuk kariyerimi noktaladım." },
        { type: 'text', content: 'Türkiye A Millî Takımı formasını 36 kez giydim ve inanılmaz kondisyonuyla tanınan yorulmaz bir orta saha oyuncusuydum.' },
        { type: 'text', content: "1990'ların ortasındaki efsanevi dönemde takımın orta saha generali ve kaptanıydım; sağladığım savunma güvencesiyle Hami Mandıralı ve Şota Arveladze'nin parlamasını sağladım." },
        { type: 'text', content: "Futbolculuk kariyerimin yaklaşık 10 yılını efsanevi bir orta saha figürüne dönüştüğüm Trabzonspor'da geçirdim ve 2018'de teknik direktör olarak geri döndüm." },
      ],
      categoryName: 'Şota Arveladze',
    },
  },
  { kind: 'trueFalse', units: 1, session: TR_TF_1 },
  { kind: 'trueFalse', units: 1, session: TR_TF_2 },
  { kind: 'passChain', units: 1, players: PROMO_TR_CHAIN_PLAYERS, puzzles: [PROMO_TR_CHAIN_PUZZLES[0]] },
  { kind: 'passChain', units: 1, players: PROMO_TR_CHAIN_PLAYERS, puzzles: [PROMO_TR_CHAIN_PUZZLES[1]] },
  { kind: 'footballLogic', units: 1, session: TR_LOGIC },
  { kind: 'imposter', units: 1, session: TR_IMPOSTER },
];

export const PROMO_PACK_TR: PromoContentPack = {
  id: 'tr',
  // The app UI only ships ka/en strings — English chrome for the Turkish
  // edition per the owner's call.
  localePin: 'en',
  playerName: 'Şota',
  avatarMonogram: 'Ş',
  strings: {
    nextQuestion: 'Sonraki soru',
    finish: 'Bitir',
    finalScore: 'Toplam skor',
    playAgain: 'Tekrar oyna',
    correctLabel: 'Doğru cevaplar',
    accuracyLabel: 'İsabet oranı',
  },
  chainLabels: {
    placeholderPrefix: 'Bağlantı kuran oyuncu:',
    add: 'Ekle',
    reset: 'Sıfırla',
    linked: 'Bağlandı!',
    perfect: 'Mükemmel!',
    linksWord: 'bağlantı',
    start: 'BAŞLANGIÇ',
    target: 'HEDEF',
    unknown: 'Bilinmeyen futbolcu — başka bir isim deneyin',
    already: 'Zaten zincirde var',
    neverPlayed: (a, b) => `${a} ve ${b} hiçbir zaman birlikte oynamadı`,
  },
  rounds: PROMO_TR_ROUNDS,
  // Trabzonspor all-time foreign scorers, high to low.
  pioCorrectIds: ['shota', 'nwakaeme', 'yattara', 'sorloth'],
  cluesAnswer: 'Ünal Karaman',
  cluesAccepted: ['ünal karaman', 'unal karaman', 'karaman', 'ünal', 'unal'],
};
