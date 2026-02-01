// Locale definitions and question translations

export type Locale = 'en' | 'ka'; // English and Georgian (ka = ქართული)

export interface LocaleConfig {
  code: Locale;
  name: string;
  nativeName: string;
  flag: string;
}

export const LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', flag: '🇬🇪' },
];

// UI translations
export const translations = {
  en: {
    // Common
    back: 'Back',
    next: 'Next',
    submit: 'Submit',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    // Game modes
    quizball: 'QuizBall',
    timeAttack: 'Time Attack',
    survival: 'Survival',
    multiplayer: 'Multiplayer',
    tournaments: 'Tournaments',
    dailyChallenges: 'Daily Challenges',
    
    // QuizBall specific
    categoryBased: 'Category-based 6s quick matches',
    selectCategory: 'Select a Category',
    playRanked: 'Play Ranked',
    withFriend: 'With Friend',
    featured: 'Featured',
    trending: 'Trending Now',
    myProgress: 'My Progress',
    allCategories: 'All Categories',
    searchCategories: 'Search categories...',
    topPlayers: 'Top Players',
    
    // Game
    question: 'Question',
    score: 'Score',
    time: 'Time',
    streak: 'Streak',
    correct: 'Correct!',
    incorrect: 'Incorrect',
    finalScore: 'Final Score',
    playAgain: 'Play Again',
    mainMenu: 'Main Menu',
    quit: 'Quit',
    
    // Profile
    profile: 'Profile',
    statistics: 'Statistics',
    achievements: 'Achievements',
    settings: 'Settings',
    language: 'Language',
    customizeAvatar: 'Customize Avatar',
    
    // Leaderboard
    leaderboard: 'Leaderboard',
    global: 'Global',
    country: 'Country',
    friends: 'Friends',
    rank: 'Rank',
    
    // Store
    store: 'Store',
    premium: 'Premium',
    avatars: 'Avatars',
    coins: 'Coins',
    purchase: 'Purchase',
    owned: 'Owned',
    equipped: 'Equipped',
  },
  ka: {
    // Common - ქართული
    back: 'უკან',
    next: 'შემდეგი',
    submit: 'გაგზავნა',
    cancel: 'გაუქმება',
    confirm: 'დადასტურება',
    save: 'შენახვა',
    loading: 'იტვირთება...',
    error: 'შეცდომა',
    success: 'წარმატება',
    
    // Game modes
    quizball: 'კვიზბოლი',
    timeAttack: 'დროზე თავდასხმა',
    survival: 'გადარჩენა',
    multiplayer: 'მრავალმოთამაშე',
    tournaments: 'ტურნირები',
    dailyChallenges: 'ყოველდღიური გამოწვევები',
    
    // QuizBall specific
    categoryBased: 'კატეგორიებზე დაფუძნებული 6 წამიანი მატჩები',
    selectCategory: 'აირჩიე კატეგორია',
    playRanked: 'რეიტინგული თამაში',
    withFriend: 'მეგობართან',
    featured: 'გამორჩეული',
    trending: 'ტრენდული',
    myProgress: 'ჩემი პროგრესი',
    allCategories: 'ყველა კატეგორია',
    searchCategories: 'კატეგორიების ძიება...',
    topPlayers: 'საუკეთესო მოთამაშეები',
    
    // Game
    question: 'კითხვა',
    score: 'ქულა',
    time: 'დრო',
    streak: 'სერია',
    correct: 'სწორია!',
    incorrect: 'არასწორია',
    finalScore: 'საბოლოო ქულა',
    playAgain: 'თავიდან თამაში',
    mainMenu: 'მთავარი მენიუ',
    quit: 'გასვლა',
    
    // Profile
    profile: 'პროფილი',
    statistics: 'სტატისტიკა',
    achievements: 'მიღწევები',
    settings: 'პარამეტრები',
    language: 'ენა',
    customizeAvatar: 'ავატარის მორგება',
    
    // Leaderboard
    leaderboard: 'ლიდერბორდი',
    global: 'გლობალური',
    country: 'ქვეყანა',
    friends: 'მეგობრები',
    rank: 'რანგი',
    
    // Store
    store: 'მაღაზია',
    premium: 'პრემიუმი',
    avatars: 'ავატარები',
    coins: 'მონეტები',
    purchase: 'შეძენა',
    owned: 'საკუთრება',
    equipped: 'აღჭურვილი',
  },
};

// Question translations - Sample structure for translating questions
export const questionTranslations = {
  // Standard questions
  questions: {
    '1': {
      en: {
        question: 'In which year did Alfredo Di Stéfano score in five consecutive European Cup finals?',
        options: ['1956-1960', '1955-1959', '1957-1961', '1958-1962'],
        clue: 'This legendary feat started in the mid-1950s during Real Madrid\'s dominance',
      },
      ka: {
        question: 'რომელ წელს გაიმარჯვა ალფრედო დი სტეფანომ ხუთ ევროპის თასის ფინალში ზედიზედ?',
        options: ['1956-1960', '1955-1959', '1957-1961', '1958-1962'],
        clue: 'ეს ლეგენდარული მიღწევა დაიწყო 1950-იანი წლების შუა პერიოდში რეალ მადრიდის დომინირების დროს',
      },
    },
    '2': {
      en: {
        question: 'Who holds the record for most goals scored in a single Bundesliga season?',
        options: ['Robert Lewandowski - 41 goals', 'Gerd Müller - 40 goals', 'Robert Lewandowski - 43 goals', 'Gerd Müller - 42 goals'],
        clue: 'This record was broken in the 2020-21 season by a Polish striker',
      },
      ka: {
        question: 'ვინ ფლობს რეკორდს ბუნდესლიგის ერთ სეზონში ყველაზე მეტი გოლისთვის?',
        options: ['რობერტ ლევანდოვსკი - 41 გოლი', 'გერდ მიულერი - 40 გოლი', 'რობერტ ლევანდოვსკი - 43 გოლი', 'გერდ მიულერი - 42 გოლი'],
        clue: 'ეს რეკორდი გაუმჯობესდა 2020-21 სეზონში პოლონელი თავდამსხმელის მიერ',
      },
    },
    '3': {
      en: {
        question: 'Which player has the most assists in a single Champions League season?',
        options: ['Kevin De Bruyne - 16', 'Lionel Messi - 18', 'Neymar - 15', 'Cristiano Ronaldo - 17'],
        clue: 'The Argentine maestro achieved this during Barcelona\'s 2014-15 treble-winning season',
      },
      ka: {
        question: 'რომელ მოთამაშეს აქვს ყველაზე მეტი ასისტი ჩემპიონთა ლიგის ერთ სეზონში?',
        options: ['კევინ დე ბრაინე - 16', 'ლიონელ მესი - 18', 'ნეიმარი - 15', 'კრიშტიანუ რონალდუ - 17'],
        clue: 'არგენტინელმა მაესტრომ ეს მიაღწია ბარსელონას 2014-15 წლის ტრიპლის სეზონში',
      },
    },
    '4': {
      en: {
        question: 'What was the attendance record at the 1950 World Cup Final (Maracanazo)?',
        options: ['173,850', '199,854', '205,000', '183,341'],
        clue: 'This tragic match for Brazil at the Maracanã had nearly 200,000 spectators',
      },
      ka: {
        question: 'რა იყო მაყურებელთა რეკორდული რაოდენობა 1950 წლის მსოფლიო თასის ფინალზე (მარაკანასო)?',
        options: ['173,850', '199,854', '205,000', '183,341'],
        clue: 'ბრაზილიის ტრაგიკულ მატჩს მარაკანაზე თითქმის 200,000 მაყურებელი ესწრებოდა',
      },
    },
    '5': {
      en: {
        question: 'Who was the first African player to win the UEFA Champions League?',
        options: ['Samuel Eto\'o', 'Rabah Madjer', 'Didier Drogba', 'Nwankwo Kanu'],
        clue: 'This Algerian midfielder scored in the 1987 final for Porto',
      },
      ka: {
        question: 'ვინ იყო პირველი აფრიკელი მოთამაშე, რომელმაც მოიგო UEFA ჩემპიონთა ლიგა?',
        options: ['სამუელ ეტოო', 'რაბა მაჯერი', 'დიდიე დროგბა', 'ნვანკვო კანუ'],
        clue: 'ალჟირელმა ნახევარმცველმა გაიტანა გოლი 1987 წლის ფინალში პორტოსთვის',
      },
    },
    // TODO: Add translations for questions 6-115
    // Copy the structure above and translate each question
    // Example structure for reference:
    // '6': { en: { question: '', options: [], clue: '' }, ka: { question: '', options: [], clue: '' } },
    '82': {
      en: {
        question: 'Which player scored the fastest goal in Premier League history?',
        options: ['Shane Long - 7.69 seconds', 'Ledley King - 9.82 seconds', 'Alan Shearer - 10.52 seconds', 'Christian Benteke - 8.1 seconds'],
        clue: 'The Southampton striker scored against Watford in April 2019',
      },
      ka: {
        question: 'რომელმა მოთამაშემ გაიტანა ყველაზე სწრაფი გოლი პრემიერ ლიგის ისტორიაში?',
        options: ['შეინ ლონგი - 7.69 წამი', 'ლედლი კინგი - 9.82 წამი', 'ალან შირერი - 10.52 წამი', 'კრისტიან ბენტეკე - 8.1 წამი'],
        clue: 'საუთჰემპტონის თავდამსხმელმა გაიტანა უოტფორდის წინააღმდეგ 2019 წლის აპრილში',
      },
    },
    '86': {
      en: {
        question: 'Who is the only goalkeeper to win the Ballon d\'Or?',
        options: ['Dino Zoff', 'Gordon Banks', 'Lev Yashin', 'Iker Casillas'],
        clue: 'This Soviet goalkeeper won it in 1963',
      },
      ka: {
        question: 'ვინ არის ერთადერთი მეკარე, რომელმაც მოიგო ოქროს ბურთი?',
        options: ['დინო ძოფი', 'გორდონ ბენქსი', 'ლევ იაშინი', 'იკერ კასილიასი'],
        clue: 'ამ საბჭოთა მეკარემ მოიგო 1963 წელს',
      },
    },
  },
  
  // Countdown questions
  countdown: {
    'cd-1': {
      en: {
        category: 'World Cup Glory',
        prompt: 'Name players who scored in a World Cup Final',
      },
      ka: {
        category: 'მსოფლიო თასის დიდება',
        prompt: 'დაასახელეთ მოთამაშეები, რომლებმაც გაიტანეს გოლი მსოფლიო თასის ფინალში',
      },
    },
    'cd-2': {
      en: {
        category: 'The Treble',
        prompt: 'Name clubs that won the treble (League, Cup, Champions League)',
      },
      ka: {
        category: 'ტრიპლი',
        prompt: 'დაასახელეთ კლუბები, რომლებმაც მოიგეს ტრიპლი (ლიგა, თასი, ჩემპიონთა ლიგა)',
      },
    },
    'cd-3': {
      en: {
        category: 'World Cup Hosts',
        prompt: 'Name countries that hosted the FIFA World Cup',
      },
      ka: {
        category: 'მსოფლიო თასის მასპინძლები',
        prompt: 'დაასახელეთ ქვეყნები, რომლებიც მასპინძლობდნენ FIFA მსოფლიო თასს',
      },
    },
    'cd-4': {
      en: {
        category: 'Double Winners',
        prompt: 'Name players who won both World Cup and Champions League',
      },
      ka: {
        category: 'ორმაგი გამარჯვებულები',
        prompt: 'დაასახელეთ მოთამაშეები, რომლებმაც მოიგეს მსოფლიო თასი და ჩემპიონთა ლიგა',
      },
    },
    'cd-5': {
      en: {
        category: 'Iconic Stadiums',
        prompt: 'Name football stadiums with 60,000+ capacity',
      },
      ka: {
        category: 'ლეგენდარული სტადიონები',
        prompt: 'დაასახელეთ ფეხბურთის სტადიონები 60,000+ ტევადობით',
      },
    },
    // TODO: Add translations for countdown questions cd-6 through cd-38
    // Follow the same pattern as above
    'cd-33': {
      en: {
        category: 'Premier League Legends',
        prompt: 'Name players who scored 100+ Premier League goals',
      },
      ka: {
        category: 'პრემიერ ლიგის ლეგენდები',
        prompt: 'დაასახელეთ მოთამაშეები, რომლებმაც გაიტანეს 100+ გოლი პრემიერ ლიგაში',
      },
    },
    'cd-34': {
      en: {
        category: 'Ballon d\'Or Winners',
        prompt: 'Name Ballon d\'Or winners from the 21st century',
      },
      ka: {
        category: 'ოქროს ბურთის მფლობელები',
        prompt: 'დაასახელეთ ოქროს ბურთის მფლობელები 21-ე საუკუნიდან',
      },
    },
  },
  
  // Clue questions
  clues: {
    'clue-1': {
      en: {
        category: 'Player',
        clues: [
          { type: 'text', content: '🏆 Won Golden Ball at 2018 World Cup despite semi-final exit' },
          { type: 'text', content: 'Croatian midfielder who played for Real Madrid' },
          { type: 'text', content: 'Wore number 10 for Croatia national team' },
          { type: 'text', content: 'Former Ballon d\'Or winner in 2018' },
          { type: 'text', content: 'First name Luka' },
        ],
        displayAnswer: 'Luka Modrić',
      },
      ka: {
        category: 'მოთამაშე',
        clues: [
          { type: 'text', content: '🏆 მოიგო ოქროს ბურთი 2018 წლის მსოფლიო თასზე ნახევარფინალში წასვლის მიუხედავად' },
          { type: 'text', content: 'ხორვატი ნახევარმცველი, რომელიც თამაშობდა რეალ მადრიდში' },
          { type: 'text', content: 'ატარებდა ნომერ 10-ს ხორვატიის ნაკრებში' },
          { type: 'text', content: 'ყოფილი ოქროს ბურთის მფლობელი 2018 წელს' },
          { type: 'text', content: 'სახელი ლუკა' },
        ],
        displayAnswer: 'ლუკა მოდრიჩი',
      },
    },
    'clue-2': {
      en: {
        category: 'Player',
        clues: [
          { type: 'text', content: '⚽ Scored 91 goals in a calendar year (2012)' },
          { type: 'text', content: 'Argentine forward who spent most career at Barcelona' },
          { type: 'text', content: 'Won 7 Ballon d\'Or awards' },
          { type: 'text', content: 'Recently won the 2022 World Cup with Argentina' },
          { type: 'text', content: 'First name Lionel' },
        ],
        displayAnswer: 'Lionel Messi',
      },
      ka: {
        category: 'მოთამაშე',
        clues: [
          { type: 'text', content: '⚽ გაიტანა 91 გოლი კალენდარულ წელში (2012)' },
          { type: 'text', content: 'არგენტინელი თავდამსხმელი, რომელმაც კარიერის უდიდესი ნაწილი ბარსელონაში გაატარა' },
          { type: 'text', content: 'მოიგო 7 ოქროს ბურთი' },
          { type: 'text', content: 'ახლახან მოიგო 2022 წლის მსოფლიო თასი არგენტინასთან' },
          { type: 'text', content: 'სახელი ლიონელ' },
        ],
        displayAnswer: 'ლიონელ მესი',
      },
    },
    'clue-3': {
      en: {
        category: 'Player',
        clues: [
          { type: 'text', content: '🏆 Won 5 Champions League titles' },
          { type: 'text', content: 'Portuguese forward who played for multiple top clubs' },
          { type: 'text', content: 'Known for his athleticism and heading ability' },
          { type: 'text', content: 'Wore number 7 for Manchester United and Real Madrid' },
          { type: 'text', content: 'Shares first name with Brazilian legend' },
        ],
        displayAnswer: 'Cristiano Ronaldo',
      },
      ka: {
        category: 'მოთამაშე',
        clues: [
          { type: 'text', content: '🏆 მოიგო 5 ჩემპიონთა ლიგის ტიტული' },
          { type: 'text', content: 'პორტუგალიელი თავდამსხმელი, რომელიც თამაშობდა მრავალ წამყვან კლუბში' },
          { type: 'text', content: 'ცნობილია თავისი ატლეტიზმით და თავით გატანის უნარით' },
          { type: 'text', content: 'ატარებდა ნომერ 7-ს მანჩესტერ იუნაითედსა და რეალ მადრიდში' },
          { type: 'text', content: 'იზიარებს სახელს ბრაზილიელ ლეგენდასთან' },
        ],
        displayAnswer: 'კრიშტიანუ რონალდუ',
      },
    },
    // TODO: Add translations for clue questions clue-4 through clue-58
    // Follow the same pattern as above
    'clue-44': {
      en: {
        category: 'Club',
        clues: [
          { type: 'text', content: '🏆 Won first European Cup in 1970s under legendary manager' },
          { type: 'text', content: 'Known as the Reds and plays at Anfield' },
          { type: 'text', content: 'Famous anthem "You\'ll Never Walk Alone"' },
          { type: 'text', content: 'Won 6 Champions League titles' },
          { type: 'text', content: 'English club from Merseyside' },
        ],
        displayAnswer: 'Liverpool',
      },
      ka: {
        category: 'კლუბი',
        clues: [
          { type: 'text', content: '🏆 მოიგო პირველი ევროპის თასი 1970-იან წლებში ლეგენდარული მენეჯერის ხელმძღვანელობით' },
          { type: 'text', content: 'ცნობილია როგორც წითლები და თამაშობს ენფილდზე' },
          { type: 'text', content: 'ცნობილი ჰიმნი "არასოდეს იარო მარტო"' },
          { type: 'text', content: 'მოიგო 6 ჩემპიონთა ლიგის ტიტული' },
          { type: 'text', content: 'ინგლისური კლუბი მერსისაიდიდან' },
        ],
        displayAnswer: 'ლივერპული',
      },
    },
  },
  
  // True/False questions
  trueFalse: {
    'tf-1': {
      en: {
        question: 'Lionel Messi has won the Ballon d\'Or more times than any other player.',
        options: ['True', 'False'],
      },
      ka: {
        question: 'ლიონელ მესიმ მოიგო ოქროს ბურთი უფრო მეტჯერ ვიდრე ყველა სხვა მოთამაშემ.',
        options: ['სწორია', 'მცდარია'],
      },
    },
    'tf-2': {
      en: {
        question: 'Cristiano Ronaldo has scored more goals in the Champions League than any other player.',
        options: ['True', 'False'],
      },
      ka: {
        question: 'კრიშტიანუ რონალდუმ გაიტანა უფრო მეტი გოლი ჩემპიონთა ლიგაში ვიდრე ყველა სხვა მოთამაშემ.',
        options: ['სწორია', 'მცდარია'],
      },
    },
    'tf-3': {
      en: {
        question: 'The Maracanã stadium in Rio de Janeiro has a capacity of over 100,000.',
        options: ['True', 'False'],
      },
      ka: {
        question: 'მარაკანას სტადიონს რიო დე ჟანეიროში აქვს 100,000-ზე მეტი ადგილი.',
        options: ['სწორია', 'მცდარია'],
      },
    },
    'tf-4': {
      en: {
        question: 'Manchester United has won the Premier League more times than any other club.',
        options: ['True', 'False'],
      },
      ka: {
        question: 'მანჩესტერ იუნაიტედმა მოიგო პრემიერ ლიგა უფრო მეტჯერ ვიდრე ყველა სხვა კლუბმა.',
        options: ['სწორია', 'მცდარია'],
      },
    },
    'tf-5': {
      en: {
        question: 'The first World Cup was held in 1930 in Uruguay.',
        options: ['True', 'False'],
      },
      ka: {
        question: 'პირველი მსოფლიო თასი ჩატარდა 1930 წელს ურუგვაიში.',
        options: ['სწორია', 'მცდარია'],
      },
    },
    'tf-6': {
      en: {
        question: 'Real Madrid has won the UEFA Champions League more times than any other club.',
        options: ['True', 'False'],
      },
      ka: {
        question: 'რეალ მადრიდმა მოიგო უეფას ჩემპიონთა ლიგა უფრო მეტჯერ ვიდრე ყველა სხვა კლუბმა.',
        options: ['სწორია', 'მცდარია'],
      },
    },
    'tf-7': {
      en: {
        question: 'Neymar has scored more goals in the Premier League than any other player.',
        options: ['True', 'False'],
      },
      ka: {
        question: 'ნეიმარმა გაიტანა უფრო მეტი გოლი პრემიერ ლიგაში ვიდრე ყველა სხვა მოთამაშემ.',
        options: ['სწორია', 'მცდარია'],
      },
    },
    'tf-8': {
      en: {
        question: 'The 2018 World Cup was held in Russia.',
        options: ['True', 'False'],
      },
      ka: {
        question: '2018 წლის მსოფლიო თასი ჩატარდა რუსეთში.',
        options: ['სწორია', 'მცდარია'],
      },
    },
    'tf-9': {
      en: {
        question: 'Zinedine Zidane has won the Ballon d\'Or more than once.',
        options: ['True', 'False'],
      },
      ka: {
        question: 'ზინედინ ზიდანმა მოიგო ოქროს ბურთი ერთზე მეტჯერ.',
        options: ['სწორია', 'მცდარია'],
      },
    },
    'tf-10': {
      en: {
        question: 'The 2022 World Cup was held in Qatar.',
        options: ['True', 'False'],
      },
      ka: {
        question: '2022 წლის მსოფლიო თასი ჩატარდა კატარში.',
        options: ['სწორია', 'მცდარია'],
      },
    },
  },
};

// Category translations for quizball
export const categoryTranslations = {
  'premier-league': {
    en: { name: 'Premier League', description: 'Test your knowledge of English football' },
    ka: { name: 'პრემიერ ლიგა', description: 'შეამოწმე შენი ცოდნა ინგლისურ ფეხბურთში' },
  },
  'la-liga': {
    en: { name: 'La Liga', description: 'Spanish football mastery' },
    ka: { name: 'ლა ლიგა', description: 'ესპანური ფეხბურთის ოსტატობა' },
  },
  'serie-a': {
    en: { name: 'Serie A', description: 'Italian football expertise' },
    ka: { name: 'სერია ა', description: 'იტალიური ფეხბურთის ექსპერტიზა' },
  },
  'bundesliga': {
    en: { name: 'Bundesliga', description: 'German football knowledge' },
    ka: { name: 'ბუნდესლიგა', description: 'გერმანული ფეხბურთის ცოდნა' },
  },
  'champions-league': {
    en: { name: 'Champions League', description: 'Europe\'s elite competition' },
    ka: { name: 'ჩემპიონთა ლიგა', description: 'ევროპის ელიტური ტურნირი' },
  },
  'world-cup': {
    en: { name: 'World Cup', description: 'International football history' },
    ka: { name: 'მსოფლიო თასი', description: 'საერთაშორისო ფეხბურთის ისტორია' },
  },
  'transfers': {
    en: { name: 'Transfers', description: 'Transfer market knowledge' },
    ka: { name: 'ტრანსფერები', description: 'ტრანსფერების ბაზრის ცოდნა' },
  },
  'legends': {
    en: { name: 'Football Legends', description: 'Test your knowledge of all-time greats' },
    ka: { name: 'ფეხბურთის ლეგენდები', description: 'შეამოწმე შენი ცოდნა ყველა დროის უდიდესებზე' },
  },
  'ligue1': {
    en: { name: 'Ligue 1', description: 'French football expertise' },
    ka: { name: 'ლიგა 1', description: 'ფრანგული ფეხბურთის ექსპერტიზა' },
  },
  'euro': {
    en: { name: 'Euro Championship', description: 'European Championship history' },
    ka: { name: 'ევროპის ჩემპიონატი', description: 'ევროპის ჩემპიონატის ისტორია' },
  },
  'copa-america': {
    en: { name: 'Copa América', description: 'South American glory' },
    ka: { name: 'კოპა ამერიკა', description: 'სამხრეთ ამერიკის დიდება' },
  },
  'eredivisie': {
    en: { name: 'Eredivisie', description: 'Dutch football mastery' },
    ka: { name: 'ერედივიზი', description: 'ჰოლანდიური ფეხბურთის ოსტატობა' },
  },
  'mls': {
    en: { name: 'MLS', description: 'American soccer expertise' },
    ka: { name: 'MLS', description: 'ამერიკული ფეხბურთის ექსპერტიზა' },
  },
  'african-football': {
    en: { name: 'African Football', description: 'African nations and stars' },
    ka: { name: 'აფრიკული ფეხბურთი', description: 'აფრიკული ქვეყნები და ვარსკვლავები' },
  },
  'womens-football': {
    en: { name: 'Women\'s Football', description: 'Women\'s game knowledge' },
    ka: { name: 'ქალთა ფეხბურთი', description: 'ქალთა ფეხბურთის ცოდნა' },
  },
  'asian-football': {
    en: { name: 'Asian Football', description: 'Asian leagues and competitions' },
    ka: { name: 'აზიური ფეხბურთი', description: 'აზიური ლიგები და ტურნირები' },
  },
  'retro-football': {
    en: { name: 'Retro Football', description: 'Classic moments from the past' },
    ka: { name: 'რეტრო ფეხბურთი', description: 'კლასიკური მომენტები წარსულიდან' },
  },
  'tactics': {
    en: { name: 'Tactics & Strategy', description: 'Formations and playing styles' },
    ka: { name: 'ტაქტიკა და სტრატეგია', description: 'ფორმაციები და თამაშის სტილები' },
  },
};

export function getTranslation(locale: Locale, key: keyof typeof translations.en): string {
  return translations[locale][key] || translations.en[key];
}

export function getCategoryTranslation(locale: Locale, categoryId: string) {
  const categories = categoryTranslations as Record<string, Record<Locale, { name: string; description: string }>>;
  return categories[categoryId]?.[locale] || categories[categoryId]?.en || { name: categoryId, description: '' };
}

export function getQuestionTranslation(locale: Locale, questionId: string) {
  const questions = questionTranslations.questions as Record<string, Record<Locale, { question: string; options: string[]; clue: string }>>;
  return questions[questionId]?.[locale] || questions[questionId]?.en;
}

export function getCountdownTranslation(locale: Locale, countdownId: string) {
  const countdown = questionTranslations.countdown as Record<string, Record<Locale, { category: string; prompt: string }>>;
  return countdown[countdownId]?.[locale] || countdown[countdownId]?.en;
}

export function getClueTranslation(locale: Locale, clueId: string) {
  const clues = questionTranslations.clues as Record<string, Record<Locale, { category: string; clues: { type: string; content: string }[]; displayAnswer: string }>>;
  return clues[clueId]?.[locale] || clues[clueId]?.en;
}

export function getTrueFalseTranslation(locale: Locale, trueFalseId: string) {
  const trueFalse = questionTranslations.trueFalse as Record<string, Record<Locale, { question: string; options: string[] }>>;
  return trueFalse[trueFalseId]?.[locale] || trueFalse[trueFalseId]?.en;
}