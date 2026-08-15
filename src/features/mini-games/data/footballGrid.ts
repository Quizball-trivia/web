/**
 * Football Grid (tic-tac-toe) mock data. Each grid is 3 club rows × 3 nation
 * columns; a cell's answers are players who played for that club AND hold that
 * nationality. `pct` is crowd popularity (what share of players named this
 * answer) — rarer claims show off, exactly like Squad Spin. `accepted` carries
 * surnames + transliterations for the fuzzy matcher. Club names must resolve
 * via findClubByName (crests), nations via normalizeCountryCode (flags).
 */

export interface GridAnswer {
  name: string;
  accepted: string[];
  /** % of players who named this answer. Lower = rarer. */
  pct: number;
}

export interface GridConfig {
  id: string;
  /** Row headers — club names resolvable to crests. */
  clubs: [string, string, string];
  /** Column headers — nation names resolvable to flags. */
  nations: [string, string, string];
  /** cells[row][col] — players valid for clubs[row] × nations[col]. */
  cells: GridAnswer[][][];
}

export const GRID_CONFIGS: GridConfig[] = [
  {
    id: 'grid-1',
    clubs: ['Real Madrid CF', 'Manchester United', 'Juventus'],
    nations: ['Brazil', 'France', 'Argentina'],
    cells: [
      [
        // Real Madrid × Brazil
        [
          { name: 'Vinícius Júnior', accepted: ['vinicius', 'vinicius junior', 'vini', 'ვინისიუსი'], pct: 34 },
          { name: 'Ronaldo Nazário', accepted: ['ronaldo', 'ronaldo nazario', 'r9', 'რონალდო'], pct: 28 },
          { name: 'Roberto Carlos', accepted: ['roberto carlos', 'რობერტო კარლოსი'], pct: 16 },
          { name: 'Kaká', accepted: ['kaka', 'ricardo kaka', 'კაკა'], pct: 12 },
          { name: 'Marcelo', accepted: ['marcelo', 'marcelo vieira'], pct: 10 },
        ],
        // Real Madrid × France
        [
          { name: 'Zinedine Zidane', accepted: ['zidane', 'zizou', 'ზიდანი'], pct: 48 },
          { name: 'Karim Benzema', accepted: ['benzema', 'karim benzema', 'ბენზემა'], pct: 32 },
          { name: 'Kylian Mbappé', accepted: ['mbappe', 'kylian mbappe', 'მბაპე'], pct: 12 },
          { name: 'Raphaël Varane', accepted: ['varane', 'raphael varane'], pct: 5 },
          { name: 'Eduardo Camavinga', accepted: ['camavinga'], pct: 3 },
        ],
        // Real Madrid × Argentina
        [
          { name: 'Alfredo Di Stéfano', accepted: ['di stefano', 'alfredo di stefano', 'distefano'], pct: 34 },
          { name: 'Gonzalo Higuaín', accepted: ['higuain', 'gonzalo higuain'], pct: 30 },
          { name: 'Ángel Di María', accepted: ['di maria', 'angel di maria', 'dimaria'], pct: 24 },
          { name: 'Fernando Redondo', accepted: ['redondo', 'fernando redondo'], pct: 8 },
          { name: 'Santiago Solari', accepted: ['solari', 'santiago solari'], pct: 4 },
        ],
      ],
      [
        // Man United × Brazil
        [
          { name: 'Casemiro', accepted: ['casemiro', 'კაზემირო'], pct: 44 },
          { name: 'Antony', accepted: ['antony', 'antony santos'], pct: 26 },
          { name: 'Fred', accepted: ['fred', 'frederico rodrigues'], pct: 14 },
          { name: 'Rafael', accepted: ['rafael', 'rafael da silva'], pct: 9 },
          { name: 'Anderson', accepted: ['anderson'], pct: 7 },
        ],
        // Man United × France
        [
          { name: 'Paul Pogba', accepted: ['pogba', 'paul pogba', 'პოგბა'], pct: 36 },
          { name: 'Eric Cantona', accepted: ['cantona', 'eric cantona', 'კანტონა'], pct: 33 },
          { name: 'Anthony Martial', accepted: ['martial', 'anthony martial'], pct: 17 },
          { name: 'Patrice Evra', accepted: ['evra', 'patrice evra'], pct: 10 },
          { name: 'Raphaël Varane', accepted: ['varane', 'raphael varane'], pct: 4 },
        ],
        // Man United × Argentina
        [
          { name: 'Alejandro Garnacho', accepted: ['garnacho', 'alejandro garnacho'], pct: 34 },
          { name: 'Carlos Tevez', accepted: ['tevez', 'carlos tevez', 'ტევესი'], pct: 28 },
          { name: 'Ángel Di María', accepted: ['di maria', 'angel di maria', 'dimaria'], pct: 16 },
          { name: 'Juan Sebastián Verón', accepted: ['veron', 'juan sebastian veron'], pct: 13 },
          { name: 'Marcos Rojo', accepted: ['rojo', 'marcos rojo'], pct: 9 },
        ],
      ],
      [
        // Juventus × Brazil
        [
          { name: 'Danilo', accepted: ['danilo', 'danilo luiz'], pct: 30 },
          { name: 'Alex Sandro', accepted: ['alex sandro', 'sandro'], pct: 26 },
          { name: 'Douglas Costa', accepted: ['douglas costa', 'costa'], pct: 22 },
          { name: 'Arthur', accepted: ['arthur', 'arthur melo'], pct: 12 },
          { name: 'Emerson', accepted: ['emerson', 'emerson ferreira'], pct: 10 },
        ],
        // Juventus × France
        [
          { name: 'Paul Pogba', accepted: ['pogba', 'paul pogba', 'პოგბა'], pct: 32 },
          { name: 'Zinedine Zidane', accepted: ['zidane', 'zizou', 'ზიდანი'], pct: 27 },
          { name: 'David Trezeguet', accepted: ['trezeguet', 'david trezeguet'], pct: 19 },
          { name: 'Adrien Rabiot', accepted: ['rabiot', 'adrien rabiot'], pct: 12 },
          { name: 'Blaise Matuidi', accepted: ['matuidi', 'blaise matuidi'], pct: 10 },
        ],
        // Juventus × Argentina
        [
          { name: 'Paulo Dybala', accepted: ['dybala', 'paulo dybala', 'დიბალა'], pct: 52 },
          { name: 'Gonzalo Higuaín', accepted: ['higuain', 'gonzalo higuain'], pct: 26 },
          { name: 'Carlos Tevez', accepted: ['tevez', 'carlos tevez'], pct: 14 },
          { name: 'Ángel Di María', accepted: ['di maria', 'angel di maria'], pct: 8 },
        ],
      ],
    ],
  },
  {
    id: 'grid-2',
    clubs: ['FC Barcelona', 'Liverpool', 'FC Bayern Munich'],
    nations: ['Spain', 'Netherlands', 'Portugal'],
    cells: [
      [
        // Barcelona × Spain
        [
          { name: 'Andrés Iniesta', accepted: ['iniesta', 'andres iniesta', 'ინიესტა'], pct: 34 },
          { name: 'Xavi', accepted: ['xavi', 'xavi hernandez', 'ჩავი'], pct: 30 },
          { name: 'Sergio Busquets', accepted: ['busquets', 'sergio busquets'], pct: 15 },
          { name: 'Carles Puyol', accepted: ['puyol', 'carles puyol'], pct: 12 },
          { name: 'Pedri', accepted: ['pedri'], pct: 9 },
        ],
        // Barcelona × Netherlands
        [
          { name: 'Frenkie de Jong', accepted: ['de jong', 'frenkie de jong', 'frenkie'], pct: 38 },
          { name: 'Johan Cruyff', accepted: ['cruyff', 'johan cruyff', 'კრუიფი'], pct: 30 },
          { name: 'Memphis Depay', accepted: ['memphis', 'depay', 'memphis depay'], pct: 14 },
          { name: 'Ronald Koeman', accepted: ['koeman', 'ronald koeman'], pct: 10 },
          { name: 'Patrick Kluivert', accepted: ['kluivert', 'patrick kluivert'], pct: 8 },
        ],
        // Barcelona × Portugal
        [
          { name: 'Luís Figo', accepted: ['figo', 'luis figo', 'ფიგო'], pct: 44 },
          { name: 'Deco', accepted: ['deco'], pct: 26 },
          { name: 'João Félix', accepted: ['joao felix', 'felix'], pct: 16 },
          { name: 'João Cancelo', accepted: ['cancelo', 'joao cancelo'], pct: 10 },
          { name: 'Nélson Semedo', accepted: ['semedo', 'nelson semedo'], pct: 4 },
        ],
      ],
      [
        // Liverpool × Spain
        [
          { name: 'Xabi Alonso', accepted: ['xabi alonso', 'alonso', 'xabi'], pct: 38 },
          { name: 'Fernando Torres', accepted: ['torres', 'fernando torres', 'ტორესი'], pct: 32 },
          { name: 'Pepe Reina', accepted: ['reina', 'pepe reina'], pct: 14 },
          { name: 'Luis García', accepted: ['luis garcia', 'garcia'], pct: 11 },
          { name: 'Álvaro Arbeloa', accepted: ['arbeloa', 'alvaro arbeloa'], pct: 5 },
        ],
        // Liverpool × Netherlands
        [
          { name: 'Virgil van Dijk', accepted: ['van dijk', 'virgil van dijk', 'virgil', 'ვან დეიკი'], pct: 52 },
          { name: 'Georginio Wijnaldum', accepted: ['wijnaldum', 'georginio wijnaldum', 'gini'], pct: 22 },
          { name: 'Cody Gakpo', accepted: ['gakpo', 'cody gakpo'], pct: 15 },
          { name: 'Dirk Kuyt', accepted: ['kuyt', 'dirk kuyt', 'kuijt'], pct: 8 },
          { name: 'Ryan Babel', accepted: ['babel', 'ryan babel'], pct: 3 },
        ],
        // Liverpool × Portugal
        [
          { name: 'Diogo Jota', accepted: ['jota', 'diogo jota', 'ჟოტა'], pct: 64 },
          { name: 'Raul Meireles', accepted: ['meireles', 'raul meireles'], pct: 20 },
          { name: 'Fábio Carvalho', accepted: ['fabio carvalho', 'carvalho'], pct: 12 },
          { name: 'Tiago Ilori', accepted: ['ilori', 'tiago ilori'], pct: 4 },
        ],
      ],
      [
        // Bayern × Spain
        [
          { name: 'Thiago Alcântara', accepted: ['thiago', 'thiago alcantara'], pct: 42 },
          { name: 'Javi Martínez', accepted: ['javi martinez', 'martinez'], pct: 26 },
          { name: 'Xabi Alonso', accepted: ['xabi alonso', 'alonso', 'xabi'], pct: 20 },
          { name: 'Juan Bernat', accepted: ['bernat', 'juan bernat'], pct: 8 },
          { name: 'Marc Roca', accepted: ['marc roca', 'roca'], pct: 4 },
        ],
        // Bayern × Netherlands
        [
          { name: 'Arjen Robben', accepted: ['robben', 'arjen robben', 'რობენი'], pct: 56 },
          { name: 'Mark van Bommel', accepted: ['van bommel', 'mark van bommel'], pct: 16 },
          { name: 'Matthijs de Ligt', accepted: ['de ligt', 'matthijs de ligt'], pct: 14 },
          { name: 'Ryan Gravenberch', accepted: ['gravenberch', 'ryan gravenberch'], pct: 10 },
          { name: 'Roy Makaay', accepted: ['makaay', 'roy makaay'], pct: 4 },
        ],
        // Bayern × Portugal
        [
          { name: 'Renato Sanches', accepted: ['renato sanches', 'sanches'], pct: 58 },
          { name: 'João Palhinha', accepted: ['palhinha', 'joao palhinha'], pct: 24 },
          { name: 'Raphaël Guerreiro', accepted: ['guerreiro', 'raphael guerreiro'], pct: 18 },
        ],
      ],
    ],
  },
];
