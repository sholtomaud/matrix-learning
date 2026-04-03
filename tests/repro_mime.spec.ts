import { test, expect } from '@playwright/test';

test('should serve .ts files with application/javascript MIME type', async ({ page }) => {
    let tsMimeType = '';
    page.on('response', response => {
        if (response.url().endsWith('/src/main.ts')) {
            tsMimeType = response.headers()['content-type'];
            console.log(`Resource: ${response.url()}, MIME type: ${tsMimeType}`);
        }
    });

    await page.goto('http://localhost:3000');

    // Check if the MIME type is one of the valid JavaScript types
    // and specifically not video/mp2t
    expect(tsMimeType).not.toContain('video/mp2t');
    expect(['application/javascript', 'text/javascript']).toContain(tsMimeType.split(';')[0]);
});
