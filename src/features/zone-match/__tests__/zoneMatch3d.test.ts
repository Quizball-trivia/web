import { describe, expect, it } from 'vitest';
import { pitchColumn, resolveBattle, type AttackZone, type Possession, type ZoneSide } from '../zoneMatch.rules';
import { GOAL_X, columnAt, duelSpots, keeperLocalToWorld, netPocket } from '../zoneMatch3d.layout';
import { blankPose, buildScript, clipPose } from '../zoneMatch3d.director';
import { NO_CARDS } from '../zoneMatch3d.fx';
import { GLOVES_SAVE_NOTE } from '../zoneMatch.machine';

const SIDES: ZoneSide[] = ['player', 'opponent'];
const ZONES: AttackZone[] = ['own', 'centre', 'opponent'];
const ALL: Possession[] = SIDES.flatMap((attacker) => ZONES.map((zone) => ({ attacker, zone })));

describe('duelSpots', () => {
  it('puts the ball in the same zone column as the 2D ball strip', () => {
    for (const p of ALL) expect(columnAt(duelSpots(p).ball.x)).toBe(pitchColumn(p));
  });

  it('has the attacker behind the ball facing the target goal, the defender (or keeper) goal-side', () => {
    for (const p of ALL) {
      const s = duelSpots(p);
      expect(Math.sign(s.ball.x - s.attacker.x)).toBe(s.dir);
      expect(Math.sign(Math.sin(s.attacker.yaw))).toBe(s.dir);
      expect(Math.sign(s.defender.x - s.ball.x)).toBe(s.dir);
      expect(Math.sign(Math.sin(s.defender.yaw))).toBe(-s.dir);
    }
  });

  it('sends the defender into goal as the keeper only for a shot', () => {
    for (const p of ALL) {
      const s = duelSpots(p);
      expect(s.keeper).toBe(p.zone === 'opponent');
      if (s.keeper) expect(Math.abs(s.defender.x)).toBeGreaterThan(GOAL_X - 1);
    }
  });
});

describe('goal geometry', () => {
  it('keeps the keeper-local +x side on the side of the net pocket', () => {
    for (const side of SIDES) {
      const w = keeperLocalToWorld(side, 1.8, 1.2, 0);
      expect(Math.sign(w.z)).toBe(Math.sign(netPocket(side).z));
      expect(Math.sign(w.x)).toBe(Math.sign(netPocket(side).x));
    }
  });
});

describe('cut-out poses', () => {
  it('stands upright and leans into a run, striding', () => {
    const idle = clipPose(blankPose(), 'outfield_idle', 0, Math.PI / 2, 0, 0);
    expect(idle.up.y).toBeCloseTo(1);
    const run = clipPose(blankPose(), 'run', 0.2, Math.PI / 2, 0, 0, 8);
    expect(run.up.x).toBeGreaterThan(0.05);
    expect(run.y).toBeGreaterThan(0);
    // The legs stride.
    expect(Math.abs(run.body.hipL - run.body.hipR)).toBeGreaterThan(20);
    expect(run.face).toBe(1);
    expect(clipPose(blankPose(), 'run', 0.2, -Math.PI / 2, 0, 0, 8).face).toBe(-1);
  });

  it('jumps and spins to celebrate', () => {
    const party = clipPose(blankPose(), 'celebrate_siu', 0.3, 0, 10, 0);
    expect(party.y).toBeGreaterThan(0.5);
    expect(party.spin).toBeGreaterThan(0);
    expect(party.party).toBeCloseTo(9.7);
  });
});

describe('outcome scripts', () => {
  const winners: (ZoneSide | null)[] = ['player', 'opponent', null];

  it('builds a script for every result from every spot, ending in the settle phase (or holding on a goal)', () => {
    for (const from of ALL) {
      for (const winner of winners) {
        const outcome = resolveBattle(from, winner);
        const script = buildScript(from, outcome, 1);
        expect(script.end).toBeGreaterThan(1);
        if (outcome.kind === 'goal') {
          expect(script.end).toBe(Infinity);
          continue;
        }
        expect(script.actor(from.attacker, script.end + 0.01).kind).toBe('settle');
        expect(script.actor(outcome.next.attacker, script.end + 0.01).kind).toBe('settle');
      }
    }
  });

  it('dribbles the attacker into the next zone on an advance, two zones on a skip', () => {
    for (const from of ALL.filter((p) => p.zone !== 'opponent')) {
      for (const steps of [1, 2]) {
        const outcome = resolveBattle(from, from.attacker, { attackerSteps: steps });
        if (outcome.kind !== 'advance') continue;
        const script = buildScript(from, outcome, 1);
        let last = script.actor(from.attacker, 0);
        for (let t = 0; t < script.end; t += 0.05) {
          const frame = script.actor(from.attacker, t);
          if (frame.kind !== 'move') break;
          last = frame;
        }
        expect(last.kind).toBe('move');
        if (last.kind === 'move') expect(columnAt(last.x)).toBe(pitchColumn(outcome.next));
      }
    }
  });

  it('holds a Goalkeeper Gloves save back until the card moment has cleared', () => {
    const from: Possession = { attacker: 'opponent', zone: 'opponent' };
    const outcome = resolveBattle(from, 'player');
    const gloves = { ...NO_CARDS, note: GLOVES_SAVE_NOTE };
    expect(buildScript(from, outcome, 1, gloves).end).toBeGreaterThan(buildScript(from, outcome, 1).end);
    expect(buildScript(from, outcome, 1, gloves).ball(1.1).kind).toBe('at');
  });

  it('lights the new attacker once the ball changes hands', () => {
    const from: Possession = { attacker: 'player', zone: 'centre' };
    const script = buildScript(from, resolveBattle(from, 'opponent'), 1);
    expect(script.lit(0)).toBe('player');
    expect(script.lit(2)).toBe('opponent');
  });
});

describe('steals in 3D', () => {
  it('plays a steal-and-score as a tackle then a shot into the attacker’s own net', () => {
    const from: Possession = { attacker: 'player', zone: 'own' };
    const outcome = resolveBattle(from, 'opponent', { cleanSteal: true });
    expect(outcome).toMatchObject({ kind: 'goal', stolen: true });
    const script = buildScript(from, outcome, 1);
    expect(script.kind).toBe('steal-score');
    expect(script.tackle).toBeDefined();
    // The ball ends in the player's net (the left goal).
    const end = script.ball(4.5);
    expect(end.kind === 'at' && end.x).toBeLessThan(-GOAL_X);
  });

  it('runs a clean steal on into the next zone, and a tiebreak handover not at all', () => {
    const from: Possession = { attacker: 'player', zone: 'centre' };
    const clean = resolveBattle(from, 'opponent', { cleanSteal: true });
    const spot = resolveBattle(from, 'opponent');
    expect(columnAt(duelSpots(clean.next).ball.x)).toBe(0);
    expect(columnAt(duelSpots(spot.next).ball.x)).toBe(1);
  });
});
