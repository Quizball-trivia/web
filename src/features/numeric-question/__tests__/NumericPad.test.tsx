import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NumericPad } from '../NumericPad';

const renderPad = (onSubmit = vi.fn()) => {
  render(<NumericPad precision={0} unit="goals" locked={false} onSubmit={onSubmit} />);
  return onSubmit;
};

describe('NumericPad', () => {
  it('locks in a guess tapped on the pad when Enter is pressed', async () => {
    const user = userEvent.setup();
    const onSubmit = renderPad();
    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '6' }));
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledWith(16);
  });

  it('still locks in with Enter after another control was clicked first', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onMute = vi.fn();
    render(
      <>
        <button type="button" onClick={onMute}>Mute</button>
        <NumericPad precision={0} unit="goals" locked={false} onSubmit={onSubmit} />
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Mute' }));
    await user.click(screen.getByRole('button', { name: '3' }));
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledWith(3);
    expect(onMute).toHaveBeenCalledTimes(1);
  });

  it('locks in a guess typed on the keyboard', async () => {
    const user = userEvent.setup();
    const onSubmit = renderPad();
    await user.keyboard('742{Backspace}5{Enter}');
    expect(onSubmit).toHaveBeenCalledWith(745);
  });

  it('lets a key reached with Tab handle its own Enter instead of locking in early', async () => {
    const user = userEvent.setup();
    const onSubmit = renderPad();
    await user.keyboard('1');
    screen.getByRole('button', { name: '2' }).focus();
    await user.keyboard('{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('does not lock in an empty guess', async () => {
    const user = userEvent.setup();
    const onSubmit = renderPad();
    await user.keyboard('{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('ignores keys once the guess is locked', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NumericPad precision={0} unit="goals" locked onSubmit={onSubmit} />);
    await user.keyboard('5{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
