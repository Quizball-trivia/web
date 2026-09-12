import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TurnControls } from '../TurnControls';

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({ locale: 'en', t: (key: string) => key }),
}));

const M = 1_000_000;
const base = { minBid: 30 * M, maxBid: 200 * M, currentBudget: 300 * M, mustOpen: false, pendingTurnAction: null };

describe('TurnControls guided mode', () => {
  it('leaves both controls and the custom amount live when unguided', () => {
    render(<TurnControls {...base} onBid={() => {}} onFold={() => {}} />);
    expect(screen.getByText('auctionGame.fold')).toBeEnabled();
    expect(screen.getByText('auctionGame.bidAmount').closest('button')).toBeEnabled();
    expect(screen.getByLabelText('auctionGame.customBidLabel')).toBeInTheDocument();
  });

  it('enables only the fold when the guided step is a fold', async () => {
    const onBid = vi.fn();
    const onFold = vi.fn();
    render(<TurnControls {...base} onBid={onBid} onFold={onFold} allowedAction={{ kind: 'fold' }} />);
    expect(screen.queryByLabelText('auctionGame.customBidLabel')).not.toBeInTheDocument();
    const bid = screen.getByText('auctionGame.bidAmount').closest('button')!;
    expect(bid).toBeDisabled();
    await userEvent.click(screen.getByText('auctionGame.fold'));
    expect(onFold).toHaveBeenCalledTimes(1);
    expect(onBid).not.toHaveBeenCalled();
  });

  it('enables only the quick bid when the guided step is a bid', async () => {
    const onBid = vi.fn();
    const onFold = vi.fn();
    render(<TurnControls {...base} onBid={onBid} onFold={onFold} allowedAction={{ kind: 'bid' }} />);
    expect(screen.getByText('auctionGame.fold')).toBeDisabled();
    await userEvent.click(screen.getByText('auctionGame.bidAmount'));
    expect(onBid).toHaveBeenCalledWith(30 * M);
    expect(onFold).not.toHaveBeenCalled();
  });
});
