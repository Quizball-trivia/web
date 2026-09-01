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
  // Guess the Goal (live)
  "Guess the Goal": "გამოიცანი გოლი",
  "Name the iconic goal — real rewards, server-scored": "ამოიცანი ლეგენდარული გოლი — რეალური ჯილდოები",
  "Solved {n}/{total}": "ამოცნობილი {n}/{total}",
  "Answer now · +{points}": "უპასუხე ახლა · +{points}",
  "+{points} points": "+{points} ქულა",
  "Move {n}/{total}": "სვლა {n}/{total}",
  "Which goal is this?": "რომელი გოლია ეს?",
  "Bonus question": "ბონუს კითხვა",
  "Next goal": "შემდეგი გოლი",
  "Guess the Goal is warming up — check back soon": "გამოიცანი გოლი მალე ჩაირთვება — შემოიარე ცოტა ხანში",
  "A legendary goal replays on the coaching board. The earlier you name it, the more you earn — first solve of each goal pays coins and XP.":
    "ლეგენდარული გოლი ტაქტიკურ დაფაზე თამაშდება. რაც უფრო ადრე ამოიცნობ, მეტს გამოიმუშავებ — ყოველი გოლის პირველი ამოცნობა ქოინებსა და XP-ს გაძლევს.",
  "(daily cap)": "(დღიური ლიმიტი)",
  "Already solved before — no repeat rewards": "უკვე ამოცნობილი გაქვს — განმეორებაზე ჯილდო აღარ გეძლევა",
  "Something went wrong — try again": "რაღაც შეცდომაა — სცადე თავიდან",
  "Watch the real goal": "ნახე ნამდვილი გოლი",
  "Back to the board": "დაფაზე დაბრუნება",
  "Couldn't load your game": "თამაში ვერ ჩაიტვირთა",

  // Shared
  "Prototype — virtual points only, no real money or rewards":
    "პროტოტიპი — მხოლოდ ვირტუალური ქულები, რეალური ფული ან ჯილდო არ არსებობს",
  "Points": "ქულები",
  "Play again": "თავიდან თამაში",
  "Try again": "სცადე თავიდან",
  "Next": "შემდეგი",
  "Back": "უკან",
  "Opponent": "მეტოქე",

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

  // Free Kicks (formerly Final Third)
  "Free Kicks": "Free Kicks",
  "Know football. Read the goal. Take the shot.": "Know football. Read the goal. Take the shot.",
  "Balance": "ბალანსი",
  "Pot": "ბანკი",
  "Your pot": "შენი ბანკი",
  "Stake {n} & attack": "დადე {n} და შეუტიე",
  "Min {n}": "მინ. {n}",
  "Top up (demo)": "შევსება (დემო)",
  "Answer to scout the keeper": "უპასუხე და დაზვერე მეკარე",
  "{n}s": "{n} წმ",
  "Time's up — blind shot": "დრო ამოიწურა — ბრმა დარტყმა",
  "Wrong — the correct answer stays. Blind shot.": "არასწორია — სწორი პასუხი რჩება. ბრმა დარტყმა.",
  "Answer to scout the keeper — knowledge sharpens the shot, the risk stays.":
    "უპასუხე და დაზვერე მეკარე — ცოდნა დარტყმას ალესავს, რისკი კი რჩება.",
  "Attack {n}": "შეტევა {n}",
  "SCOUT REPORT ✓ — one save zone revealed": "დაზვერვის ანგარიში ✓ — ერთი სეივ-ზონა გამოვლინდა",
  "No scout — blind shot pays more": "დაზვერვის გარეშე — ბრმა დარტყმა მეტს იხდის",
  "Pick your shot zone": "აირჩიე დარტყმის ზონა",
  "4 GOAL · 2 SAVE": "4 გოლი · 2 სეივი",
  "4 GOAL · 1 SAVE": "4 გოლი · 1 სეივი",
  "TAKE {amount}": "აიღე {amount}",
  "NEXT ATTACK": "შემდეგი შეტევა",
  "Next attack risks the whole pot — the keeper resets.": "შემდეგი შეტევა მთელ ბანკს რისკავს — მეკარე თავიდან დგება.",
  "The keeper read it — pot lost.": "მეკარემ წაიკითხა — ბანკი დაიკარგა.",
  "Cashed out {amount}!": "განაღდებულია {amount}!",
  "Loading…": "იტვირთება…",
  "Could not load balance — tap to retry": "ბალანსი ვერ ჩაიტვირთა — დააჭირე თავიდან საცდელად",
  "New round": "ახალი რაუნდი",
  "Live wins": "ლაივ მოგებები",
  "Longest runs today": "დღის ყველაზე გრძელი სერიები",
  "{n} playing now": "{n} თამაშობს ახლა",
  "{pct}% answered correctly": "{pct}%-მა სწორად უპასუხა",
  "{pct}% scored": "{pct}%-მა გაიტანა",
  "{pct}% cashed out": "{pct}%-მა აიღო",
  "{n} going NEXT ATTACK": "{n} აგრძელებს შეტევას",
  "You": "შენ",
  "just now": "ახლახან",
  "{n}m ago": "{n} წთ წინ",

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

  // Football Tic Tac Toe
  "Football Tic Tac Toe": "საფეხბურთო იქს-ნული",
  "Claim cells with players — three in a row wins": "დაიკავე უჯრები ფეხბურთელებით — სამი ზედიზედ იგებს",
  "You · Opponent": "შენ · მეტოქე",
  "Pick a cell and name a player who played for that club AND that nation. Your opponent answers back — line up three to win.":
    "აირჩიე უჯრა და დაასახელე ფეხბურთელი, რომელიც ამ კლუბშიც ითამაშა და ამ ქვეყნის ნაკრებშიც. მეტოქე გიპასუხებს — ააწყვე სამი ზედიზედ.",
  "Start match": "მატჩის დაწყება",
  "Your turn — pick a cell": "შენი ჯერია — აირჩიე უჯრა",
  "Not a match — turn passes": "არ ემთხვევა — ჯერი გადადის",
  "Time's up — turn passes": "დრო ამოიწურა — ჯერი გადადის",
  "Pass": "გადაცემა",
  "Opponent blanked — your turn!": "მეტოქემ ვერ გაიხსენა — შენი ჯერია!",
  "Opponent is thinking…": "მეტოქე ფიქრობს…",
  "Opponent wins": "მეტოქე იგებს",
  "Three in a row!": "სამი ზედიზედ!",
  "Board full — {a} cells vs {b}": "დაფა შეივსო — {a} უჯრა {b}-ის წინააღმდეგ",
  "New grid": "ახალი ბადე",
  "{pct}%": "{pct}%",
  "Brazil": "ბრაზილია",
  "France": "საფრანგეთი",
  "Argentina": "არგენტინა",
  "Spain": "ესპანეთი",
  "Netherlands": "ნიდერლანდები",
  "Portugal": "პორტუგალია",

  // Survivor
  "Survivor": "სურვაივერი",
  "One wrong answer and you are out — how long can you last?": "ერთი შეცდომა და გარეთ ხარ — რამდენ ხანს გაძლებ?",
  "Streak": "სერია",
  "Sudden death": "უეცარი სიკვდილი",
  "Questions get harder as you go. {n} virtual players start with you — outlast them all.":
    "კითხვები თანდათან მძიმდება. {n} ვირტუალური მოთამაშე იწყებს შენთან ერთად — გადაასწარი ყველას.",
  "Best streak: {n}": "საუკეთესო სერია: {n}",
  "Enter the arena": "არენაზე შესვლა",
  "Still standing": "ჯერ კიდევ დგანან",
  "Eliminated": "გამოეთიშე",
  "Streak of {n}": "{n}-იანი სერია",
  "You outlasted {pct}% of the field — {left} were still standing.": "გადაასწარი მოთამაშეების {pct}%-ს — {left} ჯერ კიდევ იდგა.",
  "New best!": "ახალი რეკორდი!",
  "Run it back": "კიდევ ერთხელ",
  "Last one standing!": "უკანასკნელი გადარჩენილი!",
  "You cleared every question in the bank — a perfect {n}-answer run.": "ბანკის ყველა კითხვას უპასუხე — იდეალური {n}-პასუხიანი სერია.",

  // Hi-Lo Ride
  "Hi-Lo Ride": "Hi-Lo Ride",
  "Call the higher stat — odds priced by how many get it right": "გამოიცანი მეტი სტატისტიკა — კოეფიციენტი სირთულეზეა აწყობილი",
  "Chain higher-or-lower calls. Every correct call multiplies your stake — hard matchups pay more. Cash out before you miss.":
    "ააწყვე მეტი-ნაკლების ჯაჭვი. ყოველი სწორი პასუხი ამრავლებს ფსონს — რთული წყვილები მეტს იხდიან. დააქეშაუთე შეცდომამდე.",
  "Stake {stake} & ride": "დადე {stake} და იმგზავრე",
  "Step {n} · odds": "ნაბიჯი {n} · კოეფ.",
  "{pct}% of players call this one right": "მოთამაშეების {pct}% ამას სწორად პასუხობს",
  "Which is higher?": "რომელია მეტი?",
  "Higher": "მეტი",
  "Pot is {pot}. Next matchup pays {odds}x → {next}.": "ბანკი {pot}-ია. შემდეგი წყვილი იხდის {odds}x → {next}.",
  "Cash out {pot}": "ქეშაუთი {pot}",
  "Ride on": "გააგრძელე",
  "Wrong call": "არასწორი პასუხი",
  "The ride ends — your {stake} stake is gone.": "მგზავრობა დასრულდა — შენი {stake} ფსონი დაიკარგა.",
  "New ride": "ახალი მგზავრობა",
  "Cashed {amount}!": "განაღდებულია {amount}!",
  "{n} correct calls — {mult}x your stake.": "{n} სწორი პასუხი — შენი ფსონის {mult}x.",

  // Trivia Mines
  "Trivia Mines": "Trivia Mines",
  "Dribble past hidden defenders — scout them with your knowledge": "გაუარე დამალულ მცველებს — დაზვერე ისინი ცოდნით",
  "{d} defenders hide in {n} tiles. Every clean dribble grows the pot — hit a defender and lose it all. Answer questions to scout defenders out.":
    "{d} მცველი იმალება {n} უჯრაში. ყოველი სუფთა დრიბლინგი ზრდის ბანკს — მცველზე მოხვედრა ყველაფერს კარგავს. უპასუხე კითხვებს მცველების დასაზვერად.",
  "Stake {stake} & dribble": "დადე {stake} და დაიწყე დრიბლინგი",
  "Tackled": "წაგართვეს",
  "Now · next tile": "ახლა · შემდეგი უჯრა",
  "Scout ({n} left)": "დაზვერვა ({n} დარჩა)",
  "{n} safe tiles opened · {d} defenders in play": "{n} უსაფრთხო უჯრა გახსნილია · {d} მცველი თამაშშია",
  "Scout report — a defender is marked!": "დაზვერვა — ერთი მცველი მონიშნულია!",
  "Scout failed — no intel": "დაზვერვა ჩაიშალა — ინფორმაცია არაა",
  "Answer to scout a defender": "უპასუხე მცველის დასაზვერად",
  "Tackled!": "წაგართვეს!",
  "A defender got you after {n} clean tiles — the pot is gone.": "მცველმა დაგაკავა {n} სუფთა უჯრის შემდეგ — ბანკი დაიკარგა.",
  "New run": "ახალი გარბენი",
  "{n} clean dribbles at {mult}x.": "{n} სუფთა დრიბლინგი {mult}x-ზე.",

  // Quiz Board
  "Quiz Board": "ქვიზის დაფა",
  "Pick tiles, bank the value — steal when the AI slips": "აირჩიე უჯრები, ჩაიბარე ქულები — მოიპარე, როცა AI შეცდება",
  "Nine tiles, three value tiers. Answer to bank the tile and keep control — miss and the AI can steal. Highest bank wins.":
    "ცხრა უჯრა, სამი ღირებულება. უპასუხე, ჩაიბარე უჯრა და შეინარჩუნე კონტროლი — შეცდომაზე AI იპარავს. მეტი ბანკი იგებს.",
  "Start game": "თამაშის დაწყება",
  "Clubs": "კლუბები",
  "Legends": "ლეგენდები",
  "Tournaments": "ტურნირები",
  "Your board — pick a tile": "შენი დაფაა — აირჩიე უჯრა",
  "AI is picking a tile…": "AI ირჩევს უჯრას…",
  "AI plays for {v}": "AI თამაშობს {v}-ზე",
  "AI banks it": "AI იბარებს",
  "AI is wrong — steal it!": "AI ცდება — მოიპარე!",
  "STEAL for {v}!": "მოპარვა {v}-ზე!",
  "For {v}": "{v}-ზე",
  "Final banks — you {a}, AI {b}.": "საბოლოო ბანკები — შენ {a}, AI {b}.",
  "New board": "ახალი დაფა",

  // Last One Standing
  "Last One Standing": "უკანასკნელი გადარჩენილი",
  "{n} enter, one survives — make every cut": "{n} იწყებს, ერთი რჩება — გადაურჩი ყველა გადარჩევას",
  "Alive": "ცოცხალია",
  "Battle royale quiz": "ბეთლ-როიალ ქვიზი",
  "Every round the field is cut — answer right and fast to stay in it. Nine rounds from {n} players down to one.":
    "ყოველ რაუნდში ველი მცირდება — უპასუხე სწორად და სწრაფად, რომ დარჩე. ცხრა რაუნდი {n} მოთამაშიდან ერთამდე.",
  "Kick off": "დაწყება",
  "A legendary goal replays on the coaching board. Name it — the first solve of each goal pays coins and XP.":
    "ლეგენდარული გოლი საწვრთნელ დაფაზე მეორდება. ამოიცანი — ყოველი გოლის პირველი ამოცნობა ქოინებსა და XP-ს იძლევა.",
  "A legendary goal replays on the coaching board. Watch the moves and name the goal.":
    "ლეგენდარული გოლი საწვრთნელ დაფაზე მეორდება. უყურე სვლებს და ამოიცანი გოლი.",
  "Back tomorrow": "ხვალ გნახავთ",
  "All {limit} goals played — come back tomorrow": "დღეს {limit}-ვე გოლი ნათამაშებია — დაბრუნდი ხვალ",
  "{left} of {limit} goals left today": "დღეს დარჩა {left} გოლი {limit}-დან",
  "Daily coins earned — more tomorrow": "დღევანდელი ქოინები აღებულია — მეტი ხვალ",
  "Today: {today}/{cap} coins": "დღეს: {today}/{cap} ქოინი",
  "Your collection": "შენი კოლექცია",
  "Fastest {cap} survive": "ყველაზე სწრაფი {cap} რჩება",
  "Field": "ველი",
  "You made the cut!": "გადარჩი!",
  "#{rank} fastest — {cap} players remain.": "#{rank} სისწრაფით — {cap} მოთამაშე რჩება.",
  "Cut!": "გამოეთიშე!",
  "Finished #{place} of {n}": "დაასრულე #{place} {n}-დან",
  "Round {r} was your last — the field marched on without you.": "რაუნდი {r} შენი ბოლო იყო — ველმა უშენოდ გააგრძელა.",
  "Re-enter": "თავიდან შესვლა",
  "CHAMPION!": "ჩემპიონი!",
  "{n} started. You are the last one standing.": "{n} იწყებდა. შენ ხარ უკანასკნელი გადარჩენილი.",
  "Defend the title": "ტიტულის დაცვა",

  // Golden Goal
  "Golden Goal": "ოქროს გოლი",
  "Sudden death — push the ball into their net": "უეცარი სიკვდილი — შეიტანე ბურთი მათ კარში",
  "Round": "რაუნდი",
  "Both of you answer the same question — faster and righter pushes the ball. Reach ±{n} and it is a goal. First goal wins.":
    "ორივე ერთსა და იმავე კითხვას პასუხობთ — უფრო სწრაფი და ზუსტი წევს ბურთს. მიაღწიე ±{n}-ს და გოლია. პირველი გოლი იგებს.",
  "AI net": "AI-ს კარი",
  "Your attack": "შენი შეტევა",
  "GOLDEN GOAL!": "ოქროს გოლი!",
  "AI scores": "AI-მ გაიტანა",
  "Decided in {n} rounds.": "გადაწყდა {n} რაუნდში.",
  "Rematch": "რევანში",
  "vs": "vs",

  // Career Race
  "Career Race": "კარიერის რბოლა",
  "The transfer trail reveals — buzz before your rival": "კარიერა თანდათან იხსნება — დააჭირე ზარს მეტოქეზე ადრე",
  "Clubs appear one by one. Buzz early for 100 points — every extra club cuts the prize. Wrong buzz and you are out of the round. Best of {n}.":
    "კლუბები სათითაოდ ჩნდება. ადრეული ზარი 100 ქულაა — ყოველი დამატებითი კლუბი პრიზს ამცირებს. არასწორი ზარი რაუნდიდან გაგრიცხავს. საუკეთესო {n}-დან.",
  "Start race": "რბოლის დაწყება",
  "Buzz now: {pts} pts": "ზარი ახლა: {pts} ქულა",
  "Locked out": "დაბლოკილი ხარ",
  "BUZZ!": "ზარი!",
  "Rival buzzed wrong — they are out!": "მეტოქემ არასწორად უპასუხა — გავარდა!",
  "Your rival is watching the same trail…": "შენი მეტოქე იმავე კვალს უყურებს…",
  "Whose career is this?": "ვისი კარიერაა ეს?",
  "Wrong — locked out!": "არასწორია — დაიბლოკე!",
  "⚡ Rival buzzes…": "⚡ მეტოქე აჭერს ზარს…",
  "+{pts} — yours!": "+{pts} — შენია!",
  "Rival takes {pts}": "მეტოქე იღებს {pts}-ს",
  "Nobody got it": "ვერავინ გამოიცნო",
  "It was {name}": "ეს იყო {name}",
  "You win the race!": "რბოლა მოიგე!",
  "Rival wins": "მეტოქე იგებს",
  "Race again": "კიდევ ირბოლე",

  // Stat Sniper
  "Stat Sniper": "სტატ-სნაიპერი",
  "No options, no help — land your guess on the number": "ვარიანტების გარეშე — მიიტანე ვარაუდი ზუსტ რიცხვამდე",
  "Score": "ქულა",
  "{n} numeric stats — slide to your best guess. The closer you land, the more you score; a perfect hit pays a bullseye bonus.":
    "{n} რიცხვითი სტატისტიკა — გაასრიალე შენს საუკეთესო ვარაუდამდე. რაც უფრო ახლოს დაჯდები, მეტ ქულას იღებ; ზუსტი მოხვედრა ბონუსს იხდის.",
  "Take aim": "დამიზნება",
  "Target {n} / {total}": "სამიზნე {n} / {total}",
  "Lock it in": "დაფიქსირება",
  "Answer": "პასუხი",
  "BULLSEYE! +{pts}": "ათიანში! +{pts}",
  "+{pts} pts": "+{pts} ქულა",
  "You were {diff} off.": "{diff}-ით ააცილე.",
  "Next target": "შემდეგი სამიზნე",
  "Elite sniper!": "ელიტური სნაიპერი!",
  "Sharp shooter": "მკვეთრი მსროლელი",
  "On the range": "პოლიგონზე",
  "Blindfolded": "თვალახვეული",
  "{score} points over {n} targets": "{score} ქულა {n} სამიზნეზე",
  "Reload": "გადატენვა",

  // Free Kicks — boost rules (50/50 shot, answers raise the payout)
  "Every shot is a 50/50 duel with the keeper. Answer questions to boost the payout — a wrong answer resets the boost.":
    "ყოველი დარტყმა მეკარესთან 50/50 დუელია. უპასუხე კითხვებს და გაზარდე კოეფიციენტი — არასწორი პასუხი ბუსტს ანულებს.",
  "Boost {a}/{max} · ×{mult}": "ბუსტი {a}/{max} · ×{mult}",
  "BOOSTED! Payout is now ×{mult}": "ბუსტი! კოეფიციენტი ახლა ×{mult}",
  "Wrong — boost resets to ×{mult}": "არასწორია — ბუსტი ×{mult}-ზე ბრუნდება",
  "50/50 shot · current payout ×{mult}": "50/50 დარტყმა · მიმდინარე კოეფიციენტი ×{mult}",
  "Answer · boost to ×{next}": "უპასუხე · გაზარდე ×{next}-მდე",
  "Boosts raise the payout — the shot stays 50/50.": "ბუსტები კოეფიციენტს ზრდის — დარტყმა 50/50 რჩება.",
  "Boosting…": "იზრდება…",
  "Time's up — boost resets to ×{mult}": "დრო ამოიწურა — ბუსტი ×{mult}-ზე ბრუნდება",
  "Left or right — the keeper picks one": "მარცხნივ თუ მარჯვნივ — მეკარე ერთს ირჩევს",
  "Pick your corner": "აირჩიე კუთხე",
  "Next attack risks the whole pot — the boost resets.": "შემდეგი შეტევა მთელ ბანკს რისკავს — ბუსტი ნულდება.",

  // Free Kicks — run-multiplier HUD
  "Run ×{run} → ×{next}": "სერია ×{run} → ×{next}",
  "Run": "სერია",
  "Answering is locked this attack — take the shot.": "პასუხები ამ შეტევაზე დაკეტილია — დაარტყი.",
  "Sound settings": "ხმის პარამეტრები",
  "Crowd": "გულშემატკივრები",
  "Effects": "ეფექტები",
  "Off": "გამორთ.",
  "More open zones = better odds of keeping the run alive.": "მეტი ღია ზონა = მეტი შანსი, რომ სერია გააგრძელო.",

  // Free Kicks — Option C (open-zones) rules
  "The goal opens with 2 zones and one hidden keeper. Answer questions to open up to 6 — a wrong answer slams it back to 2.":
    "კარი იხსნება 2 ზონით და ერთი დამალული მეკარით. უპასუხე კითხვებს და გახსენი 6-მდე — არასწორი პასუხი ისევ 2-მდე ხურავს.",
  "{k} open · {pct}% · ×{mult}": "{k} ღია · {pct}% · ×{mult}",
  "Zone opened! {k} of {max} in play": "ზონა გაიხსნა! {k} {max}-დან თამაშშია",
  "Wrong — goal slams back to {n} zones": "არასწორია — კარი ისევ {n} ზონამდე იხურება",
  "{k} zones open · 1 keeper hidden · {pct}% goal": "{k} ზონა ღიაა · 1 მეკარე იმალება · გოლის შანსი {pct}%",
  "Answer · open zone {n}": "უპასუხე · გახსენი ზონა {n}",
  "Shoot · {pot} → {next}": "დაარტყი · {pot} → {next}",
  "More zones = safer shot, smaller payout — the maths favours knowing.":
    "მეტი ზონა = უფრო უსაფრთხო დარტყმა, ნაკლები კოეფიციენტი — მათემატიკა ცოდნის მხარესაა.",
  "Opening the goal…": "კარი იხსნება…",
  "Time's up — the goal slams back to {n} zones": "დრო ამოიწურა — კარი ისევ {n} ზონამდე იხურება",
  "Wrong — the goal slams back to {n} zones": "არასწორია — კარი ისევ {n} ზონამდე იხურება",
  "{k} zones open — one hides the keeper": "{k} ზონა ღიაა — ერთში მეკარე იმალება",
  "{pct}% goal": "გოლის შანსი {pct}%",
  "Next attack risks the whole pot — the goal resets to {n} zones.":
    "შემდეგი შეტევა მთელ ბანკს რისკავს — კარი ისევ {n} ზონამდე ბრუნდება.",
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
