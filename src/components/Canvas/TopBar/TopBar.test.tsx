import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { TopBar } from './TopBar';
import { useFloorplanStore } from '../../../store/useFloorplanStore/useFloorplanStore';

function resetStores() {
  localStorage.clear();
  useFloorplanStore.setState({ plans: [], activeId: null, past: [], future: [] });
  const id = useFloorplanStore.getState().createPlan('My Plan');
  useFloorplanStore.setState({ activeId: id, past: [], future: [] });
}

describe('TopBar', () => {
  beforeEach(resetStores);

  it('shows the active plan name', () => {
    render(<TopBar />);
    expect(screen.getByTestId('plan-name-btn')).toHaveTextContent('My Plan');
  });

  it('shows rename input on double-click', async () => {
    render(<TopBar />);
    await userEvent.dblClick(screen.getByTestId('plan-name-btn'));
    expect(screen.getByTestId('plan-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('plan-name-input')).toHaveValue('My Plan');
  });

  it('commits rename on Enter', async () => {
    render(<TopBar />);
    await userEvent.dblClick(screen.getByTestId('plan-name-btn'));
    const input = screen.getByTestId('plan-name-input');
    await userEvent.clear(input);
    await userEvent.type(input, 'New Name');
    await userEvent.keyboard('{Enter}');
    expect(screen.getByTestId('plan-name-btn')).toHaveTextContent('New Name');
    expect(useFloorplanStore.getState().activePlan()?.name).toBe('New Name');
  });

  it('commits rename on blur', async () => {
    render(<TopBar />);
    await userEvent.dblClick(screen.getByTestId('plan-name-btn'));
    const input = screen.getByTestId('plan-name-input');
    await userEvent.clear(input);
    await userEvent.type(input, 'Renamed');
    await userEvent.tab();
    expect(useFloorplanStore.getState().activePlan()?.name).toBe('Renamed');
  });

  it('cancels rename on Escape without changing the name', async () => {
    render(<TopBar />);
    await userEvent.dblClick(screen.getByTestId('plan-name-btn'));
    const input = screen.getByTestId('plan-name-input');
    await userEvent.clear(input);
    await userEvent.type(input, 'Discarded Name');
    await userEvent.keyboard('{Escape}');
    expect(screen.getByTestId('plan-name-btn')).toHaveTextContent('My Plan');
    expect(useFloorplanStore.getState().activePlan()?.name).toBe('My Plan');
  });

  it('does not rename when committed name is blank', async () => {
    render(<TopBar />);
    await userEvent.dblClick(screen.getByTestId('plan-name-btn'));
    const input = screen.getByTestId('plan-name-input');
    await userEvent.clear(input);
    await userEvent.keyboard('{Enter}');
    expect(useFloorplanStore.getState().activePlan()?.name).toBe('My Plan');
  });

  it('shows the floor plan manager when the Plans button is clicked', async () => {
    render(<TopBar />);
    await userEvent.click(screen.getByTestId('plans-button'));
    expect(screen.getByTestId('floorplan-manager')).toBeInTheDocument();
  });
});
