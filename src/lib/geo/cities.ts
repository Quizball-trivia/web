import type { AvatarCustomization } from "@/types/game";

/**
 * A point on the world map an opponent can be rendered at.
 *
 * Used both as a "search" candidate (the pulsing pins shown while
 * matchmaking) and as a fallback for the resolved-opponent panel
 * when the backend either doesn't return geo info or returns
 * something we can't pin precisely.
 */
export interface OpponentLocationCandidate {
  lon: number;
  lat: number;
  city: string;
  country: string;
  flag: string;
  source?: string;
  countryKey?: string | null;
  cityHint?: string;
  countryHint?: string;
  countryCodeHint?: string;
}

/**
 * Curated cities used to seed the "looking for opponents" search
 * animation on the map. Each entry has a coordinate + an example
 * avatar so the rotating pin set looks intentional, not random.
 *
 * Coordinates are biased inland — the 110m topo we render is coarse
 * around coasts so genuinely-coastal cities can look like they're
 * floating in the ocean.
 */
export const CITY_DATA: {
  lon: number;
  lat: number;
  city: string;
  country: string;
  flag: string;
  name: string;
  customization: AvatarCustomization;
}[] = [
  {
    lon: -104.99,
    lat: 39.74,
    city: "Denver",
    country: "USA",
    flag: "🇺🇸",
    name: "Alex",
    customization: { skin: "skin_male_white", hair: "hair_ramos", jersey: "jersey_blue", glasses: "glasses_aviator" },
  },
  {
    lon: -99.1,
    lat: 19.4,
    city: "Mexico City",
    country: "Mexico",
    flag: "🇲🇽",
    name: "Carlos",
    customization: { skin: "skin_male_dark", hair: "hair_ronaldo_brazil", jersey: "jersey_green", facialHair: "stache" },
  },
  {
    lon: -47.88,
    lat: -15.79,
    city: "Brasilia",
    country: "Brazil",
    flag: "🇧🇷",
    name: "Lucas",
    customization: { skin: "skin_male_dark_alt", hair: "hair_ronaldo_goat", jersey: "jersey_brazil_retro" },
  },
  {
    lon: -1.9,
    lat: 52.5,
    city: "Birmingham",
    country: "UK",
    flag: "🇬🇧",
    name: "James",
    customization: { skin: "skin_male_white_alt", hair: "hair_boy_basic", jersey: "jersey_liverpool", facialHair: "beard" },
  },
  {
    lon: 4.83,
    lat: 45.76,
    city: "Lyon",
    country: "France",
    flag: "🇫🇷",
    name: "Louis",
    customization: { skin: "skin_male_white", hair: "hair_hamsik", jersey: "jersey_france_retro", glasses: "glasses_round" },
  },
  {
    lon: 11.58,
    lat: 48.14,
    city: "Munich",
    country: "Germany",
    flag: "🇩🇪",
    name: "Max",
    customization: { skin: "skin_male_white_alt", hair: "hair_boy_basic", jersey: "jersey_germany_retro", facialHair: "beard" },
  },
  {
    lon: 32.86,
    lat: 39.93,
    city: "Ankara",
    country: "Turkey",
    flag: "🇹🇷",
    name: "Emre",
    customization: { skin: "skin_male_white", hair: "hair_hamsik", jersey: "jersey_red", facialHair: "stache" },
  },
  {
    lon: 44.5,
    lat: 25.5,
    city: "Riyadh",
    country: "Saudi Arabia",
    flag: "🇸🇦",
    name: "Omar",
    customization: { skin: "skin_male_dark", hair: "hair_boy_basic", jersey: "jersey_violet", facialHair: "beard" },
  },
  {
    lon: 77.21,
    lat: 28.61,
    city: "Delhi",
    country: "India",
    flag: "🇮🇳",
    name: "Arjun",
    customization: { skin: "skin_male_dark_alt", hair: "hair_ramos", jersey: "jersey_yellow", glasses: "glasses_wayfarer" },
  },
  {
    lon: 100.5,
    lat: 16.0,
    city: "Bangkok",
    country: "Thailand",
    flag: "🇹🇭",
    name: "Niran",
    customization: { skin: "skin_male_dark", hair: "hair_boy_basic", jersey: "jersey_pink" },
  },
  {
    lon: 104.06,
    lat: 32.5,
    city: "Chengdu",
    country: "China",
    flag: "🇨🇳",
    name: "Wei",
    customization: { skin: "skin_male_white", hair: "hair_boy_basic", jersey: "jersey_milan", glasses: "glasses_round" },
  },
  {
    lon: 139.0,
    lat: 36.5,
    city: "Tokyo",
    country: "Japan",
    flag: "🇯🇵",
    name: "Yuki",
    customization: { skin: "skin_male_white_alt", hair: "hair_boy_basic", jersey: "jersey_bayern" },
  },
  {
    lon: 133.88,
    lat: -25.5,
    city: "Alice Springs",
    country: "Australia",
    flag: "🇦🇺",
    name: "Liam",
    customization: { skin: "skin_male_white", hair: "hair_ronaldo_brazil", jersey: "jersey_yellow", glasses: "glasses_aviator" },
  },
  {
    lon: 36.82,
    lat: -1.29,
    city: "Nairobi",
    country: "Kenya",
    flag: "🇰🇪",
    name: "Kofi",
    customization: { skin: "skin_male_dark_alt", hair: "hair_boy_basic", jersey: "jersey_argentina_retro", facialHair: "stache" },
  },
  {
    lon: 7.49,
    lat: 9.06,
    city: "Abuja",
    country: "Nigeria",
    flag: "🇳🇬",
    name: "Chidi",
    customization: { skin: "skin_male_dark", hair: "hair_ramos", jersey: "jersey_netherlands_retro" },
  },
  {
    lon: 44.79,
    lat: 41.72,
    city: "Tbilisi",
    country: "Georgia",
    flag: "🇬🇪",
    name: "Giorgi",
    customization: { skin: "skin_male_white", hair: "hair_hamsik", jersey: "jersey_real", facialHair: "beard" },
  },
];

/**
 * Additional inland city coordinates used to expand the pool of pins
 * shown during the searching animation. They aren't tied to a specific
 * avatar — the component picks an avatar at render time.
 */
export const EXTRA_SEARCH_LOCATIONS: Pick<
  (typeof CITY_DATA)[number],
  "lon" | "lat" | "city" | "country" | "flag"
>[] = [
  // These are display-safe, realistic land points. The 110m topo map has coarse
  // coastlines, so coastal cities can look like they are floating in the ocean.
  { lon: -96.8, lat: 32.78, city: "Dallas", country: "USA", flag: "🇺🇸" },
  { lon: -84.39, lat: 33.75, city: "Atlanta", country: "USA", flag: "🇺🇸" },
  { lon: -87.63, lat: 41.88, city: "Chicago", country: "USA", flag: "🇺🇸" },
  { lon: -94.58, lat: 39.1, city: "Kansas City", country: "USA", flag: "🇺🇸" },
  { lon: -114.07, lat: 51.05, city: "Calgary", country: "Canada", flag: "🇨🇦" },
  { lon: -97.14, lat: 49.9, city: "Winnipeg", country: "Canada", flag: "🇨🇦" },
  { lon: -64.19, lat: -31.42, city: "Cordoba", country: "Argentina", flag: "🇦🇷" },
  { lon: -68.84, lat: -32.89, city: "Mendoza", country: "Argentina", flag: "🇦🇷" },
  { lon: -70.66, lat: -33.45, city: "Santiago", country: "Chile", flag: "🇨🇱" },
  { lon: -74.07, lat: 4.71, city: "Bogota", country: "Colombia", flag: "🇨🇴" },
  { lon: -46.63, lat: -23.55, city: "Sao Paulo", country: "Brazil", flag: "🇧🇷" },
  { lon: -43.94, lat: -19.92, city: "Belo Horizonte", country: "Brazil", flag: "🇧🇷" },
  { lon: -1.9, lat: 52.5, city: "Birmingham", country: "UK", flag: "🇬🇧" },
  { lon: -2.24, lat: 53.48, city: "Manchester", country: "UK", flag: "🇬🇧" },
  { lon: 2.35, lat: 48.86, city: "Paris", country: "France", flag: "🇫🇷" },
  { lon: 4.83, lat: 45.76, city: "Lyon", country: "France", flag: "🇫🇷" },
  { lon: 13.4, lat: 52.52, city: "Berlin", country: "Germany", flag: "🇩🇪" },
  { lon: 5.12, lat: 52.09, city: "Utrecht", country: "Netherlands", flag: "🇳🇱" },
  { lon: -3.7, lat: 40.42, city: "Madrid", country: "Spain", flag: "🇪🇸" },
  { lon: -0.38, lat: 39.47, city: "Valencia", country: "Spain", flag: "🇪🇸" },
  { lon: 11.34, lat: 44.49, city: "Bologna", country: "Italy", flag: "🇮🇹" },
  { lon: 9.19, lat: 45.46, city: "Milan", country: "Italy", flag: "🇮🇹" },
  { lon: -8.42, lat: 40.2, city: "Coimbra", country: "Portugal", flag: "🇵🇹" },
  { lon: 21.01, lat: 52.23, city: "Warsaw", country: "Poland", flag: "🇵🇱" },
  { lon: 14.42, lat: 50.09, city: "Prague", country: "Czechia", flag: "🇨🇿" },
  { lon: 16.37, lat: 48.21, city: "Vienna", country: "Austria", flag: "🇦🇹" },
  { lon: 19.04, lat: 47.5, city: "Budapest", country: "Hungary", flag: "🇭🇺" },
  { lon: 20.46, lat: 44.82, city: "Belgrade", country: "Serbia", flag: "🇷🇸" },
  { lon: 15.98, lat: 45.81, city: "Zagreb", country: "Croatia", flag: "🇭🇷" },
  { lon: 26.1, lat: 44.43, city: "Bucharest", country: "Romania", flag: "🇷🇴" },
  { lon: 30.52, lat: 50.45, city: "Kyiv", country: "Ukraine", flag: "🇺🇦" },
  { lon: 23.73, lat: 38.05, city: "Athens", country: "Greece", flag: "🇬🇷" },
  { lon: 22.42, lat: 39.64, city: "Larissa", country: "Greece", flag: "🇬🇷" },
  { lon: 32.86, lat: 39.93, city: "Ankara", country: "Turkey", flag: "🇹🇷" },
  { lon: 32.48, lat: 37.87, city: "Konya", country: "Turkey", flag: "🇹🇷" },
  { lon: 42.7, lat: 42.27, city: "Kutaisi", country: "Georgia", flag: "🇬🇪" },
  { lon: 44.51, lat: 40.18, city: "Yerevan", country: "Armenia", flag: "🇦🇲" },
  { lon: 37.62, lat: 55.75, city: "Moscow", country: "Russia", flag: "🇷🇺" },
  { lon: 31.24, lat: 30.04, city: "Cairo", country: "Egypt", flag: "🇪🇬" },
  { lon: 7.49, lat: 9.06, city: "Abuja", country: "Nigeria", flag: "🇳🇬" },
  { lon: 28.05, lat: -26.2, city: "Johannesburg", country: "South Africa", flag: "🇿🇦" },
  { lon: 55.75, lat: 24.21, city: "Al Ain", country: "UAE", flag: "🇦🇪" },
  { lon: 77.21, lat: 28.61, city: "Delhi", country: "India", flag: "🇮🇳" },
  { lon: 98.98, lat: 18.79, city: "Chiang Mai", country: "Thailand", flag: "🇹🇭" },
  { lon: 104.06, lat: 30.67, city: "Chengdu", country: "China", flag: "🇨🇳" },
  { lon: 138.18, lat: 36.65, city: "Nagano", country: "Japan", flag: "🇯🇵" },
  { lon: 127.38, lat: 36.35, city: "Daejeon", country: "South Korea", flag: "🇰🇷" },
  { lon: 133.88, lat: -23.7, city: "Alice Springs", country: "Australia", flag: "🇦🇺" },
  { lon: 149.13, lat: -35.28, city: "Canberra", country: "Australia", flag: "🇦🇺" },
];

/**
 * Display names used to label the rotating search pins. Decoupled from
 * CITY_DATA's `name` field so the component can shuffle the two
 * independently.
 */
export const SEARCH_PLAYER_NAMES = [
  "Alex",
  "Maya",
  "Leo",
  "Niko",
  "Sofia",
  "Kai",
  "Dani",
  "Mina",
  "Rafa",
  "Noah",
  "Luca",
  "Amir",
  "Elena",
  "Tomi",
  "Ibra",
  "Mila",
  "Giorgi",
  "Niran",
  "Yuki",
  "Kofi",
  "Aram",
  "Yannis",
  "Stefan",
  "Lika",
  "Emre",
  "Oksana",
] as const;
