import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PartyRoundTransitionOverlay } from '../PartyRoundTransitionOverlay';

describe('PartyRoundTransitionOverlay', () => {
  it('renders the question number and round info when visible', () => {
    render(
      <PartyRoundTransitionOverlay
        visible
        questionNumber={4}
        totalQuestions={10}
        categoryName="Football History"
      />,
    );

    expect(screen.getByText(/Question 4/)).toBeInTheDocument();
    expect(screen.getByText(/Question 4 of 10/)).toBeInTheDocument();
    expect(screen.getByText('Football History')).toBeInTheDocument();
  });

  it('renders nothing when hidden', () => {
    const { container } = render(
      <PartyRoundTransitionOverlay
        visible={false}
        questionNumber={4}
        totalQuestions={10}
        categoryName="Football History"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
