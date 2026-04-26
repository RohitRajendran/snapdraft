import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HelpOverlay } from './HelpOverlay';

function mockInputProfile({
  maxTouchPoints,
  finePointer,
  coarsePointer,
  platform,
}: {
  maxTouchPoints: number;
  finePointer: boolean;
  coarsePointer: boolean;
  platform: string;
}) {
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    configurable: true,
    value: maxTouchPoints,
  });
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: platform,
  });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches:
        (query === '(any-pointer: fine)' && finePointer) ||
        (query === '(any-pointer: coarse)' && coarsePointer),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

const keyboardMac = {
  maxTouchPoints: 0,
  finePointer: true,
  coarsePointer: false,
  platform: 'MacIntel',
};

const touchOnly = {
  maxTouchPoints: 5,
  finePointer: false,
  coarsePointer: true,
  platform: 'iPad',
};

const touchAndKeyboardWindows = {
  maxTouchPoints: 5,
  finePointer: true,
  coarsePointer: true,
  platform: 'Win32',
};

describe('HelpOverlay', () => {
  beforeEach(() => {
    mockInputProfile(keyboardMac);
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    render(<HelpOverlay onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  describe('Help tab', () => {
    it('is selected by default', () => {
      render(<HelpOverlay onClose={vi.fn()} />);
      expect(screen.getByRole('tab', { name: 'Help' })).toHaveAttribute('aria-selected', 'true');
    });

    it('shows the save note', () => {
      render(<HelpOverlay onClose={vi.fn()} />);
      expect(screen.getByTestId('help-save-note')).toHaveTextContent(
        'saved automatically in this browser',
      );
    });

    it('shows advanced shortcuts collapsed', () => {
      render(<HelpOverlay onClose={vi.fn()} />);
      expect(screen.getByText('Advanced shortcuts and tips')).toBeVisible();
      expect(screen.queryByText('Undo / Redo')).not.toBeVisible();
    });

    it('renders touch-only instructions on iPad', () => {
      mockInputProfile(touchOnly);
      render(<HelpOverlay onClose={vi.fn()} />);
      expect(screen.getByText(/Tap points; use Done, Cancel/i)).toBeInTheDocument();
      expect(screen.getByText(/tap anywhere to dismiss/i)).toBeInTheDocument();
      expect(screen.queryByText('⌘Z / ⌘⇧Z')).not.toBeInTheDocument();
    });

    it('renders Mac keyboard instructions on desktop', () => {
      render(<HelpOverlay onClose={vi.fn()} />);
      expect(screen.getByText(/drag or click points/i)).toBeInTheDocument();
      expect(screen.getByText(/⌘Z \/ ⌘⇧Z/)).toBeInTheDocument();
      expect(screen.getByText(/press Escape to dismiss · \? to reopen/i)).toBeInTheDocument();
    });

    it('renders mixed touch+keyboard instructions on Windows touch device', () => {
      mockInputProfile(touchAndKeyboardWindows);
      render(<HelpOverlay onClose={vi.fn()} />);
      expect(screen.getByText(/tap, click, or drag points/i)).toBeInTheDocument();
      expect(screen.getByText(/Ctrl\+Z \/ Ctrl\+Shift\+Z/)).toBeInTheDocument();
      expect(
        screen.getByText(/tap anywhere or press Escape to dismiss · \? to reopen/i),
      ).toBeInTheDocument();
    });
  });

  describe('About tab', () => {
    it('switches to About and shows signature', async () => {
      render(<HelpOverlay onClose={vi.fn()} />);
      await userEvent.click(screen.getByRole('tab', { name: 'About' }));
      expect(screen.getByRole('tab', { name: 'About' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('— Rohit')).toBeInTheDocument();
    });

    it('shows GitHub and Email links', async () => {
      render(<HelpOverlay onClose={vi.fn()} />);
      await userEvent.click(screen.getByRole('tab', { name: 'About' }));
      expect(screen.getByRole('link', { name: 'GitHub' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Email' })).toBeInTheDocument();
    });

    it('hides help tab content when About is active', async () => {
      render(<HelpOverlay onClose={vi.fn()} />);
      await userEvent.click(screen.getByRole('tab', { name: 'About' }));
      expect(screen.queryByTestId('help-save-note')).not.toBeInTheDocument();
    });
  });
});
