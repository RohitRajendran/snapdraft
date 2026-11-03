import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WhatsNewCard } from './WhatsNewCard';

function setup(items: string[]) {
  const onOpen = vi.fn();
  const onDismiss = vi.fn();
  render(<WhatsNewCard items={items} onOpen={onOpen} onDismiss={onDismiss} />);
  return { onOpen, onDismiss };
}

describe('WhatsNewCard', () => {
  it('lists the items and links to all updates', () => {
    setup(['Corners', 'Colors']);
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Corners',
      'Colors',
    ]);
    expect(screen.getByTestId('whats-new-open')).toHaveTextContent('See all updates');
  });

  it('shows two items and counts the rest', () => {
    setup(['One', 'Two', 'Three', 'Four', 'Five']);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByTestId('whats-new-open')).toHaveTextContent('See 3 more');
  });

  it('does not take focus when it appears', () => {
    setup(['Corners']);
    expect(document.body).toHaveFocus();
  });

  it('reports open and dismiss', async () => {
    const { onOpen, onDismiss } = setup(['Corners']);
    await userEvent.click(screen.getByTestId('whats-new-open'));
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onDismiss).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId('whats-new-dismiss'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
