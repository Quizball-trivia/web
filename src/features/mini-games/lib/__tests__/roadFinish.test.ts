import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ROAD_GOAL_X, ROAD_GOAL_IMPACT, ROAD_SHOT_CONTACT, sampleRoadShot, updateRoadFinish, type RoadFinishState } from '../roadFinish';
const create = (): RoadFinishState => ({ started: null, elapsed: null, saved: false, catchPoint: new THREE.Vector3() });
describe('Road to Goal final opponent', () => {
  it('leaves early-zone losses to the tackle', () => {
    const state = create(); updateRoadFinish(state, 9, 'tackle', 5);
    expect(state.elapsed).toBeNull();
  });
  it.each([['correct', 'complete', 11, false], ['tackle', 'tackled', 10, true]] as const)('keeps one shot clock across %s to %s', (first, terminal, progress, saved) => {
    const state = create(); updateRoadFinish(state, 10, first, 5);
    updateRoadFinish(state, progress, terminal, 7.3);
    expect(state.elapsed).toBeCloseTo(2.3); expect(state.saved).toBe(saved);
    updateRoadFinish(state, 10, 'question', 8); expect(state.elapsed).toBeNull();
    updateRoadFinish(state, 10, first, 9); expect(state.elapsed).toBe(0);
  });
  it('plays a saved shot for a restored final-zone loss', () => {
    const state = create(); updateRoadFinish(state, 10, 'tackled', 5);
    expect(state.saved).toBe(true); expect(state.elapsed).toBe(0);
  });
  it('arrives at the keeper and follows the caught ball without a discontinuity', () => {
    const ball = new THREE.Vector3(), caught = new THREE.Vector3(ROAD_GOAL_X - .735, 2.5375, 4.0375);
    sampleRoadShot(ball, ROAD_SHOT_CONTACT - .0001, true, caught);
    expect(ball.distanceTo(caught)).toBeLessThan(.005);
    caught.set(ROAD_GOAL_X - 1, .6, 4); sampleRoadShot(ball, 2, true, caught);
    expect(ball.equals(caught)).toBe(true);
  });
  it.each(['parry', 'tip'] as const)('turns a %s away from the rotated Road goal', style => {
    const ball = new THREE.Vector3();
    sampleRoadShot(ball, ROAD_SHOT_CONTACT, true, new THREE.Vector3(), style);
    const contactX = ball.x;
    sampleRoadShot(ball, ROAD_SHOT_CONTACT + .5, true, new THREE.Vector3(), style);
    expect(ball.x).toBeLessThan(contactX - 1);
    expect(ball.y).toBeGreaterThanOrEqual(.17);
  });
  it('scores inside the goal then settles above the turf', () => {
    const ball = new THREE.Vector3(), caught = new THREE.Vector3();
    sampleRoadShot(ball, ROAD_GOAL_IMPACT, false, caught);
    expect(ball.x).toBeGreaterThan(ROAD_GOAL_X); expect(ball.y).toBeLessThan(3.2); expect(ball.z).toBeLessThan(5.05);
    for (let t = ROAD_GOAL_IMPACT; t < 6; t += .016) { sampleRoadShot(ball, t, false, caught); expect(ball.y).toBeGreaterThanOrEqual(.17); }
    expect(ball.y).toBeCloseTo(.17);
  });
});
