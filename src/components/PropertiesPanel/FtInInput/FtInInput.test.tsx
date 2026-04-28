import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FtInInput } from './FtInInput';
import { useToolStore } from '../../../store/useToolStore/useToolStore';

beforeEach(() => {
  localStorage.clear();
  useToolStore.setState({ unit: 'imperial' });
});

describe('FtInInput — imperial', () => {
  it('displays formatted value when not focused', () => {
    render(<FtInInput label="Width" value={5.5} onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('5\' 6"');
  });

  it('switches to draft on focus', async () => {
    render(<FtInInput label="Width" value={5.5} onChange={vi.fn()} />);
    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    expect(input).toHaveValue('5\' 6"');
  });

  it('calls onChange with parsed feet value on blur', async () => {
    const onChange = vi.fn();
    render(<FtInInput label="Width" value={5} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.type(input, '10\'6"');
    await userEvent.tab();
    expect(onChange).toHaveBeenCalledWith(10.5);
  });

  it('calls onChange on Enter', async () => {
    const onChange = vi.fn();
    render(<FtInInput label="Width" value={5} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.type(input, "8'");
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith(8);
  });

  it('does not call onChange for unparseable input', async () => {
    const onChange = vi.fn();
    render(<FtInInput label="Width" value={5} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.type(input, 'abc');
    await userEvent.tab();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not call onChange when value is below min', async () => {
    const onChange = vi.fn();
    render(<FtInInput label="Width" value={5} onChange={onChange} min={1} />);
    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.type(input, '3"');
    await userEvent.tab();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clears draft and reverts display on blur with no change', async () => {
    render(<FtInInput label="Width" value={5} onChange={vi.fn()} />);
    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.tab();
    expect(input).toHaveValue("5'");
  });

  it('applies testId to the input element', () => {
    render(<FtInInput label="Width" value={5} onChange={vi.fn()} testId="my-input" />);
    expect(screen.getByTestId('my-input')).toBeInTheDocument();
  });

  it('shows imperial hint text', () => {
    render(<FtInInput label="Width" value={5} onChange={vi.fn()} />);
    expect(screen.getByText(/10' 6"/)).toBeInTheDocument();
  });
});

describe('FtInInput — metric', () => {
  beforeEach(() => {
    useToolStore.setState({ unit: 'metric' });
  });

  it('displays value in metres', () => {
    // FT_PER_M ft = 1.00 m
    render(<FtInInput label="Width" value={1 / 0.3048} onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('1 m');
  });

  it('parses "3.5 m" and calls onChange in feet', async () => {
    const onChange = vi.fn();
    render(<FtInInput label="Width" value={1} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.type(input, '3.5 m');
    await userEvent.tab();
    expect(onChange).toHaveBeenCalledWith(expect.closeTo(3.5 / 0.3048, 3));
  });

  it('parses "350 cm"', async () => {
    const onChange = vi.fn();
    render(<FtInInput label="Width" value={1} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.type(input, '350 cm');
    await userEvent.tab();
    expect(onChange).toHaveBeenCalledWith(expect.closeTo(3.5 / 0.3048, 3));
  });

  it('parses bare decimal as metres', async () => {
    const onChange = vi.fn();
    render(<FtInInput label="Width" value={1} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.type(input, '3.5');
    await userEvent.tab();
    expect(onChange).toHaveBeenCalledWith(expect.closeTo(3.5 / 0.3048, 3));
  });

  it('parses "5 mm" and calls onChange in feet', async () => {
    const onChange = vi.fn();
    render(<FtInInput label="Width" value={1} onChange={onChange} min={0.1} />);
    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.type(input, '5 mm');
    await userEvent.tab();
    expect(onChange).toHaveBeenCalledWith(expect.closeTo(0.005 / 0.3048, 5));
  });

  it('accepts sub-min mm values in metric mode', async () => {
    // min={0.1} ft ≈ 3 cm; 5 mm is below that but should be accepted in metric
    const onChange = vi.fn();
    render(<FtInInput label="Width" value={1} onChange={onChange} min={0.1} />);
    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.type(input, '5mm');
    await userEvent.tab();
    expect(onChange).toHaveBeenCalled();
  });

  it('shows metric hint text', () => {
    render(<FtInInput label="Width" value={5} onChange={vi.fn()} />);
    expect(screen.getByText(/3500 mm/)).toBeInTheDocument();
  });
});
