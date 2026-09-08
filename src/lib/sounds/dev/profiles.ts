export type DevSoundMode = 'ranked' | 'grid' | 'auction';
export type DevSoundEvent = 'select' | 'submit' | 'correct' | 'wrong' | 'next' | 'reveal' | 'tick' | 'timeout' | 'start' | 'turn' | 'goal' | 'save' | 'win' | 'lose' | 'draw' | 'pass' | 'kick' | 'whistle' | 'bid' | 'fold' | 'sold' | 'auctionWon' | 'finish';

export const EVENT_LABELS: Record<DevSoundEvent, string> = {
  finish: 'Match finished', select: 'Select / place', submit: 'Submit answer', correct: 'Correct answer', wrong: 'Wrong answer',
  next: 'New question', reveal: 'Clue / stat reveal', tick: 'Final seconds', timeout: 'Time expired',
  start: 'Match starts', turn: 'Your turn', goal: 'Goal celebration', save: 'Shot saved',
  win: 'Match won', lose: 'Match lost', draw: 'Draw', pass: 'Ball pass', kick: 'Ball contact',
  whistle: 'Phase whistle', bid: 'Bid accepted', fold: 'Fold accepted', sold: 'Player sold', auctionWon: 'Auction lot won',
};
// Editorial proposals, not claims about the original QuizUp event names.
const common = {
  select: 'quizup-cue-14', submit: 'silent', correct: 'quizup-cue-05', wrong: 'quizup-cue-15',
  next: 'silent', reveal: 'quizup-cue-17', tick: 'quizup-cue-25', timeout: 'quizup-cue-12',
  start: 'quizup-cue-09', turn: 'quizup-cue-20', goal: 'quizup-cue-01', save: 'quizup-cue-07',
  win: 'quizup-cue-01', lose: 'quizup-cue-03', draw: 'quizup-cue-02',
};
export const DEV_SOUND_PROFILES: Record<DevSoundMode, Partial<Record<DevSoundEvent, string>>> = {
  ranked: { submit: common.submit, correct: common.correct, wrong: common.wrong, next: common.next, tick: common.tick, timeout: common.timeout, goal: common.goal, save: common.save, win: common.win, lose: common.lose, draw: common.draw, pass: 'existing-pass', kick: 'existing-kick', whistle: 'existing-whistle' },
  grid: { select: common.select, start: common.start, correct: common.correct, wrong: common.wrong, reveal: common.reveal, turn: common.turn, tick: common.tick, timeout: common.timeout, win: common.win, lose: common.lose, draw: common.draw },
  auction: {
    reveal: common.reveal, timeout: common.timeout, finish: common.win,
    bid: 'existing-auctionBid', fold: 'existing-auctionFold', sold: 'existing-auctionReveal',
    auctionWon: 'existing-auctionWon',
  },
};
export const EXISTING_EVENT_MAP: Record<string, DevSoundEvent> = {
  dailyCorrect: 'correct', correctRanked: 'correct', wrongAnswer: 'wrong',
  pass: 'pass', kick: 'kick', whistle: 'whistle',
  auctionClue: 'reveal', auctionBid: 'bid', auctionFold: 'fold', auctionReveal: 'sold',
  auctionWon: 'auctionWon', auctionWarning: 'timeout', auctionFinished: 'finish',
};
export const HARNESS_LINKS: Record<DevSoundMode, string> = {
  ranked: '/dev/animations', grid: '/dev/football-tic-tac-toe', auction: '/dev/auction-play',
};
