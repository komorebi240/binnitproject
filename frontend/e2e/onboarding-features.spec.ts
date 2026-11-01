import { test, expect } from "@playwright/test";
import { workspaceFixture } from "./fixtures/workspace";

test("first-run guide explains meetings, attendance, leave and finance access", async ({ page }) => {
  await workspaceFixture(page);
  await page.route("**/api/v1/auth/me", async route => {
    // Keep all test data synthetic; do not forward the session to a real API.
    await route.fulfill({ json: { success: true, data: { userId: 10, username: "synthetic", fullName: "Synthetic Viewer", companyId: 1, companyName: "Synthetic", email: null, avatarUrl: null, authorityLevel: "EMPLOYEE", onboardingCompleted: false, termsAccepted: true, systemAccount: false, presenceStatus: "ONLINE" } } });
  });
  await page.goto("/dashboard");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const seen = new Set<string>();
  for (let index = 0; index < 35; index++) {
    const title = await dialog.locator("h3").innerText();
    seen.add(title);
    if (title === "Meet") {
      await expect(dialog).toContainText("Google Meet");
      await page.screenshot({path: test.info().outputPath("guide-meetings.png")});
    }
    if (title === "Tài chính") break;
    await dialog.locator("button").last().click();
  }
  expect([...seen]).toEqual(expect.arrayContaining(["Meet", "Chấm công", "Nghỉ phép", "Tài chính"]));
  await expect(dialog).toContainText("quyền tài chính");
});

test("landing introduces the new features without horizontal overflow", async ({ page, isMobile }) => {
  await page.goto("/#features");
  if (isMobile) {
    await expect(page.locator('.mk-mobile-features > li')).toHaveCount(13);
    await expect(page.locator('.mk-feature-stacks')).toBeHidden();
    return;
  }
  const features = page.locator("#features");
  for (const title of ["Công việc & dự án", "Tổ chức & con người", "Lịch & thời gian", "Trao đổi & không gian làm việc", "Tài chính"]) {
    const trigger = features.getByRole("button", {name: new RegExp(title.replace("&", "&"))});
    await trigger.press("Enter");
    await expect(features.getByRole("region", {name:title,exact:true})).toBeVisible();
    await expect(page.locator(".mk-feature-dim")).toHaveCount(0);
    if (title === "Lịch & thời gian") await page.screenshot({path: test.info().outputPath("feature-group-open.png")});
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await features.screenshot({path: test.info().outputPath("landing-features.png")});
  await page.goto("/en#features");
  await page.locator("#features").getByRole("button", {name: /^Finance/}).press("Enter");
  await expect(page.getByRole("heading", {name: "Finance with access controls", exact: true})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test("scroll connects the three steps progressively", async ({ page, isMobile }) => {
  test.skip(isMobile, "Mobile shows steps without scroll pinning");
  await page.emulateMedia({reducedMotion: "no-preference"});
  await page.goto("/");
  const journey = page.locator(".mk-step-journey");
  await page.evaluate(() => document.fonts.ready);
  await journey.evaluate(el => el.scrollIntoView({behavior: "instant", block: "start"}));
  const start = await journey.evaluate(el => el.getBoundingClientRect().top + window.scrollY);
  const height = await journey.evaluate(el => el.getBoundingClientRect().height);
  await page.evaluate(y => window.scrollTo(0, y), start);
  await expect(page.locator(".mk-step-node.is-reached")).toHaveCount(1);
  await page.evaluate(y => window.scrollTo(0, y), start + height * .4);
  await expect(page.locator(".mk-step-node.is-reached")).toHaveCount(2);
  await page.evaluate(y => window.scrollTo(0, y), start + height * .75);
  await expect(page.locator(".mk-step-node.is-reached")).toHaveCount(3);
  await expect(page.locator("#how-it-works-title")).toBeInViewport();
  await page.screenshot({path: test.info().outputPath("scroll-steps.png")});
});
