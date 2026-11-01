import { test as base, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function checkAccessibility(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const violations = results.violations.map(({ id, impact, help, nodes }) => ({
    id,
    impact,
    help,
    targets: nodes.map((node) => node.target),
  }));
  await test.info().attach("accessibility-summary", {
    contentType: "application/json",
    body: JSON.stringify({
      path: new URL(page.url()).pathname,
      engine: results.testEngine,
      passedRules: results.passes.map(({ id }) => id),
      needsManualReview: results.incomplete.map(({ id }) => id),
      violations,
    }),
  });
  expect(violations, "WCAG A/AA violations in the rendered public page").toEqual([]);
}

// Prevent accidental contact with a live API. Individual tests fulfill their own synthetic responses.
const test = base.extend<{ apiGuard: void }>({
  apiGuard: [
    async ({ context }, use) => {
      const unexpected: string[] = [];
      await context.route("**/api/**", async (route) => {
        unexpected.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
        await route.abort();
      });
      await use();
      expect(unexpected, "Unexpected API calls must be mocked explicitly").toEqual([]);
    },
    { auto: true },
  ],
});

async function openLogin(page: Page) {
  await page.goto("/login?open=login");
  await expect(page.getByRole("heading", { name: "Đăng nhập hệ thống" })).toBeVisible();
}

test.describe("stationary wordmark reveal", () => {
  test.use({ reducedMotion: "no-preference" });
  test("keyboard can skip the reveal and reach the sign-in form", async ({ page, isMobile }) => {
    await page.goto("/login");
    await expect(page.getByRole("img", { name: "Orbit", exact: true })).toBeVisible();
    await page.keyboard.press("Enter");
    if (!isMobile) {
      await expect(page.locator(".landing-hint")).toBeVisible();
      await page.keyboard.press("Tab");
    }
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Đăng nhập hệ thống" })).toBeVisible();
  });
});

test("security headers remain enabled and the unused image optimizer stays disabled", async ({
  request,
}) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
  expect(response.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  const image = await request.get("/_next/image?url=%2Ffavicon.ico&w=64&q=75");
  expect(image.status()).toBe(404);
});

test("invitation links resolve their route token after the framework upgrade", async ({ page }) => {
  const token = "synthetic-invitation-token";
  await page.route(`**/api/v1/auth/invitations/${token}`, (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          email: "invitee@example.test",
          companyName: "Smoke Company",
          authorityLevel: "EMPLOYEE",
          inviterName: "Smoke Manager",
        },
      },
    }),
  );
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      status: 401,
      json: { success: false, error: { code: "UNAUTHENTICATED", message: "Synthetic" } },
    }),
  );
  await page.route("**/api/v1/terms/current?*", (route) =>
    route.fulfill({ json: { success: true, data: { version: 1, content: "Synthetic terms" } } }),
  );
  await page.goto(`/invite/${token}`);
  await expect(page.getByText("Smoke Company", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("invitee@example.test");
});

test("public marketing pages retain Vietnamese and English navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Đưa doanh nghiệp");
  await checkAccessibility(page);
  await page.getByRole("link", { name: "English", exact: true }).first().click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Bring your business");
  await checkAccessibility(page);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});

test("anonymous dashboard navigation returns to the sign-in page", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Đăng nhập", exact: true })).toBeVisible();
});

test("empty sign-in stays local and password reveal preserves the value", async ({ page }) => {
  await openLogin(page);
  await checkAccessibility(page);
  await page.getByRole("dialog").getByRole("button", { name: "Đăng nhập", exact: true }).click();
  const username = page.getByLabel("Tên đăng nhập", { exact: true });
  await expect(username).toHaveAttribute("aria-invalid", "true");
  await username.fill("smoke-user");
  const password = page.getByLabel("Mật khẩu", { exact: true });
  await password.fill("synthetic-password");
  await page.getByRole("button", { name: "Hiện mật khẩu" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("synthetic-password");
  await page.getByRole("button", { name: "Ẩn mật khẩu" }).click();
  await expect(password).toHaveAttribute("type", "password");
});

test("a rejected sign-in shows a generic error and clears the password", async ({ page }) => {
  await page.route("**/api/v1/auth/login", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({
      username: "smoke-user",
      password: "synthetic-password",
    });
    await route.fulfill({
      status: 401,
      json: {
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Synthetic rejection" },
        meta: { timestamp: "2026-01-01T00:00:00Z" },
      },
    });
  });
  await openLogin(page);
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("smoke-user");
  const password = page.getByLabel("Mật khẩu", { exact: true });
  await password.fill("synthetic-password");
  await page.getByRole("dialog").getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText(
    "Tên đăng nhập hoặc mật khẩu không đúng.",
  );
  await expect(password).toHaveValue("");
  await expect(page).toHaveURL(/\/login\?open=login$/);
  const stored = await page.evaluate(() => JSON.stringify(window.localStorage));
  expect(stored).not.toContain("synthetic-password");
});
