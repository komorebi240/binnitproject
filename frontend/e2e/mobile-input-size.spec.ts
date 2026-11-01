import { test, expect } from "@playwright/test";

test("touch form fields stay large enough to avoid Safari focus zoom", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Touch-device typography regression");
  await page.goto("/login?open=login");
  const fields = page.locator('input:visible:not([type="checkbox"]):not([type="radio"])');
  expect(await fields.count()).toBeGreaterThan(0);
  for (const field of await fields.all()) {
    await field.focus();
    expect(await field.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
  }
  // Exercise utility and workspace selectors that previously overrode the mobile rule.
  await page.evaluate(() => {
    const host = document.createElement("div");
    host.className = "task-search workspace-chat-list";
    host.innerHTML = '<input class="text-xs" /><textarea class="text-sm"></textarea><select class="text-xs"><option>Test</option></select><div contenteditable="true" class="text-xs">Test</div>';
    host.dataset.zoomRegression = "true";
    document.body.append(host);
  });
  for (const field of await page.locator('[data-zoom-regression] > *').all()) {
    expect(await field.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
  }
});
