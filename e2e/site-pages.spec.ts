import { test, expect } from '@playwright/test';

/**
 * Privacy and support are static pages in public/. Netlify serves them at /privacy and
 * /support (netlify.toml); `vite preview` serves them at their file paths.
 */
test.describe('privacy and support pages', () => {
  test('privacy policy states what the app and site collect', async ({ page }) => {
    await page.goto('/privacy.html');
    await expect(page).toHaveTitle('Privacy Policy · SnapDraft');
    await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible();
    await expect(page.getByTestId('privacy-native')).toContainText('does not collect any data');
    await expect(page.getByTestId('privacy-links')).toContainText('contains the plan itself');
    await expect(page.getByTestId('privacy-contact')).toHaveAttribute('href', /^mailto:rohit@hummingbirdtech\.xyz/);
    await expect(page.getByText('SnapDraft is made by Hummingbird Tech, LLC')).toBeVisible();
    await expect(page.getByText('© 2026 Hummingbird Tech, LLC')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Support' }).first()).toHaveAttribute('href', '/support');
  });

  test('support page answers common questions and offers contact', async ({ page }) => {
    await page.goto('/support.html');
    await expect(page).toHaveTitle('Support · SnapDraft');
    await expect(page.getByRole('heading', { level: 1, name: 'Support' })).toBeVisible();
    await expect(page.getByTestId('support-contact')).toHaveAttribute('href', /^mailto:rohit@hummingbirdtech\.xyz/);
    await expect(page.getByText('© 2026 Hummingbird Tech, LLC')).toBeVisible();
    for (const question of ['Where are my plans saved?', 'How do I share a plan?', 'How do I add doors and windows?']) {
      await expect(page.getByRole('heading', { level: 3, name: question })).toBeVisible();
    }
    await expect(page.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
  });

  test('pages use the site styles and fit a phone width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    for (const path of ['/privacy.html', '/support.html']) {
      await page.goto(path);
      const heading = page.getByRole('heading', { level: 1 });
      await expect(heading).toHaveCSS('font-family', /Courier New/);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    }
  });

  test('home footer links to privacy and support', async ({ page }) => {
    await page.goto('/home.html');
    await expect(page.getByTestId('footer-privacy')).toHaveAttribute('href', '/privacy');
    await expect(page.getByTestId('footer-support')).toHaveAttribute('href', '/support');
  });
});
