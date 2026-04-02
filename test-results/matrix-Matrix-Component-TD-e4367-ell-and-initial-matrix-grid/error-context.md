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

Locator: locator('matrix-grid')
Expected: visible
Error: strict mode violation: locator('matrix-grid') resolved to 3 elements:
    1) <matrix-grid id="grid-current"></matrix-grid> aka locator('#grid-current')
    2) <matrix-grid id="grid-proposed"></matrix-grid> aka locator('#grid-proposed')
    3) <matrix-grid id="grid-delta"></matrix-grid> aka locator('#grid-delta')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('matrix-grid')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - banner [ref=e3]:
    - heading "Conceptual Matrix Mapper" [level=1] [ref=e4]
    - generic [ref=e5]: v3
    - generic [ref=e6]:
      - link "Matrix" [ref=e7] [cursor=pointer]:
        - /url: /
      - link "Schema" [ref=e8] [cursor=pointer]:
        - /url: /schema
      - link "LLM Prompt" [ref=e9] [cursor=pointer]:
        - /url: /prompt
  - generic [ref=e10]:
    - generic [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]:
          - text: JSON Input
          - button "Example" [ref=e14] [cursor=pointer]
        - textbox "Paste matrix JSON here..." [ref=e15]
      - generic [ref=e16]:
        - generic [ref=e17]: Source Text
        - textbox "Paste original source text here..." [ref=e18]
      - generic [ref=e19]:
        - combobox [ref=e20]:
          - option "Anthropic" [selected]
          - option "Gemini"
          - option "Local (llama.cpp)"
        - textbox "API Key..." [ref=e21]
      - generic [ref=e22]:
        - button "Render →" [ref=e23] [cursor=pointer]
        - button "▶ Run Loop" [disabled] [ref=e24]
        - button "■ Stop" [disabled] [ref=e25]
      - generic [ref=e28]: Load a matrix to begin.
    - generic [ref=e29]:
      - generic [ref=e31]:
        - generic [ref=e32]:
          - generic [ref=e33]: Association
          - generic [ref=e35]: Discrimination
          - generic [ref=e37]: Dependency
          - generic [ref=e39]: Deliberate gap
          - generic [ref=e41]: Break
          - generic [ref=e43]: Fixed (proposed)
          - generic [ref=e45]: Conflation
        - generic [ref=e47]:
          - generic [ref=e49]:
            - generic [ref=e50]: Current
            - generic [ref=e51]: as extracted
            - generic [ref=e52]: —
          - generic [ref=e55]:
            - generic [ref=e56]: Proposed
            - generic [ref=e57]: optimised
            - generic [ref=e58]: —
          - generic [ref=e61]:
            - generic [ref=e62]: Error Δ
            - generic [ref=e63]: proposed − current
            - generic [ref=e64]: —
      - generic [ref=e68]:
        - button "Source text" [ref=e69] [cursor=pointer]
        - button "Proposed text" [ref=e70] [cursor=pointer]
        - button "Diff" [ref=e71] [cursor=pointer]
        - button "Log" [ref=e72] [cursor=pointer]
        - button "▲" [ref=e73] [cursor=pointer]
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
  10 |         await expect(shell).toBeVisible();
  11 |
  12 |         // Verify Shadow DOM isolation
  13 |         const grid = page.locator('matrix-grid');
> 14 |         await expect(grid).toBeVisible();
     |                            ^ Error: expect(locator).toBeVisible() failed
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