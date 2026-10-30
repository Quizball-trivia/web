import { describe, expect, it } from 'vitest';
import { FLOODLIGHT_MS, type CardId } from '../zoneMatch.cards';
import { IDLE, type CardEvent, type Mcq, type MatchState } from '../zoneMatch.machine';
import { resolveBattle, type Possession } from '../zoneMatch.rules';
import { buildScript } from '../zoneMatch3d.director';
import { NO_CARDS, cardFx, type ScriptCards } from '../zoneMatch3d.fx';

const mcqAt = (startedAt: number) => ({ startedAt }) as unknown as Mcq;

function duel(played: { player?: CardId[]; opponent?: CardId[] }, patch: Partial<MatchState> = {}): MatchState {
  return {
    ...IDLE,
    stage: 'play',
    battleStep: 'mcq',
    duelNo: 3,
    played: { player: played.player ?? [], opponent: played.opponent ?? [] },
    mcq: mcqAt(1000),
    ...patch,
  };
}

describe('cardFx', () => {
  it('reads sabotage off the engine: the floodlight window, fog on the player, mud on the victim', () => {
    const fx = cardFx(duel({ opponent: ['floodlight-failure'] }), null);
    expect(fx.dark).toEqual({ victim: 'player', from: 1000, until: 1000 + FLOODLIGHT_MS });
    expect(cardFx(duel({ opponent: ['fog'] }), null).fog).toBe(true);
    expect(cardFx(duel({ player: ['fog'] }), null).fog).toBe(false);
    expect(cardFx(duel({ player: ['muddy-pitch'] }), null).mud).toEqual(['opponent']);
  });

  it('drops a card VAR cancelled and Home Advantage played by both', () => {
    expect(cardFx(duel({ player: ['captains-armband'] }, { cancelled: { player: true, opponent: false } }), null).armband).toBeNull();
    expect(cardFx(duel({ player: ['captains-armband'] }), null).armband).toBe('player');
    expect(cardFx(duel({ player: ['home-advantage'], opponent: ['home-advantage'] }), null).home).toBeNull();
  });

  it('keeps Goalkeeper Gloves on between duels and passes on only this duel’s moment and result cards', () => {
    const stale: CardEvent = { id: 1, duelNo: 2, side: 'player', card: 'fog', effect: '', phase: 'reveal' };
    const result: CardEvent = { id: 2, duelNo: 3, side: 'opponent', card: 'counter-attack', effect: '', phase: 'result' };
    const fx = cardFx(duel({}, { battleStep: 'outcome', gloves: { player: false, opponent: true }, cardEvents: [stale, result] }), stale);
    expect(fx.gloves.opponent).toBe(true);
    expect(fx.moment).toBeNull();
    expect(fx.results).toEqual([{ card: 'counter-attack', side: 'opponent', against: null }]);
  });
});

describe('card-aware outcome scripts', () => {
  const cards = (patch: Partial<ScriptCards>): ScriptCards => ({ ...NO_CARDS, ...patch });
  const centre: Possession = { attacker: 'player', zone: 'centre' };
  const shot: Possession = { attacker: 'player', zone: 'opponent' };

  it('raises the linesman flag on an Offside Trap', () => {
    const script = buildScript(centre, resolveBattle(centre, 'opponent'), 1, cards({ note: 'Offside trap!' }));
    expect(script.kind).toBe('offside');
    expect(script.fx!(1).flag?.up).toBeGreaterThan(0.9);
  });

  it('lofts a Long Ball, landed or cut out', () => {
    const own: Possession = { attacker: 'player', zone: 'own' };
    expect(buildScript(own, resolveBattle(own, 'player', { attackerSteps: 2 }), 1, cards({ note: 'Long Ball lands' })).kind).toBe('long-ball');
    const cut = buildScript(own, resolveBattle(own, 'opponent'), 1, cards({ note: 'Long Ball cut out' }));
    expect(cut.kind).toBe('long-ball-cut');
    const high = cut.ball(0.8);
    expect(high.kind === 'at' && high.y).toBeGreaterThan(1);
  });

  it('parks the bus for a held duel, and lets a Golden Boot knock it aside', () => {
    const held = buildScript(centre, resolveBattle(centre, 'player', { holdGround: true }), 1, cards({ results: [{ card: 'park-the-bus', side: 'opponent', against: null }] }));
    expect(held.fx!(0.8).bus).toMatchObject({ burst: 0 });
    const golden = buildScript(shot, resolveBattle(shot, 'player'), 1, cards({ results: [{ card: 'golden-boot', side: 'player', against: 'park-the-bus' }] }));
    expect(golden.fx!(0.5).bus?.burst).toBe(0);
    expect(golden.fx!(0.9).ballTrail).toBe('gold');
    expect(golden.fx!(2).bus?.burst).toBe(1);
  });

  it('draws the Long Ball flight path and flicks a First Touch win over the defender', () => {
    const own: Possession = { attacker: 'player', zone: 'own' };
    const lob = buildScript(own, resolveBattle(own, 'player', { attackerSteps: 2 }), 1, cards({ note: 'Long Ball lands' }));
    expect(lob.fx!(1).arc?.height).toBeGreaterThan(5);
    const flick = buildScript(centre, resolveBattle(centre, 'player'), 1, cards({ note: 'First Touch' }));
    const up = flick.ball(0.67);
    expect(up.kind === 'at' && up.y).toBeGreaterThan(1);
  });

  it('plays the Tiki-Taka one-two and the Counter-Attack break', () => {
    const own: Possession = { attacker: 'player', zone: 'own' };
    const tiki = buildScript(own, resolveBattle(own, 'player', { attackerSteps: 2 }), 1, cards({ results: [{ card: 'tiki-taka', side: 'player', against: null }] }));
    expect(tiki.fx!(0.7).ghosts[0]?.side).toBe('player');
    const counter = buildScript(centre, resolveBattle(centre, 'opponent'), 1, cards({ results: [{ card: 'counter-attack', side: 'opponent', against: null }] }));
    expect(counter.fx!(2).trail).toEqual(['opponent']);
  });
});
