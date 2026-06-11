import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GoalProgressBar } from '../GoalProgressBar';

/**
 * Regression for the "flight says +90, bar says 80" bug: the meter derives its
 * score as (position - 50) * 2, so it MUST receive the true possession
 * position (0..100), never the 10..90 field-clamped pitch value. With the
 * clamped value, any position past 90 (score 81..99 — i.e. one answer from a
 * goal) displayed as a flat 80.
 */
describe('GoalProgressBar score derivation', () => {
  it('shows 90 for the true position 95 (possessionDiff +90)', () => {
    render(<GoalProgressBar position={95} orientation="horizontal" />);
    expect(screen.getByText('90')).toBeTruthy();
  });

  it('would have shown the buggy 80 for the field-clamped 90 (documents the failure mode)', () => {
    render(<GoalProgressBar position={90} orientation="horizontal" />);
    expect(screen.getByText('80')).toBeTruthy();
  });

  it('shows 0 at midfield and clamps below-even positions to 0', () => {
    const { rerender } = render(<GoalProgressBar position={50} orientation="horizontal" />);
    expect(screen.getByText('0')).toBeTruthy();
    rerender(<GoalProgressBar position={10} orientation="horizontal" />);
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('caps at 100 for the goal threshold', () => {
    render(<GoalProgressBar position={100} orientation="horizontal" />);
    expect(screen.getAllByText('100').length).toBeGreaterThan(0);
  });
});
