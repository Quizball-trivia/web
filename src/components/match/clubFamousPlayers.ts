/**
 * Map of club ID (kebab-case slug from `top5leagues-clubs.json`) → ordered
 * list of famous players historically tied to that club.
 *
 * Used by the quit-match modal to compose a motivational headline tailored
 * to the player's favourite club ("Ronaldo would not give up" for a Real
 * Madrid fan, "Messi would not give up" for a Barcelona fan, etc.).
 *
 * Not exhaustive — covers the most recognisable top-5-league clubs. If a
 * club isn't here `getRandomFamousPlayer()` falls back to a generic name
 * so the modal always renders sensibly.
 */

const FAMOUS_PLAYERS_BY_CLUB: Record<string, string[]> = {
  // ─── Premier League ──────────────────────────────────────────────────
  'manchester-united': [
    'Ronaldo', 'Cantona', 'Beckham', 'Rooney', 'Scholes', 'Giggs', 'Keane', 'Ferdinand',
  ],
  'manchester-city': [
    'Aguero', 'De Bruyne', 'Haaland', 'Silva', 'Toure', 'Kompany', 'Foden',
  ],
  'liverpool-fc': [
    'Salah', 'Gerrard', 'Suarez', 'Dalglish', 'Van Dijk', 'Mane', 'Owen', 'Rush',
  ],
  'arsenal-fc': [
    'Henry', 'Bergkamp', 'Vieira', 'Pires', 'Wright', 'Saka', 'Ozil', 'Adams',
  ],
  'chelsea-fc': [
    'Lampard', 'Drogba', 'Terry', 'Hazard', 'Cech', 'Cole', 'Costa', 'Zola',
  ],
  'tottenham-hotspur': [
    'Kane', 'Bale', 'Son', 'Modric', 'Klinsmann', 'Hoddle', 'Greaves',
  ],

  // ─── La Liga ─────────────────────────────────────────────────────────
  'real-madrid': [
    'Ronaldo', 'Zidane', 'Raul', 'Modric', 'Bellingham', 'Vinicius', 'Casillas', 'Hierro',
  ],
  'fc-barcelona': [
    'Messi', 'Xavi', 'Iniesta', 'Ronaldinho', 'Cruyff', 'Pedri', 'Suarez', 'Puyol',
  ],
  'atletico-de-madrid': [
    'Griezmann', 'Costa', 'Falcao', 'Forlan', 'Koke', 'Simeone', 'Aguero',
  ],
  'real-betis-balompie': [
    'Joaquin', 'Isco', 'Fekir', 'Borja Iglesias',
  ],
  'real-sociedad': [
    'Oyarzabal', 'Silva', 'Xabi Alonso', 'Aritz Elustondo',
  ],
  'sevilla-fc': [
    'Reyes', 'Maresca', 'Bacca', 'Banega',
  ],
  'valencia-cf': [
    'Mendieta', 'Villa', 'Aimar', 'Cañizares',
  ],
  'villarreal-cf': [
    'Riquelme', 'Bacca', 'Pavón', 'Cazorla',
  ],

  // ─── Bundesliga ──────────────────────────────────────────────────────
  'fc-bayern-munchen': [
    'Müller', 'Lewandowski', 'Beckenbauer', 'Lahm', 'Kahn', 'Neuer', 'Kane', 'Robben',
  ],
  'borussia-dortmund': [
    'Reus', 'Lewandowski', 'Sancho', 'Haaland', 'Hummels', 'Bellingham',
  ],
  'rb-leipzig': [
    'Werner', 'Olmo', 'Nkunku', 'Sabitzer',
  ],
  'bayer-04-leverkusen': [
    'Wirtz', 'Schick', 'Boniface', 'Hincapié', 'Ballack',
  ],

  // ─── Serie A ─────────────────────────────────────────────────────────
  'juventus': [
    'Del Piero', 'Buffon', 'Pirlo', 'Trezeguet', 'Chiellini', 'Zidane', 'Ronaldo',
  ],
  'fc-internazionale-milano': [
    'Zanetti', 'Ronaldo', 'Eto\'o', 'Milito', 'Lautaro', 'Materazzi', 'Cambiasso',
  ],
  'ac-milan': [
    'Maldini', 'Baresi', 'Kaká', 'Pirlo', 'Inzaghi', 'Shevchenko', 'Van Basten',
  ],
  'ssc-napoli': [
    'Maradona', 'Hamšík', 'Cavani', 'Insigne', 'Osimhen', 'Mertens',
  ],
  'as-roma': [
    'Totti', 'De Rossi', 'Batistuta', 'Pjanic', 'Dzeko',
  ],
  'ss-lazio': [
    'Nesta', 'Klose', 'Veron', 'Immobile', 'Mancini',
  ],

  // ─── Ligue 1 ─────────────────────────────────────────────────────────
  'paris-saint-germain': [
    'Mbappe', 'Ronaldinho', 'Ibrahimovic', 'Cavani', 'Neymar', 'Messi', 'Pauleta',
  ],
  'olympique-de-marseille': [
    'Drogba', 'Papin', 'Boli', 'Payet',
  ],
  'olympique-lyonnais': [
    'Benzema', 'Juninho', 'Lacazette', 'Lloris', 'Govou',
  ],
  'lille-osc': [
    'Hazard', 'Pepe', 'Osimhen', 'Yilmaz',
  ],
  'as-monaco': [
    'Henry', 'Mbappe', 'Falcao', 'Trezeguet', 'Giuly',
  ],
};

/** Generic fallback used when the club isn't in the map or has no entries. */
const FALLBACK_PLAYERS = ['Ronaldo', 'Messi', 'Maradona', 'Pelé', 'Zidane', 'Cruyff'];

/**
 * Return a famous player name associated with `clubId`. The returned name
 * is picked at random from the club's roster so repeated calls produce
 * variation. Falls back to a generic legend when the club is unknown.
 */
export function getRandomFamousPlayer(clubId: string | null | undefined): string {
  const roster = (clubId && FAMOUS_PLAYERS_BY_CLUB[clubId]) || FALLBACK_PLAYERS;
  const idx = Math.floor(Math.random() * roster.length);
  return roster[idx] ?? FALLBACK_PLAYERS[0];
}
