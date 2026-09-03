// Hardcoded prototype data — Missing XI. Pitch coordinates are percentages:
// x is left→right, y is top (opposition goal) → bottom (own goal).

export interface XiSlot {
  id: string;
  position: string; // short label shown on the empty shirt, e.g. "GK", "RB"
  shirtNumber: number;
  name: string;
  aliases: string[];
  x: number;
  y: number;
}

export interface XiMatch {
  id: string;
  teamName: string;
  matchLabel: string;
  formation: string;
  slots: XiSlot[];
  decoys: string[];
  /**
   * Scripted opponent turns: which slot it tries and whether it succeeds.
   * Already-claimed slots are skipped at runtime.
   */
  opponentMoves: Array<{ slotId: string; correct: boolean }>;
}

export const missingXiMatches: XiMatch[] = [
  {
    id: "barca-2011",
    teamName: "Barcelona",
    matchLabel: "vs Manchester United — 2011 Champions League Final",
    formation: "4-3-3",
    slots: [
      { id: "gk", position: "GK", shirtNumber: 1, name: "Víctor Valdés", aliases: ["Valdes", "Victor Valdes"], x: 50, y: 88 },
      { id: "rb", position: "RB", shirtNumber: 2, name: "Dani Alves", aliases: ["Alves"], x: 84, y: 68 },
      { id: "rcb", position: "CB", shirtNumber: 3, name: "Gerard Piqué", aliases: ["Pique", "Gerard Pique"], x: 62, y: 72 },
      { id: "lcb", position: "CB", shirtNumber: 14, name: "Javier Mascherano", aliases: ["Mascherano"], x: 38, y: 72 },
      { id: "lb", position: "LB", shirtNumber: 22, name: "Éric Abidal", aliases: ["Abidal", "Eric Abidal"], x: 16, y: 68 },
      { id: "dm", position: "DM", shirtNumber: 16, name: "Sergio Busquets", aliases: ["Busquets"], x: 50, y: 54 },
      { id: "rcm", position: "CM", shirtNumber: 6, name: "Xavi", aliases: ["Xavi Hernandez"], x: 68, y: 44 },
      { id: "lcm", position: "CM", shirtNumber: 8, name: "Andrés Iniesta", aliases: ["Iniesta", "Andres Iniesta"], x: 32, y: 44 },
      { id: "rw", position: "RW", shirtNumber: 17, name: "Pedro", aliases: ["Pedro Rodriguez"], x: 80, y: 24 },
      { id: "cf", position: "CF", shirtNumber: 10, name: "Lionel Messi", aliases: ["Messi"], x: 50, y: 18 },
      { id: "lw", position: "LW", shirtNumber: 7, name: "David Villa", aliases: ["Villa"], x: 20, y: 24 },
    ],
    decoys: [
      "Carles Puyol",
      "Cesc Fàbregas",
      "Seydou Keita",
      "Ibrahim Afellay",
      "Maxwell",
      "Adriano",
      "Alexis Sánchez",
      "Thiago Alcântara",
      "José Manuel Pinto",
      "Bojan Krkić",
    ],
    opponentMoves: [
      { slotId: "cf", correct: true },
      { slotId: "rcm", correct: true },
      { slotId: "gk", correct: true },
      { slotId: "lcb", correct: false },
      { slotId: "rb", correct: true },
      { slotId: "lw", correct: true },
      { slotId: "lb", correct: false },
      { slotId: "dm", correct: true },
      { slotId: "rw", correct: true },
      { slotId: "rcb", correct: true },
      { slotId: "lcm", correct: true },
      { slotId: "lcb", correct: true },
      { slotId: "lb", correct: true },
    ],
  },
  {
    id: "real-2017",
    teamName: "Real Madrid",
    matchLabel: "vs Juventus — 2017 Champions League Final",
    formation: "4-3-1-2",
    slots: [
      { id: "gk", position: "GK", shirtNumber: 1, name: "Keylor Navas", aliases: ["Navas"], x: 50, y: 88 },
      { id: "rb", position: "RB", shirtNumber: 2, name: "Dani Carvajal", aliases: ["Carvajal"], x: 84, y: 68 },
      { id: "rcb", position: "CB", shirtNumber: 5, name: "Raphaël Varane", aliases: ["Varane", "Raphael Varane"], x: 62, y: 72 },
      { id: "lcb", position: "CB", shirtNumber: 4, name: "Sergio Ramos", aliases: ["Ramos"], x: 38, y: 72 },
      { id: "lb", position: "LB", shirtNumber: 12, name: "Marcelo", aliases: [], x: 16, y: 68 },
      { id: "dm", position: "DM", shirtNumber: 14, name: "Casemiro", aliases: [], x: 50, y: 56 },
      { id: "rcm", position: "CM", shirtNumber: 8, name: "Toni Kroos", aliases: ["Kroos"], x: 68, y: 46 },
      { id: "lcm", position: "CM", shirtNumber: 10, name: "Luka Modrić", aliases: ["Modric", "Luka Modric"], x: 32, y: 46 },
      { id: "am", position: "AM", shirtNumber: 22, name: "Isco", aliases: [], x: 50, y: 34 },
      { id: "rs", position: "ST", shirtNumber: 9, name: "Karim Benzema", aliases: ["Benzema"], x: 64, y: 18 },
      { id: "ls", position: "ST", shirtNumber: 7, name: "Cristiano Ronaldo", aliases: ["Ronaldo", "CR7"], x: 36, y: 18 },
    ],
    decoys: [
      "Gareth Bale",
      "Pepe",
      "James Rodríguez",
      "Álvaro Morata",
      "Lucas Vázquez",
      "Marco Asensio",
      "Mateo Kovačić",
      "Nacho",
      "Danilo",
      "Kiko Casilla",
    ],
    opponentMoves: [
      { slotId: "ls", correct: true },
      { slotId: "lcb", correct: true },
      { slotId: "lb", correct: true },
      { slotId: "am", correct: false },
      { slotId: "rcm", correct: true },
      { slotId: "lcm", correct: true },
      { slotId: "gk", correct: false },
      { slotId: "dm", correct: true },
      { slotId: "rs", correct: true },
      { slotId: "rb", correct: true },
      { slotId: "rcb", correct: true },
      { slotId: "am", correct: true },
      { slotId: "gk", correct: true },
    ],
  },
  {
    id: "argentina-2022",
    teamName: "Argentina",
    matchLabel: "vs France — 2022 World Cup Final",
    formation: "4-3-3",
    slots: [
      { id: "gk", position: "GK", shirtNumber: 23, name: "Emiliano Martínez", aliases: ["Emi Martinez", "Emiliano Martinez", "Dibu"], x: 50, y: 88 },
      { id: "rb", position: "RB", shirtNumber: 26, name: "Nahuel Molina", aliases: ["Molina"], x: 84, y: 68 },
      { id: "rcb", position: "CB", shirtNumber: 13, name: "Cristian Romero", aliases: ["Romero", "Cuti Romero"], x: 62, y: 72 },
      { id: "lcb", position: "CB", shirtNumber: 19, name: "Nicolás Otamendi", aliases: ["Otamendi", "Nicolas Otamendi"], x: 38, y: 72 },
      { id: "lb", position: "LB", shirtNumber: 3, name: "Nicolás Tagliafico", aliases: ["Tagliafico", "Nicolas Tagliafico"], x: 16, y: 68 },
      { id: "rcm", position: "CM", shirtNumber: 7, name: "Rodrigo De Paul", aliases: ["De Paul"], x: 70, y: 50 },
      { id: "cm", position: "CM", shirtNumber: 24, name: "Enzo Fernández", aliases: ["Enzo", "Enzo Fernandez"], x: 50, y: 56 },
      { id: "lcm", position: "CM", shirtNumber: 20, name: "Alexis Mac Allister", aliases: ["Mac Allister"], x: 30, y: 50 },
      { id: "rw", position: "RW", shirtNumber: 10, name: "Lionel Messi", aliases: ["Messi"], x: 74, y: 24 },
      { id: "st", position: "ST", shirtNumber: 9, name: "Julián Álvarez", aliases: ["Julian Alvarez", "Alvarez"], x: 50, y: 18 },
      { id: "lw", position: "LW", shirtNumber: 11, name: "Ángel Di María", aliases: ["Di Maria", "Angel Di Maria"], x: 26, y: 24 },
    ],
    decoys: [
      "Lautaro Martínez",
      "Paulo Dybala",
      "Leandro Paredes",
      "Gonzalo Montiel",
      "Germán Pezzella",
      "Marcos Acuña",
      "Exequiel Palacios",
      "Ángel Correa",
      "Franco Armani",
      "Guido Rodríguez",
    ],
    opponentMoves: [
      { slotId: "rw", correct: true },
      { slotId: "lw", correct: true },
      { slotId: "gk", correct: true },
      { slotId: "cm", correct: false },
      { slotId: "st", correct: true },
      { slotId: "rcb", correct: true },
      { slotId: "lcm", correct: false },
      { slotId: "lcb", correct: true },
      { slotId: "rcm", correct: true },
      { slotId: "rb", correct: true },
      { slotId: "lb", correct: true },
      { slotId: "cm", correct: true },
      { slotId: "lcm", correct: true },
    ],
  },
];
