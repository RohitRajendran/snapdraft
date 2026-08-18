import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ColorPicker } from './ColorPicker';
import { BOX_COLOR_PRESETS } from '../../../utils/colors/colors';

describe('ColorPicker', () => {
  it('renders 5 preset swatches, a custom swatch, and a hidden color input', () => {
    render(<ColorPicker value={BOX_COLOR_PRESETS[0]} onChange={vi.fn()} />);
    for (let i = 0; i < 5; i++) {
      expect(screen.getByTestId(`box-color-swatch-${i}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('box-color-custom')).toBeInTheDocument();
    expect(screen.getByTestId('box-color-custom-input')).toBeInTheDocument();
  });

  it('calls onChange with the preset hex when a preset swatch is clicked', async () => {
    const onChange = vi.fn();
    render(<ColorPicker value={BOX_COLOR_PRESETS[0]} onChange={onChange} />);
    await userEvent.click(screen.getByTestId('box-color-swatch-2'));
    expect(onChange).toHaveBeenCalledWith(BOX_COLOR_PRESETS[2]);
  });

  it('marks the matching preset as pressed and the custom swatch as not pressed', () => {
    render(<ColorPicker value={BOX_COLOR_PRESETS[1]} onChange={vi.fn()} />);
    expect(screen.getByTestId('box-color-swatch-1')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('box-color-swatch-0')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('box-color-custom')).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks the custom swatch as pressed and shows the picked color when value is not a preset', () => {
    render(<ColorPicker value="#ff00aa" onChange={vi.fn()} />);
    const customSwatch = screen.getByTestId('box-color-custom');
    expect(customSwatch).toHaveAttribute('aria-pressed', 'true');
    expect(customSwatch).toHaveStyle({ backgroundColor: '#ff00aa' });
    for (let i = 0; i < 5; i++) {
      expect(screen.getByTestId(`box-color-swatch-${i}`)).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('always shows the pencil badge on the custom swatch, in both states', () => {
    const { rerender } = render(<ColorPicker value={BOX_COLOR_PRESETS[0]} onChange={vi.fn()} />);
    expect(screen.getByTestId('box-color-pencil-badge')).toBeInTheDocument();
    rerender(<ColorPicker value="#ff00aa" onChange={vi.fn()} />);
    expect(screen.getByTestId('box-color-pencil-badge')).toBeInTheDocument();
  });

  it('always has the custom-color tooltip text', () => {
    render(<ColorPicker value={BOX_COLOR_PRESETS[0]} onChange={vi.fn()} />);
    expect(screen.getByTestId('box-color-custom')).toHaveAttribute(
      'title',
      'Custom color — click to change',
    );
  });

  it('clicking the custom swatch delegates a click to the hidden color input', async () => {
    render(<ColorPicker value={BOX_COLOR_PRESETS[0]} onChange={vi.fn()} />);
    const hiddenInput = screen.getByTestId('box-color-custom-input');
    const clickSpy = vi.spyOn(hiddenInput, 'click');
    await userEvent.click(screen.getByTestId('box-color-custom'));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('calls onChange when the hidden color input changes', () => {
    const onChange = vi.fn();
    render(<ColorPicker value={BOX_COLOR_PRESETS[0]} onChange={onChange} />);
    const hiddenInput = screen.getByTestId('box-color-custom-input');
    // jsdom does not support driving a native color chooser; simulate the resulting change event.
    fireEvent.change(hiddenInput, { target: { value: '#123abc' } });
    expect(onChange).toHaveBeenCalledWith('#123abc');
  });
});
