import { describe, expect, it } from "@jest/globals";
import { coversDay, EMPTY_EVENT_FORM, formatSpan, toEventInput, upcomingEvents } from "./eventRange";

const at = (local: string) => new Date(local).toISOString();

describe("eventRange", () => {
  it("a trip covers every day between its first and last day", () => {
    const trip = { startAt: at("2026-10-05T00:00:00"), endAt: at("2026-10-09T23:59:59") };
    expect(coversDay(trip, new Date(2026, 9, 5))).toBe(true);
    expect(coversDay(trip, new Date(2026, 9, 7))).toBe(true);
    expect(coversDay(trip, new Date(2026, 9, 9))).toBe(true);
    expect(coversDay(trip, new Date(2026, 9, 10))).toBe(false);
    expect(coversDay(trip, new Date(2026, 9, 4))).toBe(false);
  });

  it("an event without an end covers only its own day", () => {
    const meeting = { startAt: at("2026-10-05T09:00:00"), endAt: null };
    expect(coversDay(meeting, new Date(2026, 9, 5))).toBe(true);
    expect(coversDay(meeting, new Date(2026, 9, 6))).toBe(false);
  });

  it("upcoming keeps unfinished events in start order and drops declined and past ones", () => {
    const events = [
      { id: 1, status: "CONFIRMED" as const, startAt: at("2026-10-20T09:00:00"), endAt: null },
      { id: 2, status: "DECLINED" as const, startAt: at("2026-10-10T09:00:00"), endAt: null },
      { id: 3, status: "CONFIRMED" as const, startAt: at("2026-09-01T09:00:00"), endAt: null },
      { id: 4, status: "PENDING" as const, startAt: at("2026-10-01T09:00:00"), endAt: at("2026-10-12T23:59:59") },
    ];
    const result = upcomingEvents(events, new Date(at("2026-10-06T08:00:00")));
    expect(result.map((e) => e.id)).toEqual([4, 1]);
  });

  it("upcoming is limited", () => {
    const events = Array.from({ length: 12 }, (_, i) => ({
      status: "CONFIRMED" as const,
      startAt: at(`2026-11-${String(i + 1).padStart(2, "0")}T09:00:00`),
      endAt: null,
    }));
    expect(upcomingEvents(events, new Date(at("2026-10-06T08:00:00")), 5)).toHaveLength(5);
  });

  it("formatSpan shows a date range for trips", () => {
    expect(formatSpan({ startAt: at("2026-10-05T00:00:00"), endAt: at("2026-10-09T23:59:59") })).toBe("5/10 - 9/10");
  });

  it("a trip becomes a first-day to last-day range", () => {
    const input = toEventInput({
      ...EMPTY_EVENT_FORM,
      title: "Ha Noi",
      eventType: "BUSINESS_TRIP",
      startDate: "2026-10-05",
      endDate: "2026-10-09",
    });
    expect(input.startAt).toBe(at("2026-10-05T00:00:00"));
    expect(input.endAt).toBe(at("2026-10-09T23:59:59"));
  });

  it("other types send a single start and no end", () => {
    const input = toEventInput({ ...EMPTY_EVENT_FORM, title: "Hop", startAt: "2026-10-05T09:30" });
    expect(input.startAt).toBe(at("2026-10-05T09:30"));
    expect(input.endAt).toBeUndefined();
  });
});
