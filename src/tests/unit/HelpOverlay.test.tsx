import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelpOverlay } from '../../components/HelpOverlay/HelpOverlay';
import styles from '../../components/HelpOverlay/HelpOverlay.module.css';

describe('HelpOverlay', () => {
  let container: HTMLDivElement;
  let root: Root;
  let matchMediaMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    });
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      configurable: true,
      value: 0,
    });
    Object.defineProperty(window.navigator, 'platform', {
      configurable: true,
      value: 'MacIntel',
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  function renderOverlay() {
    act(() => {
      root.render(<HelpOverlay onClose={() => {}} />);
    });
  }

  function setInputProfile({
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
    matchMediaMock.mockImplementation((query: string) => ({
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
    }));
  }

  it('renders touch-first instructions when only touch input is available', () => {
    setInputProfile({
      maxTouchPoints: 5,
      finePointer: false,
      coarsePointer: true,
      platform: 'iPad',
    });

    renderOverlay();

    const row = Array.from(container.querySelectorAll(`.${styles.row}`)).find((candidate) =>
      candidate.textContent?.includes('Draw walls'),
    );
    expect(row).not.toBeNull();

    const label = row!.querySelector('dt');
    const explanation = row!.querySelector('dd');

    expect(label).toHaveTextContent('Draw walls');
    expect(label).toHaveClass(styles.hint);
    expect(explanation).toHaveTextContent(
      'Wall tool — tap points; use Done, Cancel, and Length to tune the last wall.',
    );
    expect(explanation).toHaveClass(styles.action);
    expect(container).toHaveTextContent('Tap Length to edit the last wall.');
    expect(container).toHaveTextContent(
      'Tap Done, tap the last point, or double-tap the last point.',
    );
    expect(container).toHaveTextContent('or tap anywhere to dismiss');
    expect(container).not.toHaveTextContent('⌘Z / ⌘⇧Z');
    expect(container).not.toHaveTextContent('Ctrl+Z / Ctrl+Shift+Z');
  });

  it('renders keyboard-first mac instructions when only keyboard input is available', () => {
    setInputProfile({
      maxTouchPoints: 0,
      finePointer: true,
      coarsePointer: false,
      platform: 'MacIntel',
    });

    renderOverlay();

    expect(container).toHaveTextContent('Wall tool — drag or click points.');
    expect(container).toHaveTextContent('⌘Z / ⌘⇧Z');
    expect(container).toHaveTextContent('Click the last point or press Esc.');
    expect(container).toHaveTextContent('or press Escape to dismiss · ? to reopen');
    expect(container).not.toHaveTextContent('tap Done on touch');
  });

  it('renders mixed touch and windows keyboard instructions when both inputs are available', () => {
    setInputProfile({
      maxTouchPoints: 5,
      finePointer: true,
      coarsePointer: true,
      platform: 'Win32',
    });

    renderOverlay();

    expect(container).toHaveTextContent(
      'Wall tool — tap, click, or drag points; use Done, Cancel, and Length on touch.',
    );
    expect(container).toHaveTextContent('Ctrl+Z / Ctrl+Shift+Z');
    expect(container).toHaveTextContent('S or tap ↖');
    expect(container).toHaveTextContent(
      "Type 10' or 5'6\" while drawing, or tap Length on touch to edit the last wall.",
    );
    expect(container).toHaveTextContent('or tap anywhere or press Escape to dismiss · ? to reopen');
    expect(container.querySelector(`.${styles.subtitle}`)).toHaveTextContent(
      'Sketch floor plans right in your browser.',
    );
  });
});
