import { Question, Achievement, PlayerStats, CountdownQuestion, ClueQuestion, EmojiQuestion } from '../types/game';

// Local mock types (different from types/game.ts to support legacy mock data)
interface MockBadge {
  id: string;
  name: string;
  description: string;
  color: string;
  requiredLevel: number;
  unlocked: boolean;
}

interface MockShopItem {
  id: string;
  name: string;
  type: string;
  price: number;
  description: string;
  imageUrl: string;
  owned: boolean;
  equipped: boolean;
}

// Utility function to randomly select N questions from the pool
export function getRandomQuestions(questions: Question[], count: number): Question[] {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, questions.length));
}

// Utility function to randomly select countdown questions with progressive difficulty
export function getRandomCountdownQuestions(count: number = 3): CountdownQuestion[] {
  if (count !== 3) {
    // Fallback to random selection if not 3 rounds
    const shuffled = [...mockCountdownQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, mockCountdownQuestions.length));
  }
  
  // Get questions by difficulty
  const mediumQuestions = mockCountdownQuestions.filter(q => q.difficulty === 'medium');
  const mediumHardQuestions = mockCountdownQuestions.filter(q => q.difficulty === 'medium-hard');
  const hardQuestions = mockCountdownQuestions.filter(q => q.difficulty === 'hard');
  
  // Randomly select one from each difficulty level
  const round1 = mediumQuestions[Math.floor(Math.random() * mediumQuestions.length)];
  const round2 = mediumHardQuestions[Math.floor(Math.random() * mediumHardQuestions.length)];
  const round3 = hardQuestions[Math.floor(Math.random() * hardQuestions.length)];
  
  return [round1, round2, round3];
}

// Utility function to randomly select clue questions
export function getRandomClueQuestions(count: number = 5): ClueQuestion[] {
  const shuffled = [...mockClueQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, mockClueQuestions.length));
}

// Utility function to randomly select true/false questions
export function getRandomTrueFalseQuestions(count: number = 10): Question[] {
  const shuffled = [...mockTrueFalseQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, mockTrueFalseQuestions.length));
}

// For Time Attack and Money Drop daily challenges
// Only questions with Georgian translations
export const mockQuestions: Question[] = [
  {
    id: '1',
    question: 'In which year did Alfredo Di Stéfano score in five consecutive European Cup finals?',
    options: ['1956-1960', '1955-1959', '1957-1961', '1958-1962'],
    correctAnswer: 0,
    difficulty: 'hard',
    category: 'History',
    clue: 'This legendary feat started in the mid-1950s during Real Madrid\'s dominance',
  },
  {
    id: '2',
    question: 'Who holds the record for most goals scored in a single Bundesliga season?',
    options: ['Robert Lewandowski - 41 goals', 'Gerd Müller - 40 goals', 'Robert Lewandowski - 43 goals', 'Gerd Müller - 42 goals'],
    correctAnswer: 0,
    difficulty: 'hard',
    category: 'Records',
    clue: 'This record was broken in the 2020-21 season by a Polish striker',
  },
  {
    id: '3',
    question: 'Which player has the most assists in a single Champions League season?',
    options: ['Kevin De Bruyne - 16', 'Lionel Messi - 18', 'Neymar - 15', 'Cristiano Ronaldo - 17'],
    correctAnswer: 1,
    difficulty: 'hard',
    category: 'Champions League',
    clue: 'The Argentine maestro achieved this during Barcelona\'s 2014-15 treble-winning season',
  },
  {
    id: '4',
    question: 'What was the attendance record at the 1950 World Cup Final (Maracanazo)?',
    options: ['173,850', '199,854', '205,000', '183,341'],
    correctAnswer: 1,
    difficulty: 'hard',
    category: 'World Cup',
    clue: 'This tragic match for Brazil at the Maracanã had nearly 200,000 spectators',
  },
  {
    id: '5',
    question: 'Who was the first African player to win the UEFA Champions League?',
    options: ['Samuel Eto\'o', 'Rabah Madjer', 'Didier Drogba', 'Nwankwo Kanu'],
    correctAnswer: 1,
    difficulty: 'hard',
    category: 'History',
    clue: 'This Algerian midfielder scored in the 1987 final for Porto',
  },
  {
    id: '82',
    question: 'Which player scored the fastest goal in Premier League history?',
    options: ['Shane Long - 7.69 seconds', 'Ledley King - 9.82 seconds', 'Alan Shearer - 10.52 seconds', 'Christian Benteke - 8.1 seconds'],
    correctAnswer: 0,
    difficulty: 'hard',
    category: 'Premier League',
    clue: 'The Southampton striker scored against Watford in April 2019',
  },
  {
    id: '86',
    question: 'Who is the only goalkeeper to win the Ballon d\'Or?',
    options: ['Dino Zoff', 'Gordon Banks', 'Lev Yashin', 'Iker Casillas'],
    correctAnswer: 2,
    difficulty: 'hard',
    category: 'Ballon d\'Or',
    clue: 'This Soviet goalkeeper won it in 1963',
  },
];

export const mockAchievements: Achievement[] = [
  {
    id: 'first_win',
    title: 'Debut Match',
    description: 'Complete your first game',
    icon: 'Trophy',
    unlocked: false,
  },
  {
    id: 'perfect_game',
    title: 'Hat-Trick Hero',
    description: 'Answer all questions correctly',
    icon: 'Star',
    unlocked: false,
  },
  {
    id: 'speed_demon',
    title: 'Lightning Counter',
    description: 'Complete a Time Attack game in under 60 seconds',
    icon: 'Zap',
    unlocked: false,
  },
  {
    id: 'survivor',
    title: 'Clean Sheet',
    description: 'Complete a Survival game without losing all lives',
    icon: 'Heart',
    unlocked: false,
  },
  {
    id: 'streak_master',
    title: 'Winning Streak',
    description: 'Maintain a 5-game winning streak',
    icon: 'Flame',
    unlocked: false,
  },
  {
    id: 'multiplayer_champion',
    title: 'Multiplayer Master',
    description: 'Win 10 multiplayer matches',
    icon: 'Users',
    unlocked: false,
  },
  {
    id: 'tournament_winner',
    title: 'Trophy Collector',
    description: 'Win your first tournament',
    icon: 'Award',
    unlocked: false,
  },
];

export const mockBadges: MockBadge[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    description: 'Awarded for reaching Bronze level',
    color: '#CD7F32',
    requiredLevel: 1,
    unlocked: true,
  },
  {
    id: 'silver',
    name: 'Silver',
    description: 'Awarded for reaching Silver level',
    color: '#C0C0C0',
    requiredLevel: 10,
    unlocked: false,
  },
  {
    id: 'gold',
    name: 'Gold',
    description: 'Awarded for reaching Gold level',
    color: '#FFD700',
    requiredLevel: 25,
    unlocked: false,
  },
  {
    id: 'platinum',
    name: 'Platinum',
    description: 'Awarded for reaching Platinum level',
    color: '#E5E4E2',
    requiredLevel: 50,
    unlocked: false,
  },
  {
    id: 'diamond',
    name: 'Diamond',
    description: 'Awarded for reaching Diamond level',
    color: '#B9F2FF',
    requiredLevel: 75,
    unlocked: false,
  },
  {
    id: 'master',
    name: 'Master',
    description: 'Awarded for reaching Master level',
    color: '#8A2BE2',
    requiredLevel: 100,
    unlocked: false,
  },
];

export const mockShopItems: MockShopItem[] = [
  {
    id: 'avatar_1',
    name: 'Classic Ball',
    type: 'avatar',
    price: 100,
    description: 'Traditional football design',
    imageUrl: '/avatars/ball1.png',
    owned: true,
    equipped: true,
  },
  {
    id: 'avatar_2',
    name: 'Golden Boot',
    type: 'avatar',
    price: 500,
    description: 'For the sharpshooters',
    imageUrl: '/avatars/boot.png',
    owned: false,
    equipped: false,
  },
  {
    id: 'avatar_3',
    name: 'Trophy',
    type: 'avatar',
    price: 1000,
    description: 'Champions only',
    imageUrl: '/avatars/trophy.png',
    owned: false,
    equipped: false,
  },
  {
    id: 'coins_100',
    name: '100 Coins',
    type: 'coins',
    price: 0.99,
    description: 'Small coin pack',
    imageUrl: '/coins/small.png',
    owned: false,
    equipped: false,
  },
  {
    id: 'coins_500',
    name: '500 Coins',
    type: 'coins',
    price: 3.99,
    description: 'Medium coin pack',
    imageUrl: '/coins/medium.png',
    owned: false,
    equipped: false,
  },
  {
    id: 'coins_1000',
    name: '1000 Coins',
    type: 'coins',
    price: 6.99,
    description: 'Large coin pack',
    imageUrl: '/coins/large.png',
    owned: false,
    equipped: false,
  },
  {
    id: 'premium_month',
    name: 'Premium Monthly',
    type: 'premium',
    price: 9.99,
    description: 'Ad-free experience for 30 days',
    imageUrl: '/premium/month.png',
    owned: false,
    equipped: false,
  },
  {
    id: 'premium_year',
    name: 'Premium Yearly',
    type: 'premium',
    price: 49.99,
    description: 'Ad-free experience for 365 days',
    imageUrl: '/premium/year.png',
    owned: false,
    equipped: false,
  },
];

// Function to generate random match data for leaderboard
export function generateMockLeaderboardData(count: number = 10) {
  const names = [
    'Cristiano', 'Messi', 'Neymar', 'Mbappé', 'Haaland', 
    'Benzema', 'Modrić', 'De Bruyne', 'Salah', 'Lewandowski',
    'Ronaldinho', 'Zidane', 'Beckham', 'Xavi', 'Iniesta'
  ];
  
  return Array.from({ length: count }, (_, i) => {
    const gamesPlayed = Math.floor(Math.random() * 100) + 50;
    const correctAnswers = Math.floor(Math.random() * gamesPlayed * 10);
    return {
      id: `player-${i + 1}`,
      rank: i + 1,
      username: names[i % names.length] + (i > 14 ? Math.floor(i / 15) : ''),
      avatar: `/avatars/avatar${(i % 5) + 1}.png`,
      level: Math.floor(Math.random() * 50) + 1,
      coins: Math.floor(Math.random() * 5000) + 1000,
      xp: Math.floor(Math.random() * 1000),
      xpToNextLevel: 1000,
      totalScore: Math.floor(Math.random() * 10000) + 5000,
      gamesPlayed,
      correctAnswers,
      currentStreak: Math.floor(Math.random() * 10),
      bestStreak: Math.floor(Math.random() * 20) + 5,
      achievements: [],
      badges: [],
      ownedItems: [],
      rankPoints: Math.floor(Math.random() * 3000) + 1000,
      rankedTier: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'][Math.floor(Math.random() * 5)] as 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond'
    };
  });
}

// Function to generate random categories for quizball mode
export const categoryList = [
  { id: 'premier-league', name: 'Premier League', icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', tier: 'featured' },
  { id: 'la-liga', name: 'La Liga', icon: '🇪🇸', tier: 'featured' },
  { id: 'serie-a', name: 'Serie A', icon: '🇮🇹', tier: 'featured' },
  { id: 'bundesliga', name: 'Bundesliga', icon: '🇩🇪', tier: 'featured' },
  { id: 'champions-league', name: 'Champions League', icon: '🏆', tier: 'featured' },
  { id: 'world-cup', name: 'World Cup', icon: '🌍', tier: 'featured' },
  { id: 'transfers', name: 'Transfers', icon: '💰', tier: 'trending' },
  { id: 'legends', name: 'Football Legends', icon: '⭐', tier: 'trending' },
  { id: 'ligue1', name: 'Ligue 1', icon: '🇫🇷', tier: 'standard' },
  { id: 'euro', name: 'Euro Championship', icon: '🏆', tier: 'standard' },
  { id: 'copa-america', name: 'Copa América', icon: '🏆', tier: 'standard' },
  { id: 'eredivisie', name: 'Eredivisie', icon: '🇳🇱', tier: 'standard' },
  { id: 'mls', name: 'MLS', icon: '🇺🇸', tier: 'standard' },
  { id: 'african-football', name: 'African Football', icon: '🌍', tier: 'standard' },
  { id: 'womens-football', name: 'Women\'s Football', icon: '⚽', tier: 'standard' },
  { id: 'asian-football', name: 'Asian Football', icon: '🌏', tier: 'standard' },
  { id: 'retro-football', name: 'Retro Football', icon: '📼', tier: 'standard' },
  { id: 'tactics', name: 'Tactics & Strategy', icon: '📋', tier: 'standard' },
];

// Daily challenge utility - selects 25 questions randomly and creates category titles
export const generateDailyChallengeQuestions = () => {
  const shuffled = [...mockQuestions].sort(() => Math.random() - 0.5);
  const selected25 = shuffled.slice(0, Math.min(25, mockQuestions.length));
  
  const categoryTitles = [
    'Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Champions League',
    'World Cup', 'Transfers', 'Legends', 'Euro', 'Copa América',
    'Records', 'History', 'Tactics', 'Modern Era', 'Golden Age',
    'African Football', 'Asian Football', 'MLS', 'Ligue 1', 'Eredivisie',
    'Women\'s Football', 'Youth Football', 'Clubs', 'Players', 'Managers'
  ];
  
  return selected25.map((question, index) => ({
    id: `cat-${index}`,
    title: categoryTitles[index],
    question,
    answered: false,
  }));
};

// Countdown mode questions - Only questions with Georgian translations
export const mockCountdownQuestions: CountdownQuestion[] = [
  {
    id: 'cd-1',
    category: 'World Cup Glory',
    prompt: 'Name players who scored in a World Cup Final',
    answerGroups: [
      { display: 'Pelé', accepted: ['pele'] },
      { display: 'Zinedine Zidane', accepted: ['zidane'] },
      { display: 'Diego Maradona', accepted: ['maradona'] },
      { display: 'Lionel Messi', accepted: ['messi', 'lionel messi'] },
      { display: 'Kylian Mbappé', accepted: ['mbappe', 'kylian mbappe'] },
      { display: 'Geoff Hurst', accepted: ['hurst', 'geoff hurst'] },
      { display: 'Vavá', accepted: ['vava'] },
      { display: 'Mario Götze', accepted: ['gotze', 'mario gotze'] },
      { display: 'Paul Breitner', accepted: ['breitner'] },
      { display: 'Ángel Di María', accepted: ['di maria', 'angel di maria'] },
    ],
    difficulty: 'medium',
    timeLimit: 120,
    pointsPerAnswer: 100,
  },
  {
    id: 'cd-2',
    category: 'The Treble',
    prompt: 'Name clubs that won the treble (League, Cup, Champions League)',
    answerGroups: [
      { display: 'Manchester United', accepted: ['manchester united', 'man united', 'man utd'] },
      { display: 'Barcelona', accepted: ['barcelona', 'barca'] },
      { display: 'Inter Milan', accepted: ['inter milan', 'inter', 'internazionale'] },
      { display: 'Bayern Munich', accepted: ['bayern munich', 'bayern'] },
      { display: 'Celtic', accepted: ['celtic'] },
      { display: 'Ajax', accepted: ['ajax'] },
      { display: 'PSV Eindhoven', accepted: ['psv', 'psv eindhoven'] },
      { display: 'Manchester City', accepted: ['manchester city', 'man city'] },
    ],
    difficulty: 'medium',
    timeLimit: 120,
    pointsPerAnswer: 125,
  },
  {
    id: 'cd-3',
    category: 'World Cup Hosts',
    prompt: 'Name countries that hosted the FIFA World Cup',
    answerGroups: [
      { display: 'Brazil', accepted: ['brazil'] },
      { display: 'Germany', accepted: ['germany', 'west germany'] },
      { display: 'Italy', accepted: ['italy'] },
      { display: 'France', accepted: ['france'] },
      { display: 'Mexico', accepted: ['mexico'] },
      { display: 'Argentina', accepted: ['argentina'] },
      { display: 'England', accepted: ['england'] },
      { display: 'Spain', accepted: ['spain'] },
      { display: 'United States', accepted: ['usa', 'united states', 'america'] },
      { display: 'South Africa', accepted: ['south africa'] },
      { display: 'South Korea & Japan', accepted: ['south korea', 'japan', 'korea', 'south korea and japan'] },
      { display: 'Russia', accepted: ['russia'] },
      { display: 'Qatar', accepted: ['qatar'] },
      { display: 'Switzerland', accepted: ['switzerland'] },
      { display: 'Sweden', accepted: ['sweden'] },
      { display: 'Chile', accepted: ['chile'] },
      { display: 'Uruguay', accepted: ['uruguay'] },
    ],
    difficulty: 'medium-hard',
    timeLimit: 150,
    pointsPerAnswer: 100,
  },
  {
    id: 'cd-4',
    category: 'Double Winners',
    prompt: 'Name players who won both World Cup and Champions League',
    answerGroups: [
      { display: 'Zinedine Zidane', accepted: ['zidane'] },
      { display: 'Ronaldinho', accepted: ['ronaldinho'] },
      { display: 'Kaká', accepted: ['kaka'] },
      { display: 'Xavi Hernández', accepted: ['xavi'] },
      { display: 'Andrés Iniesta', accepted: ['iniesta', 'andres iniesta'] },
      { display: 'Iker Casillas', accepted: ['casillas', 'iker casillas'] },
      { display: 'Sergio Ramos', accepted: ['ramos', 'sergio ramos'] },
      { display: 'Lionel Messi', accepted: ['messi', 'lionel messi'] },
      { display: 'Philipp Lahm', accepted: ['lahm'] },
      { display: 'Bastian Schweinsteiger', accepted: ['schweinsteiger'] },
    ],
    difficulty: 'medium-hard',
    timeLimit: 150,
    pointsPerAnswer: 120,
  },
  {
    id: 'cd-5',
    category: 'Iconic Stadiums',
    prompt: 'Name football stadiums with 60,000+ capacity',
    answerGroups: [
      { display: 'Camp Nou', accepted: ['camp nou', 'nou camp'] },
      { display: 'Santiago Bernabéu', accepted: ['bernabeu', 'santiago bernabeu'] },
      { display: 'Old Trafford', accepted: ['old trafford'] },
      { display: 'Allianz Arena', accepted: ['allianz arena'] },
      { display: 'San Siro', accepted: ['san siro', 'giuseppe meazza'] },
      { display: 'Wembley Stadium', accepted: ['wembley'] },
      { display: 'Signal Iduna Park', accepted: ['signal iduna park', 'westfalenstadion'] },
      { display: 'Estadio Azteca', accepted: ['azteca', 'estadio azteca'] },
      { display: 'Maracanã', accepted: ['maracana'] },
      { display: 'FNB Stadium', accepted: ['fnb stadium', 'soccer city'] },
    ],
    difficulty: 'hard',
    timeLimit: 180,
    pointsPerAnswer: 150,
  },
  {
    id: 'cd-33',
    category: 'Premier League Legends',
    prompt: 'Name players who scored 100+ Premier League goals',
    answerGroups: [
      { display: 'Alan Shearer', accepted: ['shearer', 'alan shearer'] },
      { display: 'Harry Kane', accepted: ['kane', 'harry kane'] },
      { display: 'Wayne Rooney', accepted: ['rooney', 'wayne rooney'] },
      { display: 'Andrew Cole', accepted: ['cole', 'andy cole', 'andrew cole'] },
      { display: 'Sergio Agüero', accepted: ['aguero', 'sergio aguero'] },
      { display: 'Frank Lampard', accepted: ['lampard', 'frank lampard'] },
      { display: 'Thierry Henry', accepted: ['henry', 'thierry henry'] },
      { display: 'Robbie Fowler', accepted: ['fowler', 'robbie fowler'] },
      { display: 'Jermain Defoe', accepted: ['defoe', 'jermain defoe'] },
      { display: 'Michael Owen', accepted: ['owen', 'michael owen'] },
      { display: 'Mohamed Salah', accepted: ['salah', 'mohamed salah'] },
      { display: 'Romelu Lukaku', accepted: ['lukaku', 'romelu lukaku'] },
    ],
    difficulty: 'hard',
    timeLimit: 180,
    pointsPerAnswer: 150,
  },
  {
    id: 'cd-34',
    category: 'Ballon d\'Or Winners',
    prompt: 'Name Ballon d\'Or winners from the 21st century',
    answerGroups: [
      { display: 'Lionel Messi', accepted: ['messi', 'lionel messi'] },
      { display: 'Cristiano Ronaldo', accepted: ['ronaldo', 'cristiano ronaldo'] },
      { display: 'Luka Modrić', accepted: ['modric', 'luka modric'] },
      { display: 'Karim Benzema', accepted: ['benzema', 'karim benzema'] },
      { display: 'Fabio Cannavaro', accepted: ['cannavaro'] },
      { display: 'Kaká', accepted: ['kaka'] },
      { display: 'Ronaldinho', accepted: ['ronaldinho'] },
      { display: 'Zinedine Zidane', accepted: ['zidane'] },
      { display: 'Luís Figo', accepted: ['figo', 'luis figo'] },
      { display: 'Michael Owen', accepted: ['owen', 'michael owen'] },
    ],
    difficulty: 'hard',
    timeLimit: 180,
    pointsPerAnswer: 150,
  },
];

// Clue mode questions - Only questions with Georgian translations
export const mockClueQuestions: ClueQuestion[] = [
  {
    id: 'clue-1',
    category: 'Player',
    clues: [
      { type: 'text', content: '🏆 Won Golden Ball at 2018 World Cup despite semi-final exit' },
      { type: 'text', content: 'Croatian midfielder who played for Real Madrid' },
      { type: 'text', content: 'Wore number 10 for Croatia national team' },
      { type: 'text', content: 'Former Ballon d\'Or winner in 2018' },
      { type: 'text', content: 'First name Luka' },
    ],
    displayAnswer: 'Luka Modrić',
    acceptedAnswers: ['modric', 'luka modric', 'modrić', 'luka modrić'],
    answer: 'modric',
    difficulty: 'medium',
  },
  {
    id: 'clue-2',
    category: 'Player',
    clues: [
      { type: 'text', content: '⚽ Scored 91 goals in a calendar year (2012)' },
      { type: 'text', content: 'Argentine forward who spent most career at Barcelona' },
      { type: 'text', content: 'Won 7 Ballon d\'Or awards' },
      { type: 'text', content: 'Recently won the 2022 World Cup with Argentina' },
      { type: 'text', content: 'First name Lionel' },
    ],
    displayAnswer: 'Lionel Messi',
    acceptedAnswers: ['messi', 'lionel messi'],
    answer: 'messi',
    difficulty: 'easy',
  },
  {
    id: 'clue-3',
    category: 'Player',
    clues: [
      { type: 'text', content: '🏆 Won 5 Champions League titles' },
      { type: 'text', content: 'Portuguese forward who played for multiple top clubs' },
      { type: 'text', content: 'Known for his athleticism and heading ability' },
      { type: 'text', content: 'Wore number 7 for Manchester United and Real Madrid' },
      { type: 'text', content: 'Shares first name with Brazilian legend' },
    ],
    displayAnswer: 'Cristiano Ronaldo',
    acceptedAnswers: ['ronaldo', 'cristiano ronaldo', 'cristiano', 'cr7'],
    answer: 'ronaldo',
    difficulty: 'easy',
  },
  {
    id: 'clue-44',
    category: 'Club',
    clues: [
      { type: 'text', content: '🏆 Won first European Cup in 1970s under legendary manager' },
      { type: 'text', content: 'Known as the Reds and plays at Anfield' },
      { type: 'text', content: 'Famous anthem "You\'ll Never Walk Alone"' },
      { type: 'text', content: 'Won 6 Champions League titles' },
      { type: 'text', content: 'English club from Merseyside' },
    ],
    displayAnswer: 'Liverpool',
    acceptedAnswers: ['liverpool', 'liverpool fc'],
    answer: 'liverpool',
    difficulty: 'medium',
  },
];

// True/false questions - Only questions with Georgian translations
export const mockTrueFalseQuestions: Question[] = [
  {
    id: 'tf-1',
    question: 'Lionel Messi has won the Ballon d\'Or more times than any other player.',
    options: ['True', 'False'],
    correctAnswer: 0,
    difficulty: 'easy',
    category: 'Ballon d\'Or',
    clue: 'Lionel Messi has won the Ballon d\'Or 7 times as of 2023',
  },
  {
    id: 'tf-2',
    question: 'Cristiano Ronaldo has scored more goals in the Champions League than any other player.',
    options: ['True', 'False'],
    correctAnswer: 0,
    difficulty: 'easy',
    category: 'Champions League',
    clue: 'Cristiano Ronaldo has scored 140 goals in the Champions League as of 2023',
  },
  {
    id: 'tf-3',
    question: 'The Maracanã stadium in Rio de Janeiro has a capacity of over 100,000.',
    options: ['True', 'False'],
    correctAnswer: 1,
    difficulty: 'easy',
    category: 'Stadiums',
    clue: 'The Maracanã stadium has a capacity of 78,838',
  },
  {
    id: 'tf-4',
    question: 'Manchester United has won the Premier League more times than any other club.',
    options: ['True', 'False'],
    correctAnswer: 0,
    difficulty: 'easy',
    category: 'Premier League',
    clue: 'Manchester United has won the Premier League 20 times as of 2023',
  },
  {
    id: 'tf-5',
    question: 'The first World Cup was held in 1930 in Uruguay.',
    options: ['True', 'False'],
    correctAnswer: 0,
    difficulty: 'easy',
    category: 'World Cup',
    clue: 'The first World Cup was indeed held in 1930 in Uruguay',
  },
  {
    id: 'tf-6',
    question: 'Real Madrid has won the UEFA Champions League more times than any other club.',
    options: ['True', 'False'],
    correctAnswer: 0,
    difficulty: 'easy',
    category: 'Champions League',
    clue: 'Real Madrid has won the UEFA Champions League 14 times as of 2023',
  },
  {
    id: 'tf-7',
    question: 'Neymar has scored more goals in the Premier League than any other player.',
    options: ['True', 'False'],
    correctAnswer: 1,
    difficulty: 'easy',
    category: 'Premier League',
    clue: 'Neymar has scored 20 goals in the Premier League as of 2023',
  },
  {
    id: 'tf-8',
    question: 'The 2018 World Cup was held in Russia.',
    options: ['True', 'False'],
    correctAnswer: 0,
    difficulty: 'easy',
    category: 'World Cup',
    clue: 'The 2018 World Cup was indeed held in Russia',
  },
  {
    id: 'tf-9',
    question: 'Zinedine Zidane has won the Ballon d\'Or more than once.',
    options: ['True', 'False'],
    correctAnswer: 0,
    difficulty: 'easy',
    category: 'Ballon d\'Or',
    clue: 'Zinedine Zidane won the Ballon d\'Or in 1998 and 2000',
  },
  {
    id: 'tf-10',
    question: 'The 2022 World Cup was held in Qatar.',
    options: ['True', 'False'],
    correctAnswer: 0,
    difficulty: 'easy',
    category: 'World Cup',
    clue: 'The 2022 World Cup was indeed held in Qatar',
  },
];

// Mock leaderboard data
export const mockLeaderboard = generateMockLeaderboardData(50);

export const mockCountryLeaderboard = generateMockLeaderboardData(30).map((player, index) => ({
  ...player,
  rank: index + 1,
  username: player.username + ' (GEO)',
}));

export const mockFriendsLeaderboard = generateMockLeaderboardData(10).map((player, index) => ({
  ...player,
  rank: index + 1,
  username: 'Friend ' + player.username,
}));

// Mock current player data
export const mockCurrentPlayer: PlayerStats = {
  id: 'player-1',
  username: 'quizballPro',
  avatar: '⚽',
  level: 5,
  xp: 450,
  xpToNextLevel: 1000,
  coins: 2500,
  tickets: 10,
  lastTicketReset: new Date().toISOString(),
  profileBackground: 'bronze', // Default bronze background
  ownedBackgrounds: ['bronze'], // Bronze is unlocked by default
  totalScore: 1250,
  gamesPlayed: 45,
  correctAnswers: 320,
  currentStreak: 3,
  bestStreak: 7,
  achievements: mockAchievements,
  badges: [
    { id: 'bronze', name: 'Bronze', icon: '🥉', rarity: 'common' as const, earned: true },
    { id: 'silver', name: 'Silver', icon: '🥈', rarity: 'rare' as const, earned: false },
    { id: 'gold', name: 'Gold', icon: '🥇', rarity: 'epic' as const, earned: false },
  ],
  rank: 247,
  ownedItems: [],
  rankPoints: 250, // Division 8
  rankedTier: 'Silver',
  completedLevels: [1, 2],
};

// Emoji Guess questions - Players, Managers, and Clubs
export const mockEmojiQuestions: EmojiQuestion[] = [
  {
    id: 'emoji-1',
    emojis: '🐐👑⚽',
    answerType: 'player',
    correctAnswer: 'messi',
    acceptedAnswers: ['messi', 'lionel messi', 'leo messi', 'lionel'],
    displayAnswer: 'Lionel Messi',
    difficulty: 'easy',
  },
  {
    id: 'emoji-2',
    emojis: '🇵🇹7️⃣',
    answerType: 'player',
    correctAnswer: 'ronaldo',
    acceptedAnswers: ['ronaldo', 'cristiano ronaldo', 'cr7', 'cristiano'],
    displayAnswer: 'Cristiano Ronaldo',
    difficulty: 'easy',
  },
  {
    id: 'emoji-3',
    emojis: '👔🧠🇪🇸',
    answerType: 'manager',
    correctAnswer: 'guardiola',
    acceptedAnswers: ['guardiola', 'pep guardiola', 'pep'],
    displayAnswer: 'Pep Guardiola',
    difficulty: 'medium',
  },
  {
    id: 'emoji-4',
    emojis: '👓🇩🇪⚫',
    answerType: 'manager',
    correctAnswer: 'klopp',
    acceptedAnswers: ['klopp', 'jurgen klopp', 'jürgen klopp', 'jurgen'],
    displayAnswer: 'Jürgen Klopp',
    difficulty: 'medium',
  },
  {
    id: 'emoji-5',
    emojis: '🔴👹🏴󐁧󐁢󐁥󐁮󐁧󐁿',
    answerType: 'club',
    correctAnswer: 'manchester united',
    acceptedAnswers: ['manchester united', 'man united', 'man utd', 'united', 'mufc'],
    displayAnswer: 'Manchester United',
    difficulty: 'easy',
  },
  {
    id: 'emoji-6',
    emojis: '⚪⚫🦓',
    answerType: 'club',
    correctAnswer: 'juventus',
    acceptedAnswers: ['juventus', 'juve'],
    displayAnswer: 'Juventus',
    difficulty: 'medium',
  },
  {
    id: 'emoji-7',
    emojis: '🦅👑🇪🇸',
    answerType: 'club',
    correctAnswer: 'real madrid',
    acceptedAnswers: ['real madrid', 'real', 'madrid'],
    displayAnswer: 'Real Madrid',
    difficulty: 'easy',
  },
  {
    id: 'emoji-8',
    emojis: '🐓🏴󐁧󐁢󐁥󐁮󐁧󐁿⚪',
    answerType: 'club',
    correctAnswer: 'tottenham',
    acceptedAnswers: ['tottenham', 'tottenham hotspur', 'spurs', 'thfc'],
    displayAnswer: 'Tottenham',
    difficulty: 'medium',
  },
  {
    id: 'emoji-9',
    emojis: '🔵🔴🇪🇸',
    answerType: 'club',
    correctAnswer: 'barcelona',
    acceptedAnswers: ['barcelona', 'barca', 'barça', 'fcb'],
    displayAnswer: 'Barcelona',
    difficulty: 'easy',
  },
  {
    id: 'emoji-10',
    emojis: '🇫🇷⚡🐢',
    answerType: 'player',
    correctAnswer: 'mbappe',
    acceptedAnswers: ['mbappe', 'kylian mbappe', 'mbappé', 'kylian'],
    displayAnswer: 'Kylian Mbappé',
    difficulty: 'easy',
  },
  {
    id: 'emoji-11',
    emojis: '🇧🇷9️⃣😁',
    answerType: 'player',
    correctAnswer: 'ronaldo',
    acceptedAnswers: ['ronaldo', 'r9', 'ronaldo nazario', 'brazilian ronaldo', 'fenomeno'],
    displayAnswer: 'Ronaldo (R9)',
    difficulty: 'medium',
  },
  {
    id: 'emoji-12',
    emojis: '🧊❄️🇮🇹',
    answerType: 'manager',
    correctAnswer: 'ancelotti',
    acceptedAnswers: ['ancelotti', 'carlo ancelotti', 'carlo'],
    displayAnswer: 'Carlo Ancelotti',
    difficulty: 'medium',
  },
  {
    id: 'emoji-13',
    emojis: '🦁🔵🏴󐁧󐁢󐁥󐁮󐁧󐁿',
    answerType: 'club',
    correctAnswer: 'chelsea',
    acceptedAnswers: ['chelsea', 'cfc'],
    displayAnswer: 'Chelsea',
    difficulty: 'easy',
  },
  {
    id: 'emoji-14',
    emojis: '⚡🇳🇴9️⃣',
    answerType: 'player',
    correctAnswer: 'haaland',
    acceptedAnswers: ['haaland', 'erling haaland', 'erling'],
    displayAnswer: 'Erling Haaland',
    difficulty: 'easy',
  },
  {
    id: 'emoji-15',
    emojis: '🏴󐁧󐁢󐁥󐁮󐁧󐁿🔴⚓',
    answerType: 'club',
    correctAnswer: 'liverpool',
    acceptedAnswers: ['liverpool', 'lfc'],
    displayAnswer: 'Liverpool',
    difficulty: 'easy',
  },
  {
    id: 'emoji-16',
    emojis: '🦅🇮🇹🔵',
    answerType: 'club',
    correctAnswer: 'lazio',
    acceptedAnswers: ['lazio', 'ss lazio'],
    displayAnswer: 'Lazio',
    difficulty: 'hard',
  },
  {
    id: 'emoji-17',
    emojis: '👔🇫🇷🏆',
    answerType: 'manager',
    correctAnswer: 'zidane',
    acceptedAnswers: ['zidane', 'zinedine zidane', 'zinedine'],
    displayAnswer: 'Zinedine Zidane',
    difficulty: 'medium',
  },
  {
    id: 'emoji-18',
    emojis: '🇪🇬👑⚽',
    answerType: 'player',
    correctAnswer: 'salah',
    acceptedAnswers: ['salah', 'mohamed salah', 'mo salah', 'mohamed'],
    displayAnswer: 'Mohamed Salah',
    difficulty: 'easy',
  },
];

// Utility function to randomly select emoji questions
export function getRandomEmojiQuestions(count: number = 6): EmojiQuestion[] {
  const shuffled = [...mockEmojiQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, mockEmojiQuestions.length));
}