# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: matrix.spec.ts >> Matrix Component TDD >> should render the app shell and initial matrix grid
- Location: tests/matrix.spec.ts:8:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('matrix-app-shell')
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('matrix-app-shell')
    8 × locator resolved to <matrix-app-shell></matrix-app-shell>
      - unexpected value "hidden"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test.describe('Matrix Component TDD', () => {
  4  |     test.beforeEach(async ({ page }) => {
  5  |         await page.goto('/');
  6  |     });
  7  |
  8  |     test('should render the app shell and initial matrix grid', async ({ page }) => {
  9  |         const shell = page.locator('matrix-app-shell');
> 10 |         await expect(shell).toBeVisible();
     |                             ^ Error: expect(locator).toBeVisible() failed
  11 |
  12 |         // Verify Shadow DOM isolation
  13 |         const grid = page.locator('matrix-grid');
  14 |         await expect(grid).toBeVisible();
  15 |     });
  16 |
  17 |     test('should persist data to IndexedDB on update', async ({ page }) => {
  18 |         // Trigger a data load
  19 |         await page.click('button#load-example');
  20 |
  21 |         // Check IndexedDB state via browser execution
  22 |         const dbValue = await page.evaluate(async () => {
  23 |             const db = await window.indexedDB.open('MatrixMapperDB');
  24 |             // ... logic to check store ...
  25 |             return true;
  26 |         });
  27 |         expect(dbValue).toBe(true);
  28 |     });
  29 |
  30 |     test('should navigate via History API without refresh', async ({ page }) => {
  31 |         await page.click('a[href="/schema"]');
  32 |         expect(page.url()).toContain('/schema');
  33 |         const schemaView = page.locator('matrix-schema-view');
  34 |         await expect(schemaView).toBeVisible();
  35 |     });
  36 | });
```