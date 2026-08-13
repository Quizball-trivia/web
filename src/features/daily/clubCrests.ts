/**
 * Maps club display names (EN + KA) to local crest files in /public/clubs.
 * Career-path pills show a crest when the club name resolves; unknown names
 * render text-only, so backend sessions with unmapped clubs are unaffected.
 */
const CLUB_CRESTS: Record<string, string> = {
  "borussia dortmund": "borussia-dortmund.webp",
  "ბორუსია დორტმუნდი": "borussia-dortmund.webp",
  "real madrid": "real-madrid.webp",
  "რეალ მადრიდი": "real-madrid.webp",
  "manchester united": "manchester-united.webp",
  "მანჩესტერ იუნაიტედი": "manchester-united.webp",
  "manchester city": "manchester-city.webp",
  "მანჩესტერ სიტი": "manchester-city.webp",
  "juventus": "juventus-fc.webp",
  "იუვენტუსი": "juventus-fc.webp",
  "napoli": "ssc-napoli.webp",
  "ნაპოლი": "ssc-napoli.webp",
  "psg": "paris-saint-germain.webp",
  "პსჟ": "paris-saint-germain.webp",
  "paris saint-germain": "paris-saint-germain.webp",
  "monaco": "as-monaco.webp",
  "მონაკო": "as-monaco.webp",
  "sevilla": "sevilla-fc.webp",
  "სევილია": "sevilla-fc.webp",
  "liverpool": "liverpool-fc.webp",
  "ლივერპული": "liverpool-fc.webp",
  "bayern munich": "bayern-munich.webp",
  "ბაიერნი": "bayern-munich.webp",
  "tottenham": "tottenham-hotspur.webp",
  "ტოტენჰემი": "tottenham-hotspur.webp",
  "ac milan": "ac-milan.webp",
  "მილანი": "ac-milan.webp",
  "genoa": "genoa-cfc.webp",
  "ჯენოა": "genoa-cfc.webp",
  "barcelona": "fc-barcelona.webp",
  "ბარსელონა": "fc-barcelona.webp",
  "arsenal": "arsenal-fc.webp",
  "არსენალი": "arsenal-fc.webp",
  "chelsea": "chelsea-fc.webp",
  "ჩელსი": "chelsea-fc.webp",
  "inter milan": "inter-milan.webp",
  "ინტერი": "inter-milan.webp",
  "atletico madrid": "atletico-de-madrid.webp",
  "ატლეტიკო მადრიდი": "atletico-de-madrid.webp",
};

export function resolveClubCrest(name: string): string | null {
  const file = CLUB_CRESTS[name.trim().toLowerCase()];
  return file ? `/clubs/${file}` : null;
}
