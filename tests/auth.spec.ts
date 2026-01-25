import { test, expect } from '@playwright/test';

test('login process', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL!;
    const password = process.env.TEST_USER_PASSWORD!;

    // Log console messages
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill credentials using Ant Design specific IDs
    await page.fill('#login_email', email);
    await page.fill('#login_password', password);

    // Click login using the most basic selector
    await page.locator('button[type="submit"]').click();

    // Wait for navigation and verify
    try {
        await page.waitForURL(/.*dashboard/, { timeout: 20000 });

        await expect(page.locator('text=Sistem Özeti')).toBeVisible();
    } catch (e) {
        await page.screenshot({ path: 'auth-failure-detail.png', fullPage: true });
        throw e;
    }
});
