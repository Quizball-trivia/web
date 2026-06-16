import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MatchWaitingForReadyOverlay } from '../MatchWaitingForReadyOverlay';

describe('MatchWaitingForReadyOverlay', () => {
  it('renders a waiting state without presenting the safety ceiling as a countdown', () => {
    render(
      <MatchWaitingForReadyOverlay
        title="Waiting for opponent"
        readyLabel="1/2 ready"
        detailLabel="Kickoff starts when screens are ready"
      />,
    );

    expect(screen.getByText('Waiting for opponent')).toBeInTheDocument();
    expect(screen.getByText('1/2 ready')).toBeInTheDocument();
    expect(screen.getByText('Kickoff starts when screens are ready')).toBeInTheDocument();
    expect(screen.getByTestId('match-ready-spinner')).toBeInTheDocument();
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });
});
