import { X } from 'lucide-react';
import styles from './WhatsNewCard.module.css';

const MAX_ITEMS = 2;

type Props = {
  items: string[];
  onOpen: () => void;
  onDismiss: () => void;
};

/** Tells returning users about new features. It isn't a modal and doesn't take keyboard focus. */
export function WhatsNewCard({ items, onOpen, onDismiss }: Props) {
  const remaining = items.length - MAX_ITEMS;

  return (
    <section className={styles.card} aria-label="What's new" data-testid="whats-new-card">
      <div className={styles.header}>
        <h2 className={styles.title}>New in SnapDraft</h2>
        <button
          className={styles.close}
          onClick={onDismiss}
          aria-label="Dismiss what's new"
          data-testid="whats-new-dismiss"
        >
          <X size={16} />
        </button>
      </div>
      <ul className={styles.items}>
        {items.slice(0, MAX_ITEMS).map((item) => (
          <li key={item} className={styles.item}>
            {item}
          </li>
        ))}
      </ul>
      <button className={styles.open} onClick={onOpen} data-testid="whats-new-open">
        {remaining > 0 ? `See ${remaining} more` : 'See all updates'}
      </button>
    </section>
  );
}
