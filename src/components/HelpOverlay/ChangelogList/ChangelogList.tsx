import { CHANGE_KINDS, formatReleaseDate, type Release } from '../../../utils/changelog/changelog';
import styles from './ChangelogList.module.css';

const CHANGELOG_URL = 'https://github.com/RohitRajendran/snapdraft/blob/main/CHANGELOG.md';

type Props = {
  releases: Release[];
};

export function ChangelogList({ releases }: Props) {
  return (
    <div data-testid="changelog-list">
      {releases.map((release, index) => {
        const date = formatReleaseDate(release.id);
        // Several releases can land on one day. Only the first needs the date.
        const showDate = index === 0 || date !== formatReleaseDate(releases[index - 1].id);
        return (
          <section key={release.id} className={styles.release}>
            {showDate && <h3 className={styles.date}>{date}</h3>}
            {CHANGE_KINDS.filter((kind) => release.changes[kind].length > 0).map((kind) => (
              <div key={kind} className={styles.group}>
                <h4 className={styles.kind}>{kind}</h4>
                <ul className={styles.items}>
                  {release.changes[kind].map((item) => (
                    <li key={item} className={styles.item}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
      <a
        className={styles.link}
        href={CHANGELOG_URL}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="changelog-link"
      >
        Changelog on GitHub
      </a>
    </div>
  );
}
