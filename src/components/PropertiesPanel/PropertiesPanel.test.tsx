import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { PropertiesPanel } from './PropertiesPanel';
import { useFloorplanStore } from '../../store/useFloorplanStore/useFloorplanStore';
import { useToolStore } from '../../store/useToolStore/useToolStore';
import type { Element } from '../../types';

const wall: Element = {
  id: 'w1',
  type: 'wall',
  points: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
  ],
};

const box: Element = {
  id: 'b1',
  type: 'box',
  x: 0,
  y: 0,
  width: 6,
  height: 4,
  rotation: 0,
  label: 'Sofa',
};

function resetStores() {
  localStorage.clear();
  // Use desktop width so delete button is shown
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1280 });
  useFloorplanStore.setState({ plans: [], activeId: null, past: [], future: [] });
  const id = useFloorplanStore.getState().createPlan('Test');
  useFloorplanStore.setState({ activeId: id, past: [], future: [] });
  useToolStore.setState({
    selectedIds: new Set(),
    selectedId: null,
    propertiesPanelOpen: false,
    unit: 'imperial',
  });
}

function selectElement(el: Element) {
  useFloorplanStore.getState().addElement(el);
  useToolStore.setState({
    selectedId: el.id,
    selectedIds: new Set([el.id]),
    propertiesPanelOpen: true,
  });
}

describe('PropertiesPanel', () => {
  beforeEach(resetStores);

  it('renders nothing when no element is selected', () => {
    render(<PropertiesPanel />);
    expect(screen.queryByTestId('properties-panel')).not.toBeInTheDocument();
  });

  it('renders nothing when the panel is closed', () => {
    selectElement(box);
    useToolStore.setState({ propertiesPanelOpen: false });
    render(<PropertiesPanel />);
    expect(screen.queryByTestId('properties-panel')).not.toBeInTheDocument();
  });

  describe('Wall properties', () => {
    it('shows the wall panel with a length input', () => {
      selectElement(wall);
      render(<PropertiesPanel />);
      expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
      expect(screen.getByTestId('wall-length-input')).toHaveValue("10'");
    });

    it('shows total length', () => {
      selectElement(wall);
      render(<PropertiesPanel />);
      expect(screen.getByText("10'")).toBeInTheDocument();
    });

    it('deletes the wall when Delete is clicked', async () => {
      selectElement(wall);
      render(<PropertiesPanel />);
      await userEvent.click(screen.getByTestId('delete-element'));
      expect(useFloorplanStore.getState().activePlan()?.elements).toHaveLength(0);
    });
  });

  describe('Box properties', () => {
    it('shows the box panel with width, height, rotation and label inputs', () => {
      selectElement(box);
      render(<PropertiesPanel />);
      expect(screen.getByTestId('box-width-input')).toHaveValue("6'");
      expect(screen.getByTestId('box-height-input')).toHaveValue("4'");
      expect(screen.getByTestId('box-rotation-input')).toHaveValue(0);
      expect(screen.getByTestId('box-label-input')).toHaveValue('Sofa');
    });

    it('updates width via FtInInput', async () => {
      selectElement(box);
      render(<PropertiesPanel />);
      const input = screen.getByTestId('box-width-input');
      await userEvent.click(input);
      await userEvent.clear(input);
      await userEvent.type(input, "8'");
      await userEvent.tab();
      expect(useFloorplanStore.getState().activePlan()?.elements[0]).toMatchObject({ width: 8 });
    });

    it('updates label on Enter', async () => {
      selectElement(box);
      render(<PropertiesPanel />);
      const input = screen.getByTestId('box-label-input');
      await userEvent.click(input);
      await userEvent.clear(input);
      await userEvent.type(input, 'Armchair');
      await userEvent.keyboard('{Enter}');
      expect(useFloorplanStore.getState().activePlan()?.elements[0]).toMatchObject({
        label: 'Armchair',
      });
    });

    it('clears label when committed blank', async () => {
      selectElement(box);
      render(<PropertiesPanel />);
      const input = screen.getByTestId('box-label-input');
      await userEvent.click(input);
      await userEvent.clear(input);
      await userEvent.keyboard('{Enter}');
      expect(
        (useFloorplanStore.getState().activePlan()?.elements[0] as typeof box).label,
      ).toBeUndefined();
    });

    it('normalizes rotation to 0–360 range', async () => {
      selectElement(box);
      render(<PropertiesPanel />);
      const input = screen.getByTestId('box-rotation-input');
      await userEvent.click(input);
      await userEvent.clear(input);
      await userEvent.type(input, '400');
      await userEvent.tab();
      expect(useFloorplanStore.getState().activePlan()?.elements[0]).toMatchObject({
        rotation: 40,
      });
    });

    it('deletes the box when Delete is clicked', async () => {
      selectElement(box);
      render(<PropertiesPanel />);
      await userEvent.click(screen.getByTestId('delete-element'));
      expect(useFloorplanStore.getState().activePlan()?.elements).toHaveLength(0);
    });
  });
});
