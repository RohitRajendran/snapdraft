import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { MultiSelectBar } from './MultiSelectBar';
import { useToolStore } from '../../../store/useToolStore/useToolStore';
import { useFloorplanStore } from '../../../store/useFloorplanStore/useFloorplanStore';
import type { Element } from '../../../types';

const wall = (id: string): Element => ({
  id,
  type: 'wall',
  points: [
    { x: 0, y: 0 },
    { x: 5, y: 0 },
  ],
});

function resetStores() {
  localStorage.clear();
  useFloorplanStore.setState({ plans: [], activeId: null, past: [], future: [] });
  const id = useFloorplanStore.getState().createPlan('Test');
  useFloorplanStore.setState({ activeId: id, past: [], future: [] });
  useToolStore.setState({ selectedIds: new Set(), selectedId: null });
}

describe('MultiSelectBar', () => {
  beforeEach(resetStores);

  it('renders nothing when fewer than 2 items are selected', () => {
    useToolStore.setState({ selectedIds: new Set(['a']), selectedId: 'a' });
    render(<MultiSelectBar />);
    expect(screen.queryByTestId('multi-select-bar')).not.toBeInTheDocument();
  });

  it('renders nothing when nothing is selected', () => {
    render(<MultiSelectBar />);
    expect(screen.queryByTestId('multi-select-bar')).not.toBeInTheDocument();
  });

  it('shows item count when 2 or more items are selected', () => {
    useToolStore.setState({ selectedIds: new Set(['a', 'b']), selectedId: null });
    render(<MultiSelectBar />);
    expect(screen.getByText('2 items selected')).toBeInTheDocument();
  });

  it('Delete all removes the selected elements', async () => {
    const w1 = wall('w1');
    const w2 = wall('w2');
    useFloorplanStore.getState().addElement(w1);
    useFloorplanStore.getState().addElement(w2);
    useToolStore.setState({ selectedIds: new Set(['w1', 'w2']), selectedId: null });

    render(<MultiSelectBar />);
    await userEvent.click(screen.getByTestId('delete-selected'));

    const elements = useFloorplanStore.getState().activePlan()?.elements ?? [];
    expect(elements).toHaveLength(0);
  });

  it('Delete all clears the selection', async () => {
    useToolStore.setState({ selectedIds: new Set(['a', 'b']), selectedId: null });
    render(<MultiSelectBar />);
    await userEvent.click(screen.getByTestId('delete-selected'));
    expect(useToolStore.getState().selectedIds.size).toBe(0);
  });

  it('Clear clears the selection without deleting elements', async () => {
    const w1 = wall('w1');
    const w2 = wall('w2');
    useFloorplanStore.getState().addElement(w1);
    useFloorplanStore.getState().addElement(w2);
    useToolStore.setState({ selectedIds: new Set(['w1', 'w2']), selectedId: null });

    render(<MultiSelectBar />);
    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }));

    expect(useToolStore.getState().selectedIds.size).toBe(0);
    const elements = useFloorplanStore.getState().activePlan()?.elements ?? [];
    expect(elements).toHaveLength(2);
  });
});
