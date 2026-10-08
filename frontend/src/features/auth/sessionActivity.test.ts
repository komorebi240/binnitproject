import { describe, expect, it } from "@jest/globals";
import { ACTIVITY_REPORT_INTERVAL_MS, shouldReportActivity } from "./sessionActivity";

describe("shouldReportActivity", () => {
  const lastReportAt = 1_000_000;

  it("reports nothing when the person did nothing, however long ago the last report was", () => {
    expect(shouldReportActivity({ actedSinceLastReport: false, lastReportAt, now: lastReportAt + 10 * ACTIVITY_REPORT_INTERVAL_MS })).toBe(false);
  });

  it("waits out the interval between reports", () => {
    expect(shouldReportActivity({ actedSinceLastReport: true, lastReportAt, now: lastReportAt + ACTIVITY_REPORT_INTERVAL_MS - 1 })).toBe(false);
  });

  it("reports an action once the interval has passed, exactly at the boundary included", () => {
    expect(shouldReportActivity({ actedSinceLastReport: true, lastReportAt, now: lastReportAt + ACTIVITY_REPORT_INTERVAL_MS })).toBe(true);
    expect(shouldReportActivity({ actedSinceLastReport: true, lastReportAt, now: lastReportAt + 3 * ACTIVITY_REPORT_INTERVAL_MS })).toBe(true);
  });

  it("does not report when the clock has gone backwards", () => {
    expect(shouldReportActivity({ actedSinceLastReport: true, lastReportAt, now: lastReportAt - 1 })).toBe(false);
  });
});
