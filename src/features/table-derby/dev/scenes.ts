/** Every screen of the prototype that can be opened on its own, as the
 *  query string /table-derby understands (see the dev deep-link effect in
 *  TableDerbyApp). `live` scenes play (bot opponent, ✓ ✗ = skip buttons);
 *  the rest are frozen so a single screen can be iterated on. */

export interface Scene {
  id: string;
  label: string;
  query: string;
  live?: boolean;
  /** Round scenes honour the starter toggle. */
  starter?: boolean;
}

export interface SceneGroup {
  title: string;
  scenes: Scene[];
}

export const SCENE_GROUPS: SceneGroup[] = [
  {
    title: 'Shell',
    scenes: [
      { id: 'tab-home', label: 'Home', query: 'tab=home', live: true },
      { id: 'tab-leaderboard', label: 'Leaderboard', query: 'tab=leaderboard', live: true },
      { id: 'tab-daily', label: 'Daily tab', query: 'tab=daily', live: true },
      { id: 'tab-solo', label: 'Practice tab (ივარჯიშე)', query: 'tab=solo', live: true },
      { id: 'tab-profile', label: 'Profile', query: 'tab=profile', live: true },
      { id: 'no-tickets', label: 'No tickets modal', query: 'scene=no-tickets' },
      { id: 'loader', label: 'Boot loader', query: 'scene=loader' },
      { id: 'onboarding', label: 'Onboarding', query: 'scene=onboarding', live: true },
    ],
  },
  {
    title: 'Practice · streak',
    scenes: [
      { id: 'streak-run', label: 'Streak run', query: 'tab=solo&game=streak', live: true },
      { id: 'streak-result', label: 'Result · 7 (best 12)', query: 'tab=solo&game=streak&streak=7' },
      { id: 'streak-record', label: 'Result · new record 23', query: 'tab=solo&game=streak&streak=23&record=1' },
    ],
  },
  {
    title: 'Daily games',
    scenes: [
      { id: 'daily-fl', label: 'Football Logic', query: 'tab=daily&game=footballLogic', live: true },
      { id: 'daily-pio', label: 'Put in Order', query: 'tab=daily&game=putInOrder', live: true },
      { id: 'daily-cp', label: 'Career Path', query: 'tab=daily&game=careerPath', live: true },
      { id: 'daily-result-reward', label: 'Result · first today (+1 ticket)', query: 'tab=daily&game=footballLogic&result=640&reward=1' },
      { id: 'daily-result-again', label: 'Result · replay (no reward)', query: 'tab=daily&game=footballLogic&result=310' },
      { id: 'daily-result-pio', label: 'Result · Put in Order', query: 'tab=daily&game=putInOrder&result=175&reward=1' },
      { id: 'daily-result-cp', label: 'Result · Career Path', query: 'tab=daily&game=careerPath&result=420&reward=1' },
    ],
  },
  {
    title: 'Match flow',
    scenes: [
      { id: 'matchmaking', label: 'Matchmaking', query: 'scene=matchmaking' },
      { id: 'showdown', label: 'Showdown + RPS', query: 'scene=showdown', live: true },
      { id: 'intro-1', label: 'Intro · Round I', query: 'scene=intro-1' },
      { id: 'intro-2', label: 'Intro · Round II', query: 'scene=intro-2' },
      { id: 'intro-3', label: 'Intro · Round III', query: 'scene=intro-3' },
      { id: 'intro-penalties', label: 'Intro · Penalties', query: 'scene=intro-penalties' },
      { id: 'intro-sudden', label: 'Intro · Sudden death', query: 'scene=intro-sudden' },
    ],
  },
  {
    title: 'Rounds (live)',
    scenes: [
      { id: 'round-1', label: 'I · ბარათონი', query: 'round=1', live: true, starter: true },
      { id: 'round-2', label: 'II · გამარჯობა, ჩემი სახელია', query: 'round=2', live: true, starter: true },
      { id: 'round-3', label: 'III · პაპა კარლოს ყუთი', query: 'round=3', live: true, starter: true },
      { id: 'round-pen', label: 'Penalties', query: 'round=penalties', live: true, starter: true },
      { id: 'round-sudden', label: 'Penalties · sudden death', query: 'round=sudden', live: true, starter: true },
    ],
  },
  {
    title: 'Results',
    scenes: [
      { id: 'round-end-win', label: 'Round won (1–0)', query: 'scene=round-end-win' },
      { id: 'round-end-lose', label: 'Round lost (1–1)', query: 'scene=round-end-lose' },
      { id: 'round-end-tie-last', label: 'Round III tie → penalties', query: 'scene=round-end-tie-last' },
      { id: 'round-end-decider', label: 'Round III win → results', query: 'scene=round-end-decider' },
      { id: 'match-end-win', label: 'Match won · ranked', query: 'scene=match-end-win' },
      { id: 'match-end-lose', label: 'Match lost · ranked', query: 'scene=match-end-lose' },
      { id: 'match-end-solo', label: 'Match end · solo', query: 'scene=match-end-solo' },
    ],
  },
];

export const ALL_SCENES: Scene[] = SCENE_GROUPS.flatMap((g) => g.scenes);
