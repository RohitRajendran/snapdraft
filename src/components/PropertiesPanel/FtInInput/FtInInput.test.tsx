import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FtInInput } from './FtInInput';

describe('FtInInput', () => {
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

  it('shows hint text', () => {
    render(<FtInInput label="Width" value={5} onChange={vi.fn()} />);
    expect(screen.getByText(/Accepts:/)).toBeInTheDocument();
  });
});
