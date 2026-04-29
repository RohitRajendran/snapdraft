import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Toolbar } from './Toolbar';
import { useToolStore } from '../../store/useToolStore/useToolStore';
import { useFloorplanStore } from '../../store/useFloorplanStore/useFloorplanStore';
import type { Element } from '../../types';

const wall = (): Element => ({
  id: 'w1',
  type: 'wall',
  points: [
    { x: 0, y: 0 },
    { x: 5, y: 0 },
  ],
});

function resetStores() {
  localStorage.clear();
  // Use a desktop width so the toolbar is never hidden by mobile selection bar logic
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1280 });
  useFloorplanStore.setState({ plans: [], activeId: null, past: [], future: [] });
  const id = useFloorplanStore.getState().createPlan('Test');
  useFloorplanStore.setState({ activeId: id, past: [], future: [] });
  useToolStore.setState({
    activeTool: 'wall',
    selectedIds: new Set(),
    selectedId: null,
    propertiesPanelOpen: false,
    unit: 'imperial',
  });
}

describe('Toolbar', () => {
  beforeEach(resetStores);

  it('renders the select/pan slot and the other tool buttons', () => {
    render(<Toolbar onHelpOpen={vi.fn()} />);
    expect(screen.getByTestId('tool-select-pan')).toBeInTheDocument();
    expect(screen.getByTestId('tool-select-pan-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tool-wall')).toBeInTheDocument();
    expect(screen.getByTestId('tool-box')).toBeInTheDocument();
    expect(screen.getByTestId('tool-measure')).toBeInTheDocument();
  });

  it('select/pan slot shows aria-pressed when select is active', () => {
    useToolStore.setState({ activeTool: 'select' });
    render(<Toolbar onHelpOpen={vi.fn()} />);
    expect(screen.getByTestId('tool-select-pan')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('tool-wall')).toHaveAttribute('aria-pressed', 'false');
  });

  it('select/pan slot shows aria-pressed when pan is active', () => {
    useToolStore.setState({ activeTool: 'pan' });
    render(<Toolbar onHelpOpen={vi.fn()} />);
    expect(screen.getByTestId('tool-select-pan')).toHaveAttribute('aria-pressed', 'true');
  });

  it('slot is not aria-pressed when a different tool is active', () => {
    render(<Toolbar onHelpOpen={vi.fn()} />);
    expect(screen.getByTestId('tool-select-pan')).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking a tool button updates the active tool', async () => {
    render(<Toolbar onHelpOpen={vi.fn()} />);
    await userEvent.click(screen.getByTestId('tool-box'));
    expect(useToolStore.getState().activeTool).toBe('box');
  });

  it('clicking the slot button activates the shown sub-tool', async () => {
    useToolStore.setState({ activeTool: 'wall' });
    render(<Toolbar onHelpOpen={vi.fn()} />);
    await userEvent.click(screen.getByTestId('tool-select-pan'));
    expect(useToolStore.getState().activeTool).toBe('select');
  });

  it('clicking the toggle opens the dropdown with both options', async () => {
    render(<Toolbar onHelpOpen={vi.fn()} />);
    await userEvent.click(screen.getByTestId('tool-select-pan-toggle'));
    expect(screen.getByTestId('tool-select')).toBeInTheDocument();
    expect(screen.getByTestId('tool-pan')).toBeInTheDocument();
  });

  it('choosing Select from dropdown activates select', async () => {
    render(<Toolbar onHelpOpen={vi.fn()} />);
    await userEvent.click(screen.getByTestId('tool-select-pan-toggle'));
    await userEvent.click(screen.getByTestId('tool-select'));
    expect(useToolStore.getState().activeTool).toBe('select');
  });

  it('choosing Hand from dropdown activates pan', async () => {
    render(<Toolbar onHelpOpen={vi.fn()} />);
    await userEvent.click(screen.getByTestId('tool-select-pan-toggle'));
    await userEvent.click(screen.getByTestId('tool-pan'));
    expect(useToolStore.getState().activeTool).toBe('pan');
  });

  it('dropdown closes after choosing an option', async () => {
    render(<Toolbar onHelpOpen={vi.fn()} />);
    await userEvent.click(screen.getByTestId('tool-select-pan-toggle'));
    await userEvent.click(screen.getByTestId('tool-select'));
    expect(screen.queryByTestId('tool-pan')).not.toBeInTheDocument();
  });

  it('S key switches to select tool', async () => {
    render(<Toolbar onHelpOpen={vi.fn()} />);
    await userEvent.keyboard('s');
    expect(useToolStore.getState().activeTool).toBe('select');
  });

  it('V key switches to select tool', async () => {
    useToolStore.setState({ activeTool: 'wall' });
    render(<Toolbar onHelpOpen={vi.fn()} />);
    await userEvent.keyboard('v');
    expect(useToolStore.getState().activeTool).toBe('select');
  });

  it('H key switches to pan tool', async () => {
    render(<Toolbar onHelpOpen={vi.fn()} />);
    await userEvent.keyboard('h');
    expect(useToolStore.getState().activeTool).toBe('pan');
  });

  it('W key switches to wall tool', async () => {
    useToolStore.setState({ activeTool: 'select' });
    render(<Toolbar onHelpOpen={vi.fn()} />);
    await userEvent.keyboard('w');
    expect(useToolStore.getState().activeTool).toBe('wall');
  });

  it('B key switches to box tool', async () => {
    render(<Toolbar onHelpOpen={vi.fn()} />);
    await userEvent.keyboard('b');
    expect(useToolStore.getState().activeTool).toBe('box');
  });

  it('M key switches to measure tool', async () => {
    render(<Toolbar onHelpOpen={vi.fn()} />);
    await userEvent.keyboard('m');
    expect(useToolStore.getState().activeTool).toBe('measure');
  });

  it('keyboard shortcuts are ignored when an input is focused', async () => {
    render(
      <>
        <Toolbar onHelpOpen={vi.fn()} />
        <input data-testid="other-input" />
      </>,
    );
    await userEvent.click(screen.getByTestId('other-input'));
    await userEvent.keyboard('b');
    expect(useToolStore.getState().activeTool).toBe('wall');
  });

  it('undo is disabled when there is no history', () => {
    render(<Toolbar onHelpOpen={vi.fn()} />);
    expect(screen.getByTestId('tool-undo')).toBeDisabled();
  });

  it('undo is enabled when there is history', () => {
    useFloorplanStore.getState().addElement(wall());
    render(<Toolbar onHelpOpen={vi.fn()} />);
    expect(screen.getByTestId('tool-undo')).toBeEnabled();
  });

  it('redo is disabled when there is nothing to redo', () => {
    render(<Toolbar onHelpOpen={vi.fn()} />);
    expect(screen.getByTestId('tool-redo')).toBeDisabled();
  });

  it('redo is enabled after an undo', () => {
    useFloorplanStore.getState().addElement(wall());
    useFloorplanStore.getState().undo();
    render(<Toolbar onHelpOpen={vi.fn()} />);
    expect(screen.getByTestId('tool-redo')).toBeEnabled();
  });

  it('clicking help calls onHelpOpen', async () => {
    const onHelpOpen = vi.fn();
    render(<Toolbar onHelpOpen={onHelpOpen} />);
    await userEvent.click(screen.getByTestId('tool-help'));
    expect(onHelpOpen).toHaveBeenCalledOnce();
  });
});
