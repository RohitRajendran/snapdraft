import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChangelogList } from './ChangelogList';
import type { Release } from '../../../utils/changelog/changelog';

const release = (id: string, changes: Partial<Release['changes']>): Release => ({
  id,
  changes: { New: [], Improved: [], Fixed: [], ...changes },
});

describe('ChangelogList', () => {
  it('shows dates and only the kinds a release has', () => {
    render(
      <ChangelogList releases={[release('2026.10.14', { New: ['Colors'], Fixed: ['Undo'] })]} />,
    );
    const list = within(screen.getByTestId('changelog-list'));
    expect(list.getByRole('heading', { level: 3, name: 'October 14, 2026' })).toBeInTheDocument();
    expect(list.getByRole('heading', { level: 4, name: 'New' })).toBeInTheDocument();
    expect(list.getByRole('heading', { level: 4, name: 'Fixed' })).toBeInTheDocument();
    expect(list.queryByRole('heading', { name: 'Improved' })).not.toBeInTheDocument();
    expect(list.getByText('Colors')).toBeInTheDocument();
  });

  it('shows the date once when releases share a day', () => {
    render(
      <ChangelogList
        releases={[
          release('2026.11.03.2', { Fixed: ['Later'] }),
          release('2026.11.03', { New: ['Earlier'] }),
          release('2026.10.14', { New: ['Colors'] }),
        ]}
      />,
    );
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'November 3, 2026',
      'October 14, 2026',
    ]);
    expect(screen.getByText('Later')).toBeInTheDocument();
    expect(screen.getByText('Earlier')).toBeInTheDocument();
  });

  it('links to the changelog on GitHub in a new tab', () => {
    render(<ChangelogList releases={[]} />);
    const link = screen.getByTestId('changelog-link');
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/RohitRajendran/snapdraft/blob/main/CHANGELOG.md',
    );
    expect(link).toHaveAttribute('target', '_blank');
  });
});
