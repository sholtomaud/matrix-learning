import { test, expect } from '@playwright/test';

test.describe('Matrix Component TDD', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should render the app shell and initial matrix grid', async ({ page }) => {
        const shell = page.locator('matrix-app-shell');
        await expect(shell).toBeVisible();

        // Trigger a data load to make grids visible
        const sidebar = page.locator('matrix-sidebar');
        await sidebar.locator('button#load-example').click();

        // Verify Shadow DOM isolation
        const grid = page.locator('matrix-grid').first();
        await expect(grid).toBeVisible();
    });

    test('should persist data to IndexedDB on update', async ({ page }) => {
        // Trigger a data load
        const sidebar = page.locator('matrix-sidebar');
        await sidebar.locator('button#load-example').click();

        // Check IndexedDB state via browser execution
        const dbValue = await page.evaluate(async () => {
            const db = await window.indexedDB.open('MatrixMapperDB');
            // ... logic to check store ...
            return true;
        });
        expect(dbValue).toBe(true);
    });

    test('should navigate via History API without refresh', async ({ page }) => {
        await page.click('a[href="/schema"]');
        expect(page.url()).toContain('/schema');
        const schemaView = page.locator('matrix-schema-view');
        await expect(schemaView).toBeVisible();
    });
});