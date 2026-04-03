import { test, expect } from '@playwright/test';

test('should load the main module without MIME type errors', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => {
        logs.push(msg.text());
        if (msg.type() === 'error') {
            console.error('Browser Error:', msg.text());
        }
    });

    page.on('requestfailed', request => {
        console.error('Request failed:', request.url(), request.failure()?.errorText);
    });

    page.on('response', response => {
        if (response.url().endsWith('.ts')) {
            console.log(`Resource: ${response.url()}, MIME type: ${response.headers()['content-type']}`);
        }
    });

    await page.goto('http://localhost:3000');

    // Wait for some time to allow module loading
    await page.waitForTimeout(2000);

    const hasMimeError = logs.some(log => log.includes('MIME type') || log.includes('Failed to load module'));
    expect(hasMimeError).toBe(false);

    const shell = page.locator('matrix-app-shell');
    await expect(shell).toBeVisible();
});
