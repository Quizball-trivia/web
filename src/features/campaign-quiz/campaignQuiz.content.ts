export interface CampaignQuizPageContent {
  slug: string;
  title: string;
  metadataTitle: string;
  description: string;
  breadcrumbLabel: string;
  heroLead: string;
  heroHighlight: string;
  lede: string;
  playHeading: string;
  aboutEyebrow: string;
  aboutHeading: string;
  aboutParagraphs: string[];
  scoreTemplate: string;
  footerCta: string;
  heroImage: string;
  heroImageAlt: string;
  relatedSlugs: string[];
}

const CATEGORY_IMAGE_BASE =
  'https://nsdfiprfmhdqhbfxfwpv.supabase.co/storage/v1/object/public/imgs/categories';

export const CAMPAIGN_QUIZ_CONTENT: Record<string, CampaignQuizPageContent> = {
  liverpool: {
    slug: 'liverpool',
    title: 'Liverpool Quiz — Test Your LFC Knowledge',
    metadataTitle: 'Liverpool Quiz — Test Your LFC Knowledge | QuizBall',
    description:
      'Free Liverpool quiz — 15 verified questions on the Reds. Instant score, no sign-up needed to play. Then take on real fans in ranked football duels.',
    breadcrumbLabel: 'Liverpool Quiz',
    heroLead: 'Liverpool Quiz —',
    heroHighlight: 'Test Your LFC Knowledge',
    lede:
      'Think you know the Reds? Play our free Liverpool quiz — 15 verified questions covering Anfield legends, European nights and Premier League glory. No sign-up needed: answer, get your score instantly, and see how you rank against thousands of football fans. Ready when you are — kick off below.',
    playHeading: 'Kick off the Liverpool quiz',
    aboutEyebrow: 'The story behind the questions',
    aboutHeading: 'About this Liverpool football quiz',
    aboutParagraphs: [
      'Few clubs pack as much history into a quiz as Liverpool FC. This Liverpool football quiz draws on more than a century of drama at Anfield — from Bill Shankly rebuilding the club in the 1960s to the miracle of Istanbul in 2005, when the Reds came back from three goals down against AC Milan to lift a fifth European Cup.',
      'Our questions are pulled from QuizBall’s bank of verified football trivia, so every answer has been checked. Expect the icons — Ian Rush’s goalscoring records, King Kenny Dalglish, Steven Gerrard’s leadership — alongside modern history: Jürgen Klopp’s Champions League win in 2019 and the long-awaited league title that followed a year later.',
      'Whether you stand on the Kop every other week or just want a proper test of your ball knowledge, take the quiz on Liverpool above and see your score instantly. Fancy a bigger challenge? QuizBall’s wider question bank can also be played head-to-head — sign up free and defend your score against real opponents in live trivia duels.',
    ],
    scoreTemplate:
      'You scored {score}/{total} — sign up free to save your score and defend it in a ranked duel.',
    footerCta:
      'Think you know the Reds? Prove it against real fans — play ranked football trivia duels on QuizBall.',
    heroImage: `${CATEGORY_IMAGE_BASE}/liverpool-v2.webp`,
    heroImageAlt: 'Liverpool FC category artwork',
    relatedSlugs: ['manchester-united', 'tottenham', 'everton', 'premier-league'],
  },
  'manchester-united': {
    slug: 'manchester-united',
    title: 'Man United Quiz — Test Your Red Devils Knowledge',
    metadataTitle: 'Man United Quiz — Test Your Red Devils Knowledge | QuizBall',
    description:
      'Free Man United quiz — 15 verified questions on the Red Devils. Instant score, no sign-up needed to play. Then beat real fans in ranked football duels.',
    breadcrumbLabel: 'Man United Quiz',
    heroLead: 'Man United Quiz —',
    heroHighlight: 'Test Your Red Devils Knowledge',
    lede:
      'How well do you really know Manchester United? Play our free Man United quiz — 15 verified questions on Old Trafford legends, treble glory and Premier League dominance. No sign-up needed: instant score, then see how you compare with thousands of football fans. Kick off below.',
    playHeading: 'Kick off the Man United quiz',
    aboutEyebrow: 'The story behind the questions',
    aboutHeading: 'About this Manchester United quiz',
    aboutParagraphs: [
      'Manchester United’s story reads like a script: the Busby Babes and the tragedy of Munich in 1958, redemption at Wembley in 1968 as the first English winners of the European Cup, and the Ferguson era that turned the Premier League into a red procession — 13 titles, the 1999 treble, and that injury-time night at the Camp Nou.',
      'This Man United quiz pulls 15 verified questions from QuizBall’s football trivia bank, covering the icons — Sir Bobby Charlton, Eric Cantona, the Class of 92, Wayne Rooney’s record-breaking goals — plus the moments every United fan argues about at the pub. Every answer has been checked before it reaches you.',
      'Play the manchester united quiz above for free, get your score instantly, and replay for a fresh set of questions. And when a solo score isn’t enough, do what United sides always did: take it to a bigger stage. Sign up free and play ranked head-to-head duels against real fans, where every correct answer is a shot on goal.',
    ],
    scoreTemplate:
      'You scored {score}/{total} — sign up free to save your score and defend it in a ranked duel.',
    footerCta:
      'Fancy yourself a proper Red? Prove it in live trivia duels against real fans.',
    heroImage: `${CATEGORY_IMAGE_BASE}/manchester-united-v2.webp`,
    heroImageAlt: 'Manchester United category artwork',
    relatedSlugs: ['liverpool', 'tottenham', 'everton', 'premier-league'],
  },
  tottenham: {
    slug: 'tottenham',
    title: 'Tottenham Quiz — Test Your Spurs Knowledge',
    metadataTitle: 'Tottenham Quiz — Test Your Spurs Knowledge | QuizBall',
    description:
      'Free Tottenham quiz — 15 verified questions on Spurs. Instant score, no sign-up needed to play. Then take on real fans in ranked football trivia duels.',
    breadcrumbLabel: 'Tottenham Quiz',
    heroLead: 'Tottenham Quiz —',
    heroHighlight: 'Test Your Spurs Knowledge',
    lede:
      'Audere est facere — to dare is to do. Dare to take our free Tottenham quiz: 15 verified questions on Spurs legends, White Hart Lane history and famous European nights. No sign-up needed — instant score, then see how you compare with thousands of football fans.',
    playHeading: 'Kick off the Tottenham quiz',
    aboutEyebrow: 'The story behind the questions',
    aboutHeading: 'About this Tottenham Hotspur quiz',
    aboutParagraphs: [
      'Tottenham Hotspur have always done things with style — it’s written into the club motto. This tottenham hotspur quiz covers the lot: Bill Nicholson’s 1961 double winners, the first English club to achieve the feat in the 20th century; Jimmy Greaves banging in goals at White Hart Lane; Gareth Bale terrorising full-backs before his world-record move to Real Madrid; and Harry Kane rewriting the club’s scoring records on his way to becoming England’s record goalscorer.',
      'Every question comes from QuizBall’s verified trivia bank, so the facts stand up to pub-argument scrutiny. You’ll get 15 questions per round — five easy, five medium and five hard.',
      'Play the spurs quiz above for free and get your score instantly, no account needed. Then, if you’re feeling daring, do what the motto demands: sign up free and take your ball knowledge into live ranked duels against real opponents, where every correct answer brings you closer to goal.',
    ],
    scoreTemplate:
      'You scored {score}/{total} — sign up free to save your score and defend it in a ranked duel.',
    footerCta:
      'To dare is to do — take your Spurs knowledge into live duels against real fans.',
    heroImage: `${CATEGORY_IMAGE_BASE}/tottenham-v2.webp`,
    heroImageAlt: 'Tottenham Hotspur category artwork',
    relatedSlugs: ['liverpool', 'manchester-united', 'everton', 'premier-league'],
  },
  everton: {
    slug: 'everton',
    title: 'Everton Quiz — Test Your Toffees Knowledge',
    metadataTitle: 'Everton Quiz — Test Your Toffees Knowledge | QuizBall',
    description:
      'Free Everton quiz — 15 verified questions on the Toffees. Instant score, no sign-up needed to play. Then beat real fans in ranked football duels.',
    breadcrumbLabel: 'Everton Quiz',
    heroLead: 'Everton Quiz —',
    heroHighlight: 'Test Your Toffees Knowledge',
    lede:
      'Nil satis nisi optimum — nothing but the best is good enough. Prove you meet the standard with our free Everton quiz: 15 verified questions on Toffees history, Goodison legends and Merseyside derby drama. Instant score, no sign-up needed to play. Kick off below.',
    playHeading: 'Kick off the Everton quiz',
    aboutEyebrow: 'The story behind the questions',
    aboutHeading: 'About this Everton FC quiz',
    aboutParagraphs: [
      'Everton are one of English football’s founding giants — a club with more top-flight seasons than almost anyone, nine league championships, and a history that starts with the birth of the Football League itself in 1888. This everton fc quiz digs into all of it.',
      'Expect questions on Dixie Dean, whose 60 league goals in a single season may never be matched; Howard Kendall’s brilliant mid-80s side that won two titles and the European Cup Winners’ Cup; goalkeeping great Neville Southall; and the teenage Wayne Rooney moment that made the whole country sit up. Every question is drawn from QuizBall’s verified trivia bank — 15 per round, split into five easy, five medium and five hard.',
      'Play free above, no account needed, and get your score instantly. Anything less than a strong showing? Nothing but the best is good enough — replay for a fresh set, or sign up free and test your Toffees knowledge in live ranked duels against real fans, where every correct answer counts like a goal.',
    ],
    scoreTemplate:
      'You scored {score}/{total} — sign up free to save your score and defend it in a ranked duel.',
    footerCta:
      'Nothing but the best is good enough — prove your Everton knowledge in live duels.',
    heroImage: `${CATEGORY_IMAGE_BASE}/everton-v2.webp`,
    heroImageAlt: 'Everton FC category artwork',
    relatedSlugs: ['liverpool', 'manchester-united', 'tottenham', 'premier-league'],
  },
  'premier-league': {
    slug: 'premier-league',
    title: 'Premier League Football Quiz',
    metadataTitle: 'Premier League Football Quiz — Play Free | QuizBall',
    description:
      'Free Premier League football quiz — 15 verified questions on 30+ years of PL history. Instant score, no sign-up to play. Beat real fans in ranked duels.',
    breadcrumbLabel: 'Premier League Quiz',
    heroLead: 'Premier League',
    heroHighlight: 'Football Quiz',
    lede:
      'Three decades of drama, one quiz. Play our free Premier League football quiz — 15 verified questions covering title races, record-breakers, great escapes and 5000-1 miracles. No sign-up needed: answer, get your score instantly, and see how your PL knowledge stacks up against thousands of fans.',
    playHeading: 'Kick off the Premier League quiz',
    aboutEyebrow: 'Three decades of drama',
    aboutHeading: 'About this Premier League quiz',
    aboutParagraphs: [
      'Since 1992, the Premier League has produced more storylines than any competition in football: Blackburn’s 1995 title built on Shearer’s goals, Arsenal’s Invincibles going 38 games unbeaten, Agüerooooo in 93:20, Leicester defying 5000-1 odds, and Manchester City’s centurions redefining what a title-winning season looks like.',
      'This premier league football quiz takes 15 verified questions per round from QuizBall’s trivia bank — records, title races, iconic goals and the pub-quiz staples every fan should know, with a few curveballs for the anoraks. Every fact is checked, so if a question costs you a point, it’ll hold up when you double-check it.',
      'Play free above — no account needed, instant score, replay for a fresh set. When you’re warmed up, take it where it actually counts: sign up free and play ranked head-to-head trivia duels against real fans. Control possession by answering correctly, score goals, climb the leaderboard — QuizBall turns your Premier League knowledge into match results.',
    ],
    scoreTemplate:
      'You scored {score}/{total} — sign up free to save your score and defend it in a ranked duel.',
    footerCta:
      'Think your PL knowledge is title-winning? Prove it against real fans in ranked duels.',
    heroImage: `${CATEGORY_IMAGE_BASE}/premier-league-v2.webp`,
    heroImageAlt: 'Premier League category artwork',
    relatedSlugs: ['liverpool', 'manchester-united', 'tottenham', 'everton'],
  },
  'guess-the-player': {
    slug: 'guess-the-player',
    title: 'Guess the Player — Football Guess Who',
    metadataTitle: 'Guess the Player — Football Guess Who Quiz | QuizBall',
    description:
      'Play football guess who free — read the clues, guess the player in 15 rounds. Instant score, no sign-up to play. Then beat real fans in ranked duels.',
    breadcrumbLabel: 'Guess the Player',
    heroLead: 'Guess the Player —',
    heroHighlight: 'Football Guess Who',
    lede:
      'Football guess who, done properly. We give you the clues — nationality, clubs, iconic moments — you name the player. Fifteen rounds, verified facts, instant score, and no sign-up needed to play. Get them all and you’ve earned the right to call yourself a ball-knowledge merchant.',
    playHeading: 'Start the football guess who quiz',
    aboutEyebrow: 'Read the clues',
    aboutHeading: 'About football guess who',
    aboutParagraphs: [
      'Guess who football stars from their story — it’s the purest test of ball knowledge there is. No badges, no kits, just facts: where they were born, where they played, what they won, and the moments that made them famous.',
      'Our guess player football game gives you verified clues and four names to choose from. Fifteen rounds per game, drawn from QuizBall’s bank of checked football trivia covering legends and current stars alike — from Zidane’s genius and Messi’s Ballon d’Or collection to Haaland’s record-breaking arrival in England. The clues start generous; the wrong options are designed to make you think twice.',
      'Play free above with no account — your score appears instantly, and every replay pulls a fresh set of players. Reckon you can read a career faster than your mates? Sign up free and take the player guesser format into live ranked duels, where the quickest correct answer wins possession and your knowledge turns into goals.',
    ],
    scoreTemplate:
      'You guessed {score}/{total} — sign up free to save your score and take the guesser into ranked duels.',
    footerCta:
      'Read careers like a scout? Prove it against real fans in live trivia duels.',
    heroImage: `${CATEGORY_IMAGE_BASE}/guess-the-player-v2.webp`,
    heroImageAlt: 'Guess the Player category artwork',
    relatedSlugs: ['career-path', 'premier-league', 'club-badges'],
  },
  'career-path': {
    slug: 'career-path',
    title: 'Football Career Path Quiz',
    metadataTitle: 'Football Career Path Quiz — Guess the Player | QuizBall',
    description:
      'Guess the player from their career path — free quiz, 15 verified transfer trails. Instant score, no sign-up to play. Then beat real fans in ranked duels.',
    breadcrumbLabel: 'Career Path Quiz',
    heroLead: 'Football',
    heroHighlight: 'Career Path Quiz',
    lede:
      'Club by club, transfer by transfer — can you name the player from their career path alone? Fifteen verified transfer trails, from academy to final destination. Free to play, instant score, no sign-up needed. The ultimate guess-the-career-path challenge for proper football anoraks.',
    playHeading: 'Start the career path challenge',
    aboutEyebrow: 'Follow the transfer trail',
    aboutHeading: 'About the career path challenge',
    aboutParagraphs: [
      'A career path tells a story: the small club that spotted them, the transfer that made headlines, the late-career twist nobody predicted. This football career path quiz gives you the trail — you name the player.',
      'Every round shows a real transfer history, verified against QuizBall’s trivia bank, with four candidate names. Some paths give themselves away with one glance (there’s only one man whose journey runs through nine clubs and two spells at Milan). Others hinge on remembering where a superstar actually started — the Groningen years before Anfield, the Auxerre years before Old Trafford.',
      'You get 15 trails per round, free, no account needed, with your score shown instantly. Replay for a fresh set — the pool spans Premier League icons, world champions and cult heroes. And when you can read transfer trails like a sporting director, sign up free and bring that knowledge to ranked duels: live head-to-head trivia where the faster correct answer wins possession and puts you closer to goal.',
    ],
    scoreTemplate:
      'You read {score}/{total} careers correctly — sign up free to save your score and defend it in a ranked duel.',
    footerCta:
      'Know every transfer since the 90s? Put it on the line in live duels against real fans.',
    heroImage: `${CATEGORY_IMAGE_BASE}/career-path-v2.webp`,
    heroImageAlt: 'Football Career Path category artwork',
    relatedSlugs: ['guess-the-player', 'premier-league', 'liverpool'],
  },
  'club-badges': {
    slug: 'club-badges',
    title: 'Football Club Badges Quiz — Guess the Logo',
    metadataTitle: 'Football Club Badges Quiz — Guess the Logo | QuizBall',
    description:
      'Free football club badges quiz — guess the club from its crest. 15 verified questions, instant score, no sign-up to play. Beat real fans in duels.',
    breadcrumbLabel: 'Club Badges Quiz',
    heroLead: 'Football Club Badges Quiz —',
    heroHighlight: 'Guess the Logo',
    lede:
      'Every crest tells a story — liver birds, cockerels, cannons and towers. Our free football club badges quiz tests whether you can match the symbol to the club. Fifteen verified questions, instant score, no sign-up needed to play. How well do you really know your logos?',
    playHeading: 'Start the football badges quiz',
    aboutEyebrow: 'Every crest tells a story',
    aboutHeading: 'About this football logo quiz',
    aboutParagraphs: [
      'Club badges are football’s oldest storytelling: Liverpool’s liver bird lifted from the city’s coat of arms, Tottenham’s cockerel perched on a ball since the days of Harry Hotspur, Manchester City’s ship honouring the Manchester Ship Canal, and Everton’s crest built around Prince Rupert’s Tower — a real 18th-century lock-up that still stands today.',
      'This football club badges quiz asks you to match the symbol to the club: 15 verified questions per round, mixing Premier League giants with historic clubs whose crests any self-respecting fan should recognise. It’s harder than it sounds — plenty of lions, birds and castles to confuse the casuals.',
      'Play the football logo quiz free above, no account needed, and get your score instantly. Replay for a fresh set of badges from our larger pool. Once you can tell your seahorses from your hammers, sign up free and test that eye in live ranked duels against real fans — where every correct answer counts like a goal.',
    ],
    scoreTemplate:
      'You recognised {score}/{total} — sign up free to save your score and defend it in a ranked duel.',
    footerCta:
      'Know every crest in the country? Prove it against real fans in live duels.',
    heroImage: `${CATEGORY_IMAGE_BASE}/badges-and-logos-v2.webp`,
    heroImageAlt: 'Football badges and logos category artwork',
    relatedSlugs: ['premier-league', 'guess-the-player', 'career-path'],
  },
};

export const CAMPAIGN_QUIZ_SLUGS = Object.keys(CAMPAIGN_QUIZ_CONTENT);

export function getCampaignQuizContent(slug: string) {
  return CAMPAIGN_QUIZ_CONTENT[slug];
}
