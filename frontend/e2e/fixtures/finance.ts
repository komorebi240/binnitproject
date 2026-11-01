import { type Page } from "@playwright/test";

export async function financeFixture(page: Page, role: "ceo" | "accountant" | "employee" = "ceo") {
  await page.clock.setFixedTime(new Date("2026-10-31T03:00:00Z"));
  await page
    .context()
    .setExtraHTTPHeaders({ Cookie: "__Host-orbit_session=synthetic-finance-only" });
  const unexpected: string[] = [];
  let salary: Record<string, unknown> | null = null,
    entry: Record<string, unknown> | null = null,
    granted = false;
  const person = { userId: 11, fullName: "Synthetic Employee", accountant: false };
  const calls: { path: string; body: unknown }[] = [];
  const periods: string[] = [];
  let recoveryEmail: string | null = null;
  let completionWeight = 0.7;
  await page.route("**/api/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname.replace("/api/v1", ""),
      method = request.method();
    let data: unknown;
    if (path === "/auth/me") {
      if (method === "PATCH") {
        recoveryEmail = request.postDataJSON().email;
        calls.push({ path, body: request.postDataJSON() });
      }
      data = {
        userId: 10,
        username: "synthetic",
        fullName: "Synthetic Viewer",
        companyId: 1,
        companyName: "Synthetic",
        email: recoveryEmail,
        avatarUrl: null,
        authorityLevel: role === "ceo" ? "EXECUTIVE" : "EMPLOYEE",
        onboardingCompleted: true,
        termsAccepted: true,
        systemAccount: false,
        presenceStatus: "ONLINE",
      };
    } else if (path === "/auth/password" && method === "PATCH") {
      calls.push({ path, body: request.postDataJSON() });
      await route.fulfill({ status: 204 });
      return;
    } else if (path === "/finance/access")
      data = { allowed: role !== "employee", executive: role === "ceo" };
    else if (path === "/auth/session/activity") data = {};
    else if (path === "/companies/me") data = { id: 1, name: "Synthetic" };
    else if (/\/(?:logo|avatar|banner)$/.test(path)) {
      await route.fulfill({ status: 404 });
      return;
    } else if (path === "/notifications/unread-count") data = { count: 0 };
    else if (["/notes", "/notifications", "/tasks"].includes(path)) data = [];
    else if (path === "/terms/current") data = { version: 1, content: "Synthetic terms" };
    else if (path === "/kpi/config") {
      if (method === "PATCH") {
        completionWeight = request.postDataJSON().completionWeight;
        calls.push({ path, body: request.postDataJSON() });
      }
      data = {
        completionWeight,
        onTimeWeight: 1 - completionWeight,
        tiers: [{ minScore: 80, label: "Performance bonus" }],
      };
    } else if (path === "/leave/policy") data = { monthlyDayLimit: null };
    else if (path === "/finance/people") data = [person];
    else if (path === "/finance/accountants")
      data = granted ? [{ ...person, accountant: true }] : [];
    else if (path === "/finance/accountants/11") {
      granted = request.postDataJSON().enabled;
      calls.push({ path, body: request.postDataJSON() });
      data = {};
    } else if (path === "/finance/payslips" && method === "POST") {
      const body = request.postDataJSON();
      calls.push({ path, body });
      salary = {
        ...body,
        id: 42,
        employeeName: person.fullName,
        netSalary: "11800000",
        status: "DRAFT",
      };
      data = salary;
    } else if (path === "/finance/payslips")
      data = {
        items: salary ? [salary] : [],
        page: 0,
        size: 25,
        totalElements: salary ? 1 : 0,
        totalPages: 1,
      };
    else if (path.startsWith("/finance/payslips/42/")) {
      calls.push({ path, body: request.postData() ? request.postDataJSON() : null });
      const action = path.split("/").pop();
      salary = {
        ...salary,
        status:
          action === "submit"
            ? "PENDING"
            : action === "approve"
              ? "APPROVED"
              : action === "pay"
                ? "PAID"
                : "REJECTED",
      };
      if (action === "pay") salary.paidDate = "2026-10-31";
      data = salary;
    } else if (path === "/finance/entries" && method === "POST") {
      const body = request.postDataJSON();
      calls.push({ path, body });
      entry = { ...body, id: 81, voided: false };
      data = entry;
    } else if (path === "/finance/entries/81/void") {
      calls.push({ path, body: request.postDataJSON() });
      entry = { ...entry, voided: true, voidReason: request.postDataJSON().reason };
      data = entry;
    } else if (path === "/finance/entries")
      data = {
        items: entry ? [entry] : [],
        page: 0,
        size: 25,
        totalElements: entry ? 1 : 0,
        totalPages: 1,
      };
    else if (path === "/finance/reports") {
      const selectedPeriod = url.searchParams.get("period")!;
      periods.push(selectedPeriod);
      const ranges: Record<string, [string, string]> = {
        day: ["2026-10-31", "2026-11-01"],
        week: ["2026-10-26", "2026-11-02"],
        month: ["2026-10-01", "2026-11-01"],
        quarter: ["2026-10-01", "2027-01-01"],
        year: ["2026-01-01", "2027-01-01"],
      };
      const [from, until] = ranges[selectedPeriod]!;
      data = {
        period: url.searchParams.get("period"),
        from,
        until,
        currency: "VND",
        timeZone: "Asia/Ho_Chi_Minh",
        income: "20000000",
        expense: "11800000",
        net: "8200000",
        cashNet: "20000000",
        bankNet: "-11800000",
        categories: [
          { category: "SALES", income: "20000000", expense: "0" },
          { category: "SALARY", income: "0", expense: "11800000" },
        ],
        days: [{ date: "2026-10-31", income: "20000000", expense: "11800000" }],
      };
    } else {
      unexpected.push(`${method} ${path}`);
      await route.abort();
      return;
    }
    let pagination: unknown;
    if (method === "GET" && (path === "/finance/payslips" || path === "/finance/entries")) {
      const paged = data as {
        items: unknown[];
        page: number;
        size: number;
        totalElements: number;
        totalPages: number;
      };
      data = paged.items;
      const { items: _, ...meta } = paged;
      pagination = meta;
    }
    await route.fulfill({
      json: {
        success: true,
        data,
        meta: { timestamp: "2026-10-31T03:00:00Z", ...(pagination ? { pagination } : {}) },
      },
    });
  });
  return {
    unexpected,
    calls,
    periods,
    seedPending: () => {
      salary = {
        id: 42,
        userId: 11,
        month: "2026-10",
        employeeName: person.fullName,
        baseSalary: "10000000",
        allowance: "1250000",
        bonus: "750000",
        deduction: "200000",
        netSalary: "11800000",
        note: "Synthetic",
        status: "PENDING",
      };
    },
  };
}
