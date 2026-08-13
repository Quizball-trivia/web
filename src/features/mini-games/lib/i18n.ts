"use client";

import { useCallback } from "react";
import { useLocale } from "@/contexts/LocaleContext";

/**
 * Lightweight EN→KA copy layer for the mini-game prototypes. Keys are the
 * English strings themselves (with {slot} placeholders); anything missing
 * from the dictionary falls back to the English key, so untranslated copy
 * renders unchanged rather than breaking.
 */
export type MiniLocale = "en" | "ka";

const KA: Record<string, string> = {
  // Shared
  "Prototype — virtual points only, no real money or rewards":
    "პროტოტიპი — მხოლოდ ვირტუალური ქულები, რეალური ფული ან ჯილდო არ არსებობს",
  "Points": "ქულები",
  "Play again": "თავიდან თამაში",
  "Try again": "სცადე თავიდან",
  "Next": "შემდეგი",
  "Back": "უკან",

  // Accumulator
  "Accumulator": "ექსპრესი",
  "Five legs. One stake. All must land.": "ხუთი პოზიცია. ერთი ფსონი. ყველა უნდა შევიდეს.",
  "Pick 5 legs · {n}/5": "აირჩიე 5 პოზიცია · {n}/5",
  "Continue · {odds}x": "გაგრძელება · {odds}x",
  "Potential return": "შესაძლო მოგება",
  "Your stake": "შენი ფსონი",
  "Place bet · {stake}": "დადე ფსონი · {stake}",
  "Back to legs": "პოზიციებზე დაბრუნება",
  "Return so far": "ამ დროისთვის მოგება",
  "4 of 5 landed!": "5-დან 4 შევიდა!",
  "Take the money or go for it?": "აიღებ ფულს თუ გარისკავ?",
  "One leg left. Cash out now, or risk it for the full {amount}.":
    "დარჩა ერთი პოზიცია. დააქეშაუთე ახლა, ან გარისკე სრული {amount}-სთვის.",
  "Cash out": "ქეშაუთი",
  "Final leg": "ბოლო პოზიცია",
  "Bet won!": "ფსონი მოგებულია!",
  "Busted on leg {n}": "ჩაიშალა მე-{n} პოზიციაზე",
  "Lost your {stake} stake — one leg let it down.": "დაკარგე {stake} ფსონი — ერთმა პოზიციამ ჩაშალა.",
  "New accumulator": "ახალი ექსპრესი",
  "if it lands:": "თუ შევა:",
  "{leg}/{total} legs": "{leg}/{total} პოზიცია",
  "Leg {n}": "პოზიცია {n}",

  // Bet Slip Booster
  "Answer right to boost your odds": "უპასუხე სწორად და გაზარდე კოეფიციენტი",
  "Bet Slip · Treble": "ტალონი · ტრებლი",
  "3 selections": "3 არჩევანი",
  "boosted": "გაზრდილი",
  "Total odds": "ჯამური კოეფიციენტი",
  "Boost leg {n} · {club}": "გაზარდე პოზიცია {n} · {club}",
  "Boosted {a} → {b}": "გაიზარდა {a} → {b}",
  "Stake {stake} · potential return": "ფსონი {stake} · შესაძლო მოგება",
  "Slip landed!": "ტალონი შევიდა!",
  "Not this time": "ამჯერად ვერა",
  "The boosted {odds}x didn't come in.": "გაზრდილი {odds}x ვერ შევიდა.",
  "New slip": "ახალი ტალონი",

  // Cash Out Ladder
  "Bank it or climb — one wrong answer wipes it all": "აიღე ან აძვერი — ერთი შეცდომა ყველაფერს შლის",
  "Stake": "ფსონი",
  "Wiped": "განულდა",
  "Banked": "აღებულია",
  "Pot at risk": "რისკის ქვეშ",
  "{mult}x on {stake}": "{mult}x {stake}-ზე",
  "Stake {stake} & climb": "დადე {stake} და აძვერი",
  "Bank {pot} now, or risk it for {next}?": "აიღებ {pot}-ს ახლა, თუ გარისკავ {next}-სთვის?",
  "Bank {pot}": "აიღე {pot}",
  "Climb to {mult}x": "აძვერი {mult}x-ზე",
  "Wiped!": "განულდა!",
  "Wrong answer at {mult}x — the whole pot is gone.": "არასწორი პასუხი {mult}x-ზე — მთელი ბანკი დაიკარგა.",
  "Banked {amount}": "აღებულია {amount}",
  "😱 It would have hit 32x!": "😱 32x-მდე ავიდოდა!",
  "Smart! You'd have busted at {mult}x.": "ჭკვიანურად! {mult}x-ზე ჩაიშლებოდი.",
  "It would've climbed to {a}x then busted at {b}x.": "{a}x-მდე ავიდოდა და {b}x-ზე ჩაიშლებოდა.",
  "Go again": "კიდევ ერთხელ",

  // Daily Jackpot
  "One hard question. Winner takes the pot.": "ერთი რთული კითხვა. გამარჯვებული იღებს ბანკს.",
  "Today's pot": "დღევანდელი ბანკი",
  "climbing with every miss…": "ყოველ შეცდომაზე იზრდება…",
  "failed today": "დღეს ვერ გატეხა",
  "next question": "შემდეგი კითხვა",
  "Hard · one attempt": "რთული · ერთი ცდა",
  "Rolled over": "გადავიდა",
  "Not this time — your entry fed the pot. It now sits at {pot}. Come back for the next question in {time}.":
    "ამჯერად ვერა — შენი ცდა ბანკს დაემატა. ახლა {pot}-ია. დაბრუნდი შემდეგ კითხვაზე {time}-ში.",
  "Replay": "თავიდან",
  "Jackpot won!": "ჯექპოტი მოგებულია!",
  "The pot resets for tomorrow's question.": "ბანკი ხვალინდელი კითხვისთვის განულდება.",

  // Half-Time Trivia
  "Live": "ლაივი",
  "Half-Time Quiz": "შესვენების ქვიზი",
  "Question {n} / {total}": "კითხვა {n} / {total}",
  "Get {n}+ for a free bet · {c} right": "უპასუხე {n}+ სწორად უფასო ფსონისთვის · {c} სწორია",
  "Free bet won!": "უფასო ფსონი მოგებულია!",
  "{c}/{total} — so close": "{c}/{total} — ცოტა დააკლდა",
  "You earned a virtual second-half free bet (demo — no real rewards).":
    "მოიგე მეორე ტაიმის ვირტუალური უფასო ფსონი (დემო — რეალური ჯილდო არ არის).",
  "Get {n}+ right before kickoff to earn a free bet.":
    "უპასუხე {n}+ კითხვას სწორად მეორე ტაიმის დაწყებამდე უფასო ფსონისთვის.",
  "Markets": "მარკეტები",
  "Odds are illustrative · prototype": "კოეფიციენტები საილუსტრაციოა · პროტოტიპი",
  "Prototype — virtual only": "პროტოტიპი — მხოლოდ ვირტუალური",

  // Odds Board
  "Odds Board": "კოეფიციენტების დაფა",
  "Every answer is a market — back your call": "ყველა პასუხი მარკეტია — დაუჭირე მხარი შენსას",
  "Market {n}": "მარკეტი {n}",
  "{pct}% implied": "{pct}% ალბათობა",
  "returns": "მოგება",
  "Pick an answer to back": "აირჩიე პასუხი ფსონისთვის",
  "Place {stake} on {answer}": "დადე {stake} — {answer}",
  "Won {amount}!": "მოგებულია {amount}!",
  "Lost {amount}": "წაგებულია {amount}",
  "Big-odds call!": "დიდი კოეფიციენტის სვლა!",
  "Right answer:": "სწორი პასუხი:",
  "Next market": "შემდეგი მარკეტი",

  // Pass Chain
  "Pass Chain": "პასების ჯაჭვი",
  "Link the two players through shared clubs": "დააკავშირე ორი ფეხბურთელი საერთო კლუბებით",
  "Fewer links score higher": "ნაკლები რგოლი მეტ ქულას იძლევა",
  "Par —": "პარი —",
  "Par {par} links": "პარი {par} რგოლი",
  "Who links to {name}?": "ვინ უკავშირდება {name}-ს?",
  "Add": "დამატება",
  "Already in the chain": "უკვე ჯაჭვშია",
  "Unknown player — try another": "უცნობი ფეხბურთელი — სცადე სხვა",
  "{a} never played with {b}": "{a}-ს არ უთამაშია {b}-სთან",
  "Reset": "განულება",
  "Linked!": "დაკავშირდა!",
  "{n} links": "{n} რგოლი",
  "Par — perfect!": "პარი — იდეალური!",
  "par {n}": "პარი {n}",
  "Next chain": "შემდეგი ჯაჭვი",
  "START": "სტარტი",
  "TARGET": "მიზანი",

  // Penalty Shootout
  "Penalty Shootout": "პენალტების სერია",
  "Round {n} / {total}": "რაუნდი {n} / {total}",
  "You · AI": "შენ · AI",
  "Answer to earn your shot": "უპასუხე და მოიგე დარტყმა",
  "Opponent is stepping up…": "მოწინააღმდეგე ემზადება…",
  "AI is on target — get ready to dive!": "AI ზუსტია — მოემზადე დასაჭერად!",
  "AI answering…": "AI პასუხობს…",
  "Pick your corner — beat the keeper": "აირჩიე კუთხე — აჯობე მეკარეს",
  "You're in goal — pick your dive!": "შენ კარში ხარ — აირჩიე მხარე!",
  "GOAL!": "გოლი!",
  "MISSED": "აცდენა",
  "AI SCORES": "AI-მ გაიტანა",
  "SAVED!": "დაჭერილია!",
  "Opponent's turn": "მოწინააღმდეგის ჯერი",
  "See result": "შედეგის ნახვა",
  "Next round": "შემდეგი რაუნდი",
  "You win!": "მოიგე!",
  "Draw": "ფრე",
  "You lose": "წააგე",

  // Squad Collection
  "Squad Collection": "გუნდის კოლექცია",
  "Answer to pull cards. Build your XI.": "უპასუხე, ამოიღე ბარათები და ააწყვე შენი 11-ეული.",
  "Squad": "შემადგენლობა",
  "Answer to earn a pack": "უპასუხე და მოიგე პაკეტი",
  "Tap to open": "დააჭირე გასახსნელად",
  "Add to squad": "შემადგენლობაში დამატება",
  "Squad complete!": "შემადგენლობა სრულია!",
  "Reward: +2,000 🪙": "ჯილდო: +2,000 🪙",
  "Start a new squad": "ახალი შემადგენლობა",
  "Bronze": "ბრინჯაო",
  "Silver": "ვერცხლი",
  "Gold": "ოქრო",
  "Special": "სპეციალური",

  // Squad Spin
  "Easy": "მარტივი",
  "Hard": "რთული",
  "Expert": "ექსპერტი",
  "Name a player who fits every reel": "დაასახელე ფეხბურთელი, რომელიც ყველა უჯრას ერგება",
  "{n} reels": "{n} უჯრა",
  "Spin": "დატრიალება",
  "Spinning…": "ტრიალებს…",
  "Name a player…": "დაასახელე ფეხბურთელი…",
  "Go": "გო",
  "Hold a reel, respin the rest": "დააფიქსირე უჯრა და დაატრიალე დანარჩენი",
  "Respin −{n}": "თავიდან დატრიალება −{n}",
  "Last 3 spins": "ბოლო 3 დატრიალება",
  "Missed": "აცდენა",
  "Correct!": "სწორია!",
  "Only {pct}% named this": "ეს მხოლოდ {pct}%-მა დაასახელა",
  "rarity": "იშვიათობა",
  "Time's up": "დრო ამოიწურა",
  "You could've said:": "შეგეძლო გეთქვა:",
  "No valid player for that combo!": "ამ კომბინაციაზე ფეხბურთელი არ არსებობს!",
  "Spin again": "კიდევ დაატრიალე",
  "Hold reel": "უჯრის დაფიქსირება",
  "Release reel": "უჯრის გათავისუფლება",
  "Club": "კლუბი",
  "Position": "პოზიცია",
  "Nation": "ქვეყანა",
  "Era": "ეპოქა",
  "Trophy": "თასი",

  // Trivia Spin
  "easy": "მარტივი",
  "medium": "საშუალო",
  "hard": "რთული",
  "Answer to earn spins — the wheel pays out": "უპასუხე, მოაგროვე დატრიალებები — ბორბალი გადაიხდის",
  "Coins": "ქოინები",
  "Question {n}": "კითხვა {n}",
  "+1 spin earned": "+1 დატრიალება მოგებულია",
  "No spin — try the next one": "დატრიალება ვერ მოიგე — სცადე შემდეგი",
  "{n} spins available": "{n} დატრიალება გაქვს",
  "JACKPOT!": "ჯექპოტი!",
  "Spin the wheel": "დაატრიალე ბორბალი",
  "Answer to earn a spin": "უპასუხე დატრიალების მოსაგებად",

  // Data labels (fixtures / bet slip picks) — rendered through t() at the
  // component level, keyed by their English data values.
  "Full Time Result": "მატჩის შედეგი",
  "Next Goal": "შემდეგი გოლი",
  "Total Goals Over/Under 3.5": "გოლების ჯამი 3.5 მეტი/ნაკლები",
  "Both Teams to Score — 2nd Half": "ორივე გაიტანს — მეორე ტაიმი",
  "No more goals": "გოლი აღარ იქნება",
  "Over 3.5": "3.5-ზე მეტი",
  "Under 3.5": "3.5-ზე ნაკლები",
  "Yes": "კი",
  "No": "არა",
  "Champions League · Group Stage": "ჩემპიონთა ლიგა · ჯგუფური ეტაპი",
  "Real Madrid to win": "რეალის მოგება",
  "Man City to win": "მან სიტის მოგება",
  "Bayern to win": "ბაიერნის მოგება",
  "Goalkeeper": "მეკარე",
  "Defender": "მცველი",
  "Midfielder": "ნახევარმცველი",
  "Forward": "თავდამსხმელი",
  "World Cup": "მსოფლიო თასი",
  "League": "ლიგა",
  "Champions League": "ჩემპიონთა ლიგა",
  "League Title": "ჩემპიონობა",
};

export function useMiniLocale(): MiniLocale {
  const { locale } = useLocale();
  return locale === "ka" ? "ka" : "en";
}

/** t('Question {n} / {total}', { n: 1, total: 5 }) — EN key, {slot} substitution. */
export function useMiniT() {
  const locale = useMiniLocale();
  return useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let out = locale === "ka" ? (KA[key] ?? key) : key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          out = out.split(`{${k}}`).join(String(v));
        }
      }
      return out;
    },
    [locale],
  );
}
