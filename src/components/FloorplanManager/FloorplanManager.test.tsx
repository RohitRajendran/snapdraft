import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FloorplanManager } from './FloorplanManager';
import { useFloorplanStore } from '../../store/useFloorplanStore/useFloorplanStore';

function resetStores() {
  localStorage.clear();
  useFloorplanStore.setState({ plans: [], activeId: null, past: [], future: [] });
  const id = useFloorplanStore.getState().createPlan('Plan A');
  useFloorplanStore.setState({ activeId: id, past: [], future: [] });
}

describe('FloorplanManager', () => {
  beforeEach(resetStores);

  it('lists existing plans', () => {
    render(<FloorplanManager onClose={vi.fn()} />);
    expect(screen.getByText('Plan A')).toBeInTheDocument();
  });

  it('shows empty state when there are no plans', () => {
    useFloorplanStore.setState({ plans: [], activeId: null });
    render(<FloorplanManager onClose={vi.fn()} />);
    expect(screen.getByText(/No plans yet/i)).toBeInTheDocument();
  });

  it('creates a new plan and calls onClose', async () => {
    const onClose = vi.fn();
    render(<FloorplanManager onClose={onClose} />);
    await userEvent.click(screen.getByTestId('create-plan'));
    expect(useFloorplanStore.getState().plans).toHaveLength(2);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('selecting a plan switches to it and calls onClose', async () => {
    useFloorplanStore.getState().createPlan('Plan B');
    const planB = useFloorplanStore.getState().plans.find((p) => p.name === 'Plan B')!;
    const onClose = vi.fn();

    render(<FloorplanManager onClose={onClose} />);
    await userEvent.click(screen.getByText('Plan B'));
    expect(useFloorplanStore.getState().activeId).toBe(planB.id);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows rename input when rename button is clicked', async () => {
    render(<FloorplanManager onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Rename "Plan A"/i }));
    expect(screen.getByRole('textbox', { name: /Rename plan/i })).toBeInTheDocument();
  });

  it('commits rename on Enter', async () => {
    render(<FloorplanManager onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Rename "Plan A"/i }));
    const input = screen.getByRole('textbox', { name: /Rename plan/i });
    await userEvent.clear(input);
    await userEvent.type(input, 'Renamed Plan');
    await userEvent.keyboard('{Enter}');
    expect(screen.getByText('Renamed Plan')).toBeInTheDocument();
    expect(useFloorplanStore.getState().plans[0].name).toBe('Renamed Plan');
  });

  it('cancels rename on Escape', async () => {
    render(<FloorplanManager onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Rename "Plan A"/i }));
    await userEvent.keyboard('{Escape}');
    expect(screen.getByText('Plan A')).toBeInTheDocument();
  });

  it('deletes a plan when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    render(<FloorplanManager onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Delete "Plan A"/i }));
    expect(useFloorplanStore.getState().plans).toHaveLength(0);
  });

  it('does not delete a plan when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    render(<FloorplanManager onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Delete "Plan A"/i }));
    expect(useFloorplanStore.getState().plans).toHaveLength(1);
  });

  it('shows an error for invalid JSON import', async () => {
    render(<FloorplanManager onClose={vi.fn()} />);

    const file = new File(['not json'], 'plan.json', { type: 'application/json' });
    const fileInput = screen.getByTestId('import-file-input');
    await userEvent.upload(fileInput, file);

    expect(await screen.findByTestId('import-error')).toHaveTextContent('not valid JSON');
  });

  it('closes when backdrop is clicked', async () => {
    const onClose = vi.fn();
    render(<FloorplanManager onClose={onClose} />);
    await userEvent.click(screen.getByTestId('floorplan-manager'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
