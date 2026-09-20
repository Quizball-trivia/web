import type { TacticsGoalDef } from "../lib/tacticsEngine";

/**
 * Five iconic goals choreographed for the tactics board. Coordinates are on a
 * 68×105 pitch, attack toward y=105. The shapes are faithful to the famous
 * footage (long diagonals, solo slaloms, one-twos) without pretending to be
 * frame-accurate telemetry.
 */
export const TACTICS_GOALS: TacticsGoalDef[] = [
  {
    id: "carlos-alberto-1970",
    title: "Carlos Alberto — Brazil 4–1 Italy, 1970 World Cup final",
    options: [
      "Carlos Alberto — Brazil vs Italy, 1970 World Cup final",
      "Esteban Cambiasso — Argentina vs Serbia, 2006 World Cup",
      "Jack Wilshere — Arsenal vs Norwich, 2013",
      "Dennis Bergkamp — Arsenal vs Newcastle, 2002",
    ],
    answerIndex: 0,
    funFact:
      "Voted the greatest team goal in World Cup history — Pelé rolled the ball into Carlos Alberto's path without even looking up.",
    players: [
      { id: "clodoaldo", team: "attack", at: [28, 26] },
      { id: "rivelino", team: "attack", at: [8, 44] },
      { id: "jairzinho", team: "attack", at: [14, 64] },
      { id: "pele", team: "attack", at: [34, 78] },
      { id: "tostao", team: "attack", at: [42, 88] },
      { id: "carlos_alberto", team: "attack", at: [58, 38] },
      { id: "d1", team: "defense", at: [24, 34] },
      { id: "d2", team: "defense", at: [31, 38] },
      { id: "d3", team: "defense", at: [20, 70] },
      { id: "d4", team: "defense", at: [30, 84] },
      { id: "d5", team: "defense", at: [44, 92] },
      { id: "gk", team: "keeper", at: [34, 103] },
    ],
    steps: [
      { kind: "carry", player: "clodoaldo", to: [30, 42], via: [21, 35], duration: 2.2 },
      { kind: "pass", player: "clodoaldo", to: [9, 46], duration: 1.0 },
      { kind: "pass", player: "rivelino", to: [14, 64], loft: 0.4, duration: 1.1 },
      { kind: "carry", player: "jairzinho", to: [25, 74], via: [18, 70], duration: 1.6 },
      { kind: "pass", player: "jairzinho", to: [35, 80], duration: 0.9 },
      { kind: "run", player: "carlos_alberto", to: [52, 86], withPrev: true, duration: 2.0 },
      { kind: "pass", player: "pele", to: [52, 86], duration: 1.0 },
      { kind: "shot", player: "carlos_alberto", to: [36, 105], loft: 0.15, duration: 0.7 },
    ],
    bonus: {
      question: "Who rolled the assist into Carlos Alberto's path?",
      options: ["Jairzinho", "Pelé", "Rivelino", "Tostão"],
      answerIndex: 1,
    },
  },
  {
    id: "maradona-1986",
    title: "Diego Maradona — Argentina 2–1 England, 1986 World Cup",
    options: [
      "Lionel Messi — Barcelona vs Getafe, 2007",
      "George Weah — AC Milan vs Verona, 1996",
      "Diego Maradona — Argentina vs England, 1986 World Cup",
      "Ryan Giggs — Man United vs Arsenal, 1999",
    ],
    answerIndex: 2,
    funFact:
      "The 'Goal of the Century' — 10.6 seconds, ~60 metres, five England players and Shilton beaten, four minutes after the Hand of God.",
    players: [
      { id: "maradona", team: "attack", at: [44, 38] },
      { id: "valdano", team: "attack", at: [22, 80] },
      { id: "d1", team: "defense", at: [48, 44] },
      { id: "d2", team: "defense", at: [43, 50] },
      { id: "d3", team: "defense", at: [48, 66] },
      { id: "d4", team: "defense", at: [38, 86] },
      { id: "d5", team: "defense", at: [31, 94] },
      { id: "gk", team: "keeper", at: [34, 101] },
    ],
    steps: [
      { kind: "carry", player: "maradona", to: [46, 56], via: [51, 46], duration: 1.7 },
      { kind: "carry", player: "maradona", to: [44, 78], via: [53, 68], duration: 1.7 },
      { kind: "carry", player: "maradona", to: [35, 92], via: [40, 86], duration: 1.5 },
      { kind: "carry", player: "maradona", to: [30, 99], via: [29, 95], duration: 1.2 },
      { kind: "shot", player: "maradona", to: [33, 105], duration: 0.6 },
    ],
    bonus: {
      question: "Minutes before this goal, the same match saw…",
      options: [
        "A missed England penalty",
        "The 'Hand of God' goal",
        "A red card for Argentina",
        "An own goal by Shilton",
      ],
      answerIndex: 1,
    },
  },
  {
    id: "messi-getafe-2007",
    title: "Lionel Messi — Barcelona 5–2 Getafe, 2007 Copa del Rey",
    options: [
      "Diego Maradona — Argentina vs England, 1986 World Cup",
      "Lionel Messi — Barcelona vs Getafe, 2007",
      "Saeed Al-Owairan — Saudi Arabia vs Belgium, 1994",
      "Lionel Messi — Copa del Rey final vs Athletic, 2015",
    ],
    answerIndex: 1,
    funFact:
      "An eerie mirror of Maradona '86, 21 years on — same start near halfway, same slalom, but Messi went round the keeper to the right.",
    players: [
      { id: "messi", team: "attack", at: [48, 40] },
      { id: "eto", team: "attack", at: [24, 82] },
      { id: "d1", team: "defense", at: [52, 46] },
      { id: "d2", team: "defense", at: [46, 52] },
      { id: "d3", team: "defense", at: [54, 72] },
      { id: "d4", team: "defense", at: [44, 90] },
      { id: "d5", team: "defense", at: [36, 96] },
      { id: "gk", team: "keeper", at: [34, 101] },
    ],
    steps: [
      { kind: "carry", player: "messi", to: [51, 58], via: [56, 48], duration: 1.6 },
      { kind: "carry", player: "messi", to: [52, 80], via: [57, 70], duration: 1.6 },
      { kind: "carry", player: "messi", to: [42, 94], via: [47, 88], duration: 1.4 },
      { kind: "carry", player: "messi", to: [39, 100], via: [42, 98], duration: 1.1 },
      { kind: "shot", player: "messi", to: [34, 105], loft: 0.2, duration: 0.6 },
    ],
    bonus: {
      question: "Which competition was this Messi goal scored in?",
      options: ["La Liga", "Champions League", "Copa del Rey", "Supercopa"],
      answerIndex: 2,
    },
  },
  {
    id: "bergkamp-1998",
    title: "Dennis Bergkamp — Netherlands 2–1 Argentina, 1998 World Cup",
    options: [
      "Dennis Bergkamp — Arsenal vs Newcastle, 2002",
      "Marco van Basten — Netherlands vs USSR, Euro '88",
      "David Trezeguet — France vs Italy, Euro 2000 final",
      "Dennis Bergkamp — Netherlands vs Argentina, 1998 World Cup",
    ],
    answerIndex: 3,
    funFact:
      "89th-minute winner in the quarter-final: a 60-yard De Boer diagonal killed with one touch, Ayala beaten with the second, finished with the third.",
    players: [
      { id: "f_de_boer", team: "attack", at: [18, 26] },
      { id: "bergkamp", team: "attack", at: [54, 72] },
      { id: "kluivert", team: "attack", at: [30, 82] },
      { id: "d1", team: "defense", at: [26, 60] },
      { id: "d2", team: "defense", at: [40, 74] },
      { id: "ayala", team: "defense", at: [52, 90] },
      { id: "d4", team: "defense", at: [30, 92] },
      { id: "gk", team: "keeper", at: [34, 102] },
    ],
    steps: [
      { kind: "carry", player: "f_de_boer", to: [20, 33], duration: 1.2 },
      { kind: "pass", player: "f_de_boer", to: [55, 87], via: [34, 62], loft: 1, duration: 1.9 },
      { kind: "run", player: "bergkamp", to: [55, 87], withPrev: true, duration: 1.7 },
      { kind: "carry", player: "bergkamp", to: [50, 94], via: [55, 91], duration: 1.3 },
      { kind: "shot", player: "bergkamp", to: [32, 104], loft: 0.35, duration: 0.7 },
    ],
    bonus: {
      question: "Who hit the 60-yard pass Bergkamp plucked out of the air?",
      options: ["Edgar Davids", "Ronald de Boer", "Frank de Boer", "Clarence Seedorf"],
      answerIndex: 2,
    },
  },
  {
    id: "cambiasso-2006",
    title: "Esteban Cambiasso — Argentina 6–0 Serbia, 2006 World Cup",
    options: [
      "Carlos Alberto — Brazil vs Italy, 1970 World Cup final",
      "Esteban Cambiasso — Argentina vs Serbia, 2006 World Cup",
      "Jack Wilshere — Arsenal vs Norwich, 2013",
      "Dennis Bergkamp — Arsenal vs Newcastle, 2002",
    ],
    answerIndex: 1,
    funFact:
      "The climax of a 24-pass move — Crespo's blind backheel returned Cambiasso's pass, and the finish flew in off the crossbar.",
    players: [
      { id: "riquelme", team: "attack", at: [48, 60] },
      { id: "saviola", team: "attack", at: [26, 66] },
      { id: "cambiasso", team: "attack", at: [38, 70] },
      { id: "crespo", team: "attack", at: [37, 88] },
      { id: "d1", team: "defense", at: [34, 76] },
      { id: "d2", team: "defense", at: [44, 82] },
      { id: "d3", team: "defense", at: [30, 90] },
      { id: "d4", team: "defense", at: [42, 94] },
      { id: "gk", team: "keeper", at: [34, 102] },
    ],
    steps: [
      { kind: "pass", player: "riquelme", to: [27, 66], duration: 1.0 },
      { kind: "pass", player: "saviola", to: [38, 71], duration: 0.9 },
      { kind: "pass", player: "cambiasso", to: [37, 88], duration: 1.0 },
      { kind: "run", player: "cambiasso", to: [36, 84], withPrev: true, duration: 1.0 },
      { kind: "pass", player: "crespo", to: [36, 84], duration: 0.7 },
      { kind: "shot", player: "cambiasso", to: [33, 105], loft: 0.45, duration: 0.7 },
    ],
    bonus: {
      question: "Roughly how many passes did Argentina string together first?",
      options: ["8", "15", "24", "31"],
      answerIndex: 2,
    },
  },
];
