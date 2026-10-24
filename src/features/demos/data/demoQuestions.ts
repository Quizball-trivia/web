import type { GameQuestion } from "@/lib/domain";
import type { Locale } from "@/lib/i18n/messages";
import { getI18nText } from "@/lib/utils/i18n";

type DemoI18nText = { en: string; ka: string; es?: string; pt?: string; de?: string; tr?: string };

export interface DemoQuestion {
  id: string;
  difficulty: "easy" | "medium" | "hard";
  category: DemoI18nText;
  prompt: DemoI18nText;
  options: DemoI18nText[];
  correctIndex: number;
}

export const DEMO_QUESTIONS: DemoQuestion[] = [
  {
    id: "demo-q-01",
    difficulty: "medium",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი", es: "Copa Mundial", pt: "Copa do Mundo", de: "WM", tr: "Dünya Kupası" },
    prompt: { en: "Which German teammate provided the cross for Götze's 2014 World Cup-winning goal?", ka: "რომელმა გერმანელმა თანაგუნდელმა ჩააწოდა გიოტცეს 2014 წლის მსოფლიო ჩემპიონატის მომგები გოლის დროს?", es: "¿Qué compañero alemán dio el centro para el gol de Götze que dio la victoria en el Mundial de 2014?", pt: "Qual companheiro alemão fez o cruzamento para o gol de Götze que garantiu o título da Copa do Mundo de 2014?", de: "Welcher deutsche Mitspieler schlug die Flanke zu Götzes Siegtor im WM-Finale 2014?", tr: "Götze'nin 2014 Dünya Kupası'nı getiren golünde asist yapan Alman takım arkadaşı kimdi?" },
    options: [
      { en: "Thomas Müller", ka: "თომას მიულერი", es: "Thomas Müller", pt: "Thomas Müller", de: "Thomas Müller", tr: "Thomas Müller" },
      { en: "Toni Kroos", ka: "ტონი კროოსი", es: "Toni Kroos", pt: "Toni Kroos", de: "Toni Kroos", tr: "Toni Kroos" },
      { en: "Mesut Özil", ka: "მესუთ ოზილი", es: "Mesut Özil", pt: "Mesut Özil", de: "Mesut Özil", tr: "Mesut Özil" },
      { en: "André Schürrle", ka: "ანდრე შიურლე", es: "André Schürrle", pt: "André Schürrle", de: "André Schürrle", tr: "André Schürrle" },
    ],
    correctIndex: 3,
  },
  {
    id: "demo-q-02",
    difficulty: "medium",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი", es: "Copa Mundial", pt: "Copa do Mundo", de: "WM", tr: "Dünya Kupası" },
    prompt: { en: "Which Bundesliga team conceded Lewandowski's historic five goals in nine minutes in 2015?", ka: "ბუნდესლიგის რომელმა გუნდმა გაუშვა ლევანდოვსკის ისტორიული ხუთი გოლი ცხრა წუთში 2015 წელს?", es: "¿Qué equipo de la Bundesliga encajó los cinco goles históricos de Lewandowski en nueve minutos en 2015?", pt: "Qual time da Bundesliga sofreu os cinco gols históricos de Lewandowski em nove minutos, em 2015?", de: "Welches Bundesliga-Team kassierte 2015 Lewandowskis historische fünf Tore in neun Minuten?", tr: "Lewandowski'nin 2015'te dokuz dakikada attığı tarihi beş golü hangi Bundesliga takımı yedi?" },
    options: [
      { en: "Borussia Dortmund", ka: "დორტმუნდის ბორუსია", es: "Borussia Dortmund", pt: "Borussia Dortmund", de: "Borussia Dortmund", tr: "Borussia Dortmund" },
      { en: "Schalke 04", ka: "შალკე 04", es: "Schalke 04", pt: "Schalke 04", de: "Schalke 04", tr: "Schalke 04" },
      { en: "Bayer Leverkusen", ka: "ბაიერ ლევერკუზენი", es: "Bayer Leverkusen", pt: "Bayer Leverkusen", de: "Bayer Leverkusen", tr: "Bayer Leverkusen" },
      { en: "Wolfsburg", ka: "ვოლფსბურგი", es: "Wolfsburgo", pt: "Wolfsburg", de: "Wolfsburg", tr: "Wolfsburg" },
    ],
    correctIndex: 3,
  },
  {
    id: "demo-q-03",
    difficulty: "medium",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი", es: "Copa Mundial", pt: "Copa do Mundo", de: "WM", tr: "Dünya Kupası" },
    prompt: { en: "Which Italian defender was bitten by Suárez at the 2014 World Cup?", ka: "რომელ იტალიელ მცველს უკბინა სუარესმა 2014 წლის მსოფლიო ჩემპიონატზე?", es: "¿Qué defensa italiano fue mordido por Suárez en el Mundial de 2014?", pt: "Qual zagueiro italiano foi mordido por Suárez durante a Copa do Mundo de 2014?", de: "Welchen italienischen Verteidiger biss Suárez bei der WM 2014?", tr: "2014 Dünya Kupası'nda Suárez'in ısırdığı İtalyan defans oyuncusu kimdi?" },
    options: [
      { en: "Leonardo Bonucci", ka: "ლეონარდო ბონუჩი", es: "Leonardo Bonucci", pt: "Leonardo Bonucci", de: "Leonardo Bonucci", tr: "Leonardo Bonucci" },
      { en: "Andrea Barzagli", ka: "ანდრეა ბარძალი", es: "Andrea Barzagli", pt: "Andrea Barzagli", de: "Andrea Barzagli", tr: "Andrea Barzagli" },
      { en: "Giorgio Chiellini", ka: "ჯორჯო კიელინი", es: "Giorgio Chiellini", pt: "Giorgio Chiellini", de: "Giorgio Chiellini", tr: "Giorgio Chiellini" },
      { en: "Claudio Marchisio", ka: "კლაუდიო მარკიზიო", es: "Claudio Marchisio", pt: "Claudio Marchisio", de: "Claudio Marchisio", tr: "Claudio Marchisio" },
    ],
    correctIndex: 2,
  },
  {
    id: "demo-q-04",
    difficulty: "medium",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი", es: "Copa Mundial", pt: "Copa do Mundo", de: "WM", tr: "Dünya Kupası" },
    prompt: { en: "Who provided the high cross that Zinedine Zidane volleyed in the 2002 Champions League final?", ka: "ვინ ჩააწოდა ბურთი, რომელიც ზინედინ ზიდანმა 2002 წლის ჩემპიონთა ლიგის ფინალში პირდაპირ დარტყმით გაიტანა?", es: "¿Quién dio el centro alto que Zinedine Zidane voleó en la final de la Champions League de 2002?", pt: "Quem fez o cruzamento alto que Zinedine Zidane acertou de voleio na final da Champions League de 2002?", de: "Wer schlug die hohe Flanke, die Zinedine Zidane im Finale der Champions League 2002 volley nahm?", tr: "2002 Şampiyonlar Ligi finalinde Zinedine Zidane'ın voleyle attığı golün ortasını kim yaptı?" },
    options: [
      { en: "Luís Figo", ka: "ლუიშ ფიგუ", es: "Luís Figo", pt: "Luís Figo", de: "Luís Figo", tr: "Luís Figo" },
      { en: "Roberto Carlos", ka: "რობერტო კარლოსი", es: "Roberto Carlos", pt: "Roberto Carlos", de: "Roberto Carlos", tr: "Roberto Carlos" },
      { en: "Santiago Solari", ka: "სანტიაგო სოლარი", es: "Santiago Solari", pt: "Santiago Solari", de: "Santiago Solari", tr: "Santiago Solari" },
      { en: "Míchel Salgado", ka: "მიჩელ სალგადო", es: "Míchel Salgado", pt: "Míchel Salgado", de: "Míchel Salgado", tr: "Míchel Salgado" },
    ],
    correctIndex: 1,
  },
  {
    id: "demo-q-05",
    difficulty: "medium",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი", es: "Copa Mundial", pt: "Copa do Mundo", de: "WM", tr: "Dünya Kupası" },
    prompt: { en: "Against which national team did René Higuita execute his legendary scorpion kick in 1995?", ka: "რომელი ნაკრების წინააღმდეგ შეასრულა რენე იგიტამ თავისი ლეგენდარული „მორიელის დარტყმა“ 1995 წელს?", es: "¿Contra qué selección nacional ejecutó René Higuita su legendario escorpión en 1995?", pt: "Contra qual seleção René Higuita fez sua lendária defesa do escorpião em 1995?", de: "Gegen welche Nationalmannschaft zeigte René Higuita 1995 seinen legendären Skorpion-Kick?", tr: "René Higuita, 1995'te efsanevi akrep vuruşunu hangi milli takıma karşı yaptı?" },
    options: [
      { en: "Brazil", ka: "ბრაზილია", es: "Brasil", pt: "Brasil", de: "Brasilien", tr: "Brezilya" },
      { en: "Germany", ka: "გერმანია", es: "Alemania", pt: "Alemanha", de: "Deutschland", tr: "Almanya" },
      { en: "England", ka: "ინგლისი", es: "Inglaterra", pt: "Inglaterra", de: "England", tr: "İngiltere" },
      { en: "Italy", ka: "იტალია", es: "Italia", pt: "Itália", de: "Italien", tr: "İtalya" },
    ],
    correctIndex: 2,
  },
  {
    id: "demo-q-06",
    difficulty: "medium",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი", es: "Copa Mundial", pt: "Copa do Mundo", de: "WM", tr: "Dünya Kupası" },
    prompt: { en: "Which Manchester United teammate provided the cross for Wayne Rooney's legendary 2011 bicycle kick?", ka: "მანჩესტერ იუნაიტედის რომელმა თანაგუნდელმა ჩააწოდა უეინ რუნის 2011 წლის ლეგენდარული მაკრატელა დარტყმის დროს?", es: "¿Qué compañero del Manchester United proporcionó el centro para la legendaria chilena de Wayne Rooney en 2011?", pt: "Qual companheiro de time do Manchester United fez o cruzamento para o lendário gol de bicicleta de Wayne Rooney em 2011?", de: "Welcher Mitspieler von Manchester United flankte zu Wayne Rooneys legendärem Fallrückzieher 2011?", tr: "Wayne Rooney'nin 2011'deki efsanevi röveşata golü için ortayı hangi Manchester Unitedlı takım arkadaşı yaptı?" },
    options: [
      { en: "Ryan Giggs", ka: "რაიან გიგზი", es: "Ryan Giggs", pt: "Ryan Giggs", de: "Ryan Giggs", tr: "Ryan Giggs" },
      { en: "Paul Scholes", ka: "პოლ სქოულზი", es: "Paul Scholes", pt: "Paul Scholes", de: "Paul Scholes", tr: "Paul Scholes" },
      { en: "Nani", ka: "ნანი", es: "Nani", pt: "Nani", de: "Nani", tr: "Nani" },
      { en: "Antonio Valencia", ka: "ანტონიო ვალენსია", es: "Antonio Valencia", pt: "Antonio Valencia", de: "Antonio Valencia", tr: "Antonio Valencia" },
    ],
    correctIndex: 2,
  },
  {
    id: "demo-q-07",
    difficulty: "easy",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი", es: "Copa Mundial", pt: "Copa do Mundo", de: "WM", tr: "Dünya Kupası" },
    prompt: { en: "Who is the all-time top scorer in the UEFA Champions League?", ka: "ვინ არის უეფა-ს ჩემპიონთა ლიგის ყველა დროის საუკეთესო ბომბარდირი?", es: "¿Quién es el máximo goleador de todos los tiempos en la UEFA Champions League?", pt: "Quem é o maior artilheiro da história da UEFA Champions League?", de: "Wer ist der Rekordtorschütze der UEFA Champions League?", tr: "UEFA Şampiyonlar Ligi'nin tüm zamanlardaki en golcü oyuncusu kimdir?" },
    options: [
      { en: "Lionel Messi", ka: "ლიონელ მესი", es: "Lionel Messi", pt: "Lionel Messi", de: "Lionel Messi", tr: "Lionel Messi" },
      { en: "Cristiano Ronaldo", ka: "კრიშტიანუ რონალდუ", es: "Cristiano Ronaldo", pt: "Cristiano Ronaldo", de: "Cristiano Ronaldo", tr: "Cristiano Ronaldo" },
      { en: "Robert Lewandowski", ka: "რობერტ ლევანდოვსკი", es: "Robert Lewandowski", pt: "Robert Lewandowski", de: "Robert Lewandowski", tr: "Robert Lewandowski" },
      { en: "Karim Benzema", ka: "კარიმ ბენზემა", es: "Karim Benzema", pt: "Karim Benzema", de: "Karim Benzema", tr: "Karim Benzema" },
    ],
    correctIndex: 1,
  },
  {
    id: "demo-q-08",
    difficulty: "medium",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი", es: "Copa Mundial", pt: "Copa do Mundo", de: "WM", tr: "Dünya Kupası" },
    prompt: { en: "Which country won the first ever FIFA World Cup in 1930?", ka: "რომელმა ქვეყანამ მოიგო პირველი ფიფა-ს მსოფლიო ჩემპიონატი 1930 წელს?", es: "¿Qué país ganó la primera Copa Mundial de la FIFA en 1930?", pt: "Qual país venceu a primeira Copa do Mundo da FIFA, em 1930?", de: "Welches Land gewann 1930 die erste FIFA-WM?", tr: "İlk FIFA Dünya Kupası'nı 1930'da hangi ülke kazandı?" },
    options: [
      { en: "Brazil", ka: "ბრაზილია", es: "Brasil", pt: "Brasil", de: "Brasilien", tr: "Brezilya" },
      { en: "Argentina", ka: "არგენტინა", es: "Argentina", pt: "Argentina", de: "Argentinien", tr: "Arjantin" },
      { en: "Italy", ka: "იტალია", es: "Italia", pt: "Itália", de: "Italien", tr: "İtalya" },
      { en: "Uruguay", ka: "ურუგვაი", es: "Uruguay", pt: "Uruguay", de: "Uruguay", tr: "Uruguay" },
    ],
    correctIndex: 3,
  },
  {
    id: "demo-q-09",
    difficulty: "easy",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი", es: "Copa Mundial", pt: "Copa do Mundo", de: "WM", tr: "Dünya Kupası" },
    prompt: { en: "Which player holds the record for the most goals in a single calendar year (91 goals in 2012)?", ka: "რომელი მოთამაშე ფლობს რეკორდს ერთ კალენდარულ წელიწადში გატანილი ყველაზე მეტი გოლით (91 გოლი 2012 წელს)?", es: "¿Qué jugador ostenta el récord de más goles en un solo año natural (91 goles en 2012)?", pt: "Qual jogador detém o recorde de mais gols em um único ano-calendário (91 gols em 2012)?", de: "Welcher Spieler hält den Rekord für die meisten Tore in einem Kalenderjahr (91 Tore im Jahr 2012)?", tr: "Tek bir takvim yılında en çok gol atma rekorunu (2012'de 91 gol) hangi oyuncu elinde tutuyor?" },
    options: [
      { en: "Cristiano Ronaldo", ka: "კრიშტიანუ რონალდუ", es: "Cristiano Ronaldo", pt: "Cristiano Ronaldo", de: "Cristiano Ronaldo", tr: "Cristiano Ronaldo" },
      { en: "Pelé", ka: "პელე", es: "Pelé", pt: "Pelé", de: "Pelé", tr: "Pelé" },
      { en: "Gerd Müller", ka: "გერდ მიულერი", es: "Gerd Müller", pt: "Gerd Müller", de: "Gerd Müller", tr: "Gerd Müller" },
      { en: "Lionel Messi", ka: "ლიონელ მესი", es: "Lionel Messi", pt: "Lionel Messi", de: "Lionel Messi", tr: "Lionel Messi" },
    ],
    correctIndex: 3,
  },
  {
    id: "demo-q-10",
    difficulty: "medium",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი", es: "Copa Mundial", pt: "Copa do Mundo", de: "WM", tr: "Dünya Kupası" },
    prompt: { en: "What is the nickname of the Italian club Juventus?", ka: "რა არის იტალიური კლუბის, იუვენტუსის მეტსახელი?", es: "¿Cuál es el apodo del club italiano Juventus?", pt: "Qual é o apelido do clube italiano Juventus?", de: "Wie lautet der Spitzname des italienischen Vereins Juventus?", tr: "İtalyan kulübü Juventus'un lakabı nedir?" },
    options: [
      { en: "The Old Lady", ka: "ბებერი ქალბატონი", es: "La Vieja Señora", pt: "A Velha Senhora", de: "Die Alte Dame", tr: "Yaşlı Hanımefendi" },
      { en: "The Red Devils", ka: "წითელი ეშმაკები", es: "Los Diablos Rojos", pt: "Os Diabos Vermelhos", de: "Die Roten Teufel", tr: "Kırmızı Şeytanlar" },
      { en: "The Flying Donkeys", ka: "მფრინავი ვირები", es: "Los Burros Voladores", pt: "Os Burros Voadores", de: "Die fliegenden Esel", tr: "Uçan Eşekler" },
      { en: "The Eagles", ka: "არწივები", es: "Las Águilas", pt: "As Águias", de: "Die Adler", tr: "The Eagles" },
    ],
    correctIndex: 0,
  },
  {
    id: "demo-q-11",
    difficulty: "easy",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი", es: "Copa Mundial", pt: "Copa do Mundo", de: "WM", tr: "Dünya Kupası" },
    prompt: { en: "Which English club is famously known as \"The Invincibles\" for going undefeated during the 2003-04 Premier League season?", ka: "რომელი ინგლისური კლუბია ცნობილი როგორც „უძლეველები“ 2003-04 წლების პრემიერ ლიგის სეზონში დაუმარცხებლად ასპარეზობის გამო?", es: "¿Qué club inglés es conocido como \"Los Invencibles\" por acabar invicto la temporada 2003-04 de la Premier League?", pt: "Qual clube inglês é conhecido como \"Os Invencíveis\" por ter terminado invicto a temporada 2003-04 da Premier League?", de: "Welcher englische Verein ist als „Die Unbesiegbaren“ bekannt, weil er die Premier-League-Saison 2003/04 ungeschlagen beendete?", tr: "Hangi İngiliz kulübü 2003-04 Premier Lig sezonunu yenilgisiz tamamladığı için \"Yenilmezler\" olarak bilinir?" },
    options: [
      { en: "Manchester United", ka: "მანჩესტერ იუნაიტედი", es: "Manchester United", pt: "Manchester United", de: "Manchester United", tr: "Manchester United" },
      { en: "Chelsea", ka: "ჩელსი", es: "Chelsea", pt: "Chelsea", de: "Chelsea", tr: "Chelsea" },
      { en: "Arsenal", ka: "არსენალი", es: "Arsenal", pt: "Arsenal", de: "Arsenal", tr: "Arsenal" },
      { en: "Liverpool", ka: "ლივერპული", es: "Liverpool", pt: "Liverpool", de: "Liverpool", tr: "Liverpool" },
    ],
    correctIndex: 2,
  },
  {
    id: "demo-q-12",
    difficulty: "medium",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი", es: "Copa Mundial", pt: "Copa do Mundo", de: "WM", tr: "Dünya Kupası" },
    prompt: { en: "Which African nation was the first to reach the semi-finals of a Men's World Cup?", ka: "რომელი აფრიკული ქვეყანა გახდა პირველი, რომელმაც მამაკაცთა მსოფლიო ჩემპიონატის ნახევარფინალს მიაღწია?", es: "¿Qué nación africana fue la primera en alcanzar las semifinales de una Copa Mundial masculina?", pt: "Qual seleção africana foi a primeira a chegar às semifinais de uma Copa do Mundo masculina?", de: "Welche afrikanische Nationalmannschaft erreichte als erste das Halbfinale einer Männer-WM?", tr: "Erkekler Dünya Kupası'nda yarı finale yükselen ilk Afrika ülkesi hangisiydi?" },
    options: [
      { en: "Ghana", ka: "განა", es: "Ghana", pt: "Ghana", de: "Ghana", tr: "Gana" },
      { en: "Senegal", ka: "სენეგალი", es: "Senegal", pt: "Senegal", de: "Senegal", tr: "Senegal" },
      { en: "Cameroon", ka: "კამერუნი", es: "Camerún", pt: "Camarões", de: "Kamerun", tr: "Kamerun" },
      { en: "Morocco", ka: "მაროკო", es: "Marruecos", pt: "Marrocos", de: "Marokko", tr: "Fas" },
    ],
    correctIndex: 3,
  },
  {
    id: "demo-q-13",
    difficulty: "medium",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი", es: "Copa Mundial", pt: "Copa do Mundo", de: "WM", tr: "Dünya Kupası" },
    prompt: { en: "Which player won the Ballon d'Or in 2018, temporarily breaking the Messi-Ronaldo duopoly?", ka: "რომელმა მოთამაშემ მოიგო ოქროს ბურთი 2018 წელს, რითაც დროებით დაარღვია მესი-რონალდუს დუოპოლია?", es: "¿Qué jugador ganó el Balón de Oro en 2018, rompiendo temporalmente el duopolio Messi-Ronaldo?", pt: "Qual jogador ganhou a Bola de Ouro em 2018, interrompendo temporariamente o duopólio Messi-Ronaldo?", de: "Welcher Spieler gewann 2018 den Ballon d’Or und durchbrach damit vorübergehend die Dominanz von Messi und Ronaldo?", tr: "2018'de Messi-Ronaldo düopolosuna geçici olarak ara vererek Ballon d'Or'u hangi oyuncu kazandı?" },
    options: [
      { en: "Antoine Griezmann", ka: "ანტუან გრიზმანი", es: "Antoine Griezmann", pt: "Antoine Griezmann", de: "Antoine Griezmann", tr: "Antoine Griezmann" },
      { en: "Luka Modrić", ka: "ლუკა მოდრიჩი", es: "Luka Modrić", pt: "Luka Modrić", de: "Luka Modrić", tr: "Luka Modrić" },
      { en: "Virgil van Dijk", ka: "ვირჯილ ვან დაიკი", es: "Virgil van Dijk", pt: "Virgil van Dijk", de: "Virgil van Dijk", tr: "Virgil van Dijk" },
      { en: "Neymar", ka: "ნეიმარი", es: "Neymar", pt: "Neymar", de: "Neymar", tr: "Neymar" },
    ],
    correctIndex: 1,
  },
  {
    id: "demo-q-14",
    difficulty: "hard",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი", es: "Copa Mundial", pt: "Copa do Mundo", de: "WM", tr: "Dünya Kupası" },
    prompt: { en: "Which player holds the record for the fastest hat-trick in Premier League history (2 minutes 56 seconds)?", ka: "რომელი მოთამაშე ფლობს პრემიერ ლიგის ისტორიაში ყველაზე სწრაფი ჰეთ-თრიქის რეკორდს (2 წუთი და 56 წამი)?", es: "¿Qué jugador ostenta el récord del hat-trick más rápido en la historia de la Premier League (2 minutos y 56 segundos)?", pt: "Qual jogador detém o recorde de hat-trick mais rápido da história da Premier League (2 minutos e 56 segundos)?", de: "Welcher Spieler hält den Rekord für den schnellsten Hattrick der Premier-League-Geschichte (2 Minuten 56 Sekunden)?", tr: "Premier League tarihinin en hızlı hat-trick rekorunu (2 dakika 56 saniye) hangi oyuncu elinde tutuyor?" },
    options: [
      { en: "Robbie Fowler", ka: "რობი ფაულერი", es: "Robbie Fowler", pt: "Robbie Fowler", de: "Robbie Fowler", tr: "Robbie Fowler" },
      { en: "Sergio Agüero", ka: "სერხიო აგუერო", es: "Sergio Agüero", pt: "Sergio Agüero", de: "Sergio Agüero", tr: "Sergio Agüero" },
      { en: "Thierry Henry", ka: "ტიერი ანრი", es: "Thierry Henry", pt: "Thierry Henry", de: "Thierry Henry", tr: "Thierry Henry" },
      { en: "Sadio Mané", ka: "სადიო მანე", es: "Sadio Mané", pt: "Sadio Mané", de: "Sadio Mané", tr: "Sadio Mané" },
    ],
    correctIndex: 3,
  },
  {
    id: "demo-q-15",
    difficulty: "hard",
    category: { en: "World Cup", ka: "მსოფლიო ჩემპიონატი", es: "Copa Mundial", pt: "Copa do Mundo", de: "WM", tr: "Dünya Kupası" },
    prompt: { en: "Who is the only goalkeeper in history to win the Ballon d'Or?", ka: "ვინ არის ისტორიაში ერთადერთი მეკარე, რომელმაც ოქროს ბურთი მოიგო?", es: "¿Quién es el único portero en la historia que ha ganado el Balón de Oro?", pt: "Quem é o único goleiro da história a ganhar a Bola de Ouro?", de: "Wer ist der einzige Torwart, der je den Ballon d’Or gewonnen hat?", tr: "Tarihte Ballon d'Or kazanan tek kaleci kimdir?" },
    options: [
      { en: "Gianluigi Buffon", ka: "ჯანლუიჯი ბუფონი", es: "Gianluigi Buffon", pt: "Gianluigi Buffon", de: "Gianluigi Buffon", tr: "Gianluigi Buffon" },
      { en: "Iker Casillas", ka: "იკერ კასილასი", es: "Iker Casillas", pt: "Iker Casillas", de: "Iker Casillas", tr: "Iker Casillas" },
      { en: "Lev Yashin", ka: "ლევ იაშინი", es: "Lev Yashin", pt: "Lev Yashin", de: "Lev Yashin", tr: "Lev Yashin" },
      { en: "Oliver Kahn", ka: "ოლივერ კანი", es: "Oliver Kahn", pt: "Oliver Kahn", de: "Oliver Kahn", tr: "Oliver Kahn" },
    ],
    correctIndex: 2,
  },
];

export function getDemoGameQuestions(locale: Locale): GameQuestion[] {
  return DEMO_QUESTIONS.map((q) => ({
    id: q.id,
    prompt: getI18nText(q.prompt, locale),
    options: q.options.map((option) => getI18nText(option, locale)),
    correctIndex: q.correctIndex,
    categoryName: getI18nText(q.category, locale),
    difficulty: q.difficulty,
  }));
}
