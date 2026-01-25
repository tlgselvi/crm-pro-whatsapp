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

test('ai settings save verification', async ({ page }) => {
    // Mock Supabase API calls
    await page.route('**/rest/v1/ai_settings*', async route => {
        if (route.request().method() === 'GET') {
            await route.fulfill({ status: 200, body: JSON.stringify({ company_name: 'Old Name', tone: 'professional' }) });
        } else if (route.request().method() === 'POST' || route.request().method() === 'PATCH') {
            await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
        }
    });

    await page.goto('/settings/ai');
    await page.waitForLoadState('networkidle');


    // Fill company name
    await page.fill('input[placeholder="Örn: ABC Teknoloji"]', 'Test Firması');

    // Handle Ant Design Select for 'Cevap Tonu'
    await page.click('.ant-select-selector');
    await page.click('.ant-select-item-option-content:has-text("Profesyonel")');

    // Click save using explicit role selector
    await page.getByRole('button', { name: 'Ayarları Kaydet' }).click();

    // Verify success message
    await expect(page.locator('text=AI Ayarları başarıyla güncellendi')).toBeVisible({ timeout: 15000 });
});

