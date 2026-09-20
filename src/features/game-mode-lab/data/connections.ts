// Hardcoded prototype data — Connections Race. Groups deliberately contain
// trap overlaps (e.g. Özil won the 2014 World Cup but belongs to the Mourinho
// group), NYT-Connections style.

export interface ConnectionsGroup {
  title: string;
  players: [string, string, string, string];
}

export interface ConnectionsPuzzle {
  id: string;
  label: string;
  groups: ConnectionsGroup[]; // exactly 4
  /**
   * Rival solve schedule: seconds from game start at which it claims its next
   * unsolved group, following groupPreference order.
   */
  opponentSolveAtSeconds: number[];
  /** Group indices in the order the rival tries to claim them. */
  opponentGroupOrder: number[];
}

export const connectionsPuzzles: ConnectionsPuzzle[] = [
  {
    id: "puzzle-1",
    label: "Puzzle 1",
    groups: [
      {
        title: "Played under José Mourinho",
        players: ["Didier Drogba", "Mesut Özil", "Wesley Sneijder", "Zlatan Ibrahimović"],
      },
      {
        title: "Came through the Ajax academy",
        players: ["Frenkie de Jong", "Matthijs de Ligt", "Christian Eriksen", "Rafael van der Vaart"],
      },
      {
        title: "One-club men",
        players: ["Francesco Totti", "Paolo Maldini", "Carles Puyol", "Matt Le Tissier"],
      },
      {
        title: "Won the 2014 World Cup",
        players: ["Thomas Müller", "Toni Kroos", "Philipp Lahm", "Miroslav Klose"],
      },
    ],
    opponentSolveAtSeconds: [35, 80, 130],
    opponentGroupOrder: [3, 0, 1, 2],
  },
  {
    id: "puzzle-2",
    label: "Puzzle 2",
    groups: [
      {
        title: "Wore #7 for Manchester United",
        players: ["Eric Cantona", "David Beckham", "George Best", "Ángel Di María"],
      },
      {
        title: "Played for Napoli",
        players: ["Diego Maradona", "Edinson Cavani", "Gonzalo Higuaín", "Victor Osimhen"],
      },
      {
        title: "Ballon d'Or winners",
        players: ["Fabio Cannavaro", "Andriy Shevchenko", "Rivaldo", "Michael Owen"],
      },
      {
        title: "Finished their career in MLS",
        players: ["Wayne Rooney", "Steven Gerrard", "Frank Lampard", "David Villa"],
      },
    ],
    opponentSolveAtSeconds: [40, 85, 135],
    opponentGroupOrder: [1, 3, 0, 2],
  },
  {
    id: "puzzle-3",
    label: "Puzzle 3",
    groups: [
      {
        title: "Played for both Milan clubs",
        players: ["Andrea Pirlo", "Clarence Seedorf", "Mario Balotelli", "Hakan Çalhanoğlu"],
      },
      {
        title: "Scored in a World Cup final",
        players: ["Zinedine Zidane", "Kylian Mbappé", "Andrés Iniesta", "Mario Götze"],
      },
      {
        title: "Never won the Champions League",
        players: ["Gianluigi Buffon", "Zlatan Ibrahimović", "Alan Shearer", "Roberto Baggio"],
      },
      {
        title: "Managed a club they played for",
        players: ["Pep Guardiola", "Mikel Arteta", "Diego Simeone", "Xavi"],
      },
    ],
    opponentSolveAtSeconds: [38, 82, 132],
    opponentGroupOrder: [1, 0, 3, 2],
  },
];
