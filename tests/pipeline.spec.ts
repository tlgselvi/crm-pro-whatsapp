import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL!;
    const password = process.env.TEST_USER_PASSWORD!;

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill credentials using Ant Design specific IDs
    await page.fill('#login_email', email);
    await page.fill('#login_password', password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/.*dashboard/);

});

test('kanban pipeline columns visibility', async ({ page }) => {
    await page.goto('/pipeline');

    // Verify stages (Incoming is 'Yeni Gelenler', Negotiation is 'Pazarlık')
    await expect(page.locator('text=Yeni Gelenler')).toBeVisible();
    await expect(page.locator('text=Pazarlık')).toBeVisible();

    // Check if at least one column exists
    const columns = page.locator('div[style*="min-width: 320"]');
    await expect(columns).toHaveCount(7); // We have 7 stages
});
