import { useRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { useFocusTrap } from './useFocusTrap';

function Trap({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, onClose);
  return (
    <div ref={ref}>
      <button>First</button>
      <button>Second</button>
      <button>Last</button>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('focuses the first focusable element on mount', () => {
    render(<Trap onClose={vi.fn()} />);
    expect(screen.getByText('First')).toHaveFocus();
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    render(<Trap onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('wraps Tab forward from last element to first', async () => {
    render(<Trap onClose={vi.fn()} />);
    screen.getByText('Last').focus();
    await userEvent.keyboard('{Tab}');
    expect(screen.getByText('First')).toHaveFocus();
  });

  it('wraps Shift+Tab backward from first element to last', async () => {
    render(<Trap onClose={vi.fn()} />);
    screen.getByText('First').focus();
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByText('Last')).toHaveFocus();
  });

  it('does not wrap Tab when focus is not on the last element', async () => {
    render(<Trap onClose={vi.fn()} />);
    screen.getByText('First').focus();
    await userEvent.keyboard('{Tab}');
    expect(screen.getByText('Second')).toHaveFocus();
  });
});
