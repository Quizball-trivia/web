import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { parseDevMix, useDevSoundMix } from '../useDevSoundMix';

describe('shared dev sound assignments', () => {
  beforeEach(() => localStorage.clear());
  it('migrates the old defaults while preserving other custom choices', () => {
    const value = parseDevMix('ranked', JSON.stringify({ submit: 'quizup-cue-15', wrong: 'quizup-cue-06', next: 'quizup-cue-08', goal: 'quizup-cue-02' }), true);
    expect(value).toMatchObject({ submit: 'silent', wrong: 'quizup-cue-15', next: 'silent', goal: 'quizup-cue-02' });
    expect(parseDevMix('ranked', '{broken').wrong).toBe('quizup-cue-15');
    expect(parseDevMix('ranked', '{"wrong":"not-a-sound","invented":"silent"}')).not.toHaveProperty('invented');
  });
  it('shares edits immediately between editor and harness and isolates modes', () => {
    const editor = renderHook(() => useDevSoundMix('ranked'));
    const game = renderHook(() => useDevSoundMix('ranked'));
    const auction = renderHook(() => useDevSoundMix('auction'));
    act(() => editor.result.current[1](previous => ({ ...previous, wrong: 'quizup-cue-04' })));
    expect(game.result.current[0].wrong).toBe('quizup-cue-04');
    expect(auction.result.current[0]).not.toHaveProperty('wrong');
    expect(JSON.parse(localStorage.getItem('quizball-dev-audio-v2-ranked')!).wrong).toBe('quizup-cue-04');
    act(() => game.result.current[1](previous => ({ ...previous, wrong: 'silent' })));
    expect(editor.result.current[0].wrong).toBe('silent');
    editor.unmount(); game.unmount(); auction.unmount();
  });
});
