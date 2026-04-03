import { test, expect } from '@playwright/test';

test('should load app and take screenshot', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('matrix-app-shell');
    await page.screenshot({ path: 'tests/screenshots/app_load.png' });
    console.log('Screenshot saved to tests/screenshots/app_load.png');
});
