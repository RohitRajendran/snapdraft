import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { HelpOverlay } from '../../components/HelpOverlay/HelpOverlay';
import styles from '../../components/HelpOverlay/HelpOverlay.module.css';

describe('HelpOverlay', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders action labels with hint styling and explanations with action styling', () => {
    act(() => {
      root.render(<HelpOverlay onClose={() => {}} />);
    });

    const row = Array.from(container.querySelectorAll(`.${styles.row}`)).find((candidate) =>
      candidate.textContent?.includes('Draw walls'),
    );
    expect(row).not.toBeNull();

    const label = row!.querySelector('dt');
    const explanation = row!.querySelector('dd');

    expect(label).toHaveTextContent('Draw walls');
    expect(label).toHaveClass(styles.hint);
    expect(explanation).toHaveTextContent('Wall tool — drag or click points.');
    expect(explanation).toHaveClass(styles.action);

    expect(container.querySelector(`.${styles.subtitle}`)).toHaveTextContent(
      'Sketch floor plans right in your browser.',
    );
  });
});
