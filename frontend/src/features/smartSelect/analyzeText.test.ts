import { describe, expect, it } from "@jest/globals";
import { analyzeText, parseAmount } from "./analyzeText";

// A fixed "today" so relative words and dates without a year are predictable.
const TODAY = new Date(2026, 9, 17); // 17 October 2026

describe("analyzeText - dates and times", () => {
  it("reads numeric, ISO, spelled-out and relative dates in reading order", () => {
    const { dates } = analyzeText(
      "Họp 20/10/2026, nộp báo cáo 2026-11-05, ngày 3 tháng 12 năm 2026 tổng kết, hôm nay và ngày mai, giao 25/12.",
      TODAY,
    );

    expect(dates.map((d) => d.date)).toEqual(["2026-10-20", "2026-11-05", "2026-12-03", "2026-10-17", "2026-10-18", "2026-12-25"]);
  });

  it("refuses dates that do not exist and reads two-digit years as 20xx", () => {
    expect(analyzeText("31/02/2026 và 30/13/2026", TODAY).dates).toEqual([]);
    expect(analyzeText("5-1-27", TODAY).dates.map((d) => d.date)).toEqual(["2027-01-05"]);
  });

  it("reads clock times, Vietnamese hours and the part of the day", () => {
    const { times } = analyzeText("Bắt đầu 14:30, nghỉ 9h15, họp 3 giờ chiều, gọi lại 8 giờ 5 phút sáng, 7:45 PM", TODAY);

    expect(times.map((t) => t.time)).toEqual(["14:30", "09:15", "15:00", "08:05", "19:45"]);
  });

  it("does not read words that only look like times", () => {
    expect(analyzeText("2 hours, 25:00, 9:75", TODAY).times).toEqual([]);
  });
});

describe("analyzeText - contacts and links", () => {
  it("finds emails, Vietnamese and international phones, and links without trailing punctuation", () => {
    const result = analyzeText(
      "Liên hệ an.nguyen@congty.vn hoặc 0912 345 678, 028 3822 1234, +84 912.345.678, +1 415 555 0100. Xem https://example.com/plan).",
      TODAY,
    );

    expect(result.emails).toEqual(["an.nguyen@congty.vn"]);
    expect(result.phones).toEqual(["0912345678", "02838221234", "+84912345678", "+14155550100"]);
    expect(result.links).toEqual(["https://example.com/plan"]);
  });

  it("does not take a date for a phone number", () => {
    const result = analyzeText("05.10.2026", TODAY);
    expect(result.phones).toEqual([]);
    expect(result.dates.map((d) => d.date)).toEqual(["2026-10-05"]);
  });
});

describe("analyzeText - money and numbers", () => {
  it("reads Vietnamese and foreign amounts with their multipliers", () => {
    const { money } = analyzeText("Giá 1.500.000đ, đặt cọc 500k, ngân sách 1,5 triệu, vốn 2 tỷ đồng, phí $1,200 và 30 EUR", TODAY);

    expect(money.map((m) => [m.amount, m.currency])).toEqual([
      [1_500_000, "VND"],
      [500_000, "VND"],
      [1_500_000, "VND"],
      [2_000_000_000, "VND"],
      [1_200, "USD"],
      [30, "EUR"],
    ]);
  });

  it("keeps plain numbers and percentages apart from everything else", () => {
    const result = analyzeText("Tăng 15% so với 2025, còn 42 khách và 5 trang", TODAY);

    expect(result.money).toEqual([]);
    expect(result.numbers).toEqual(["15%", "2025", "42", "5"]);
  });

  it("parses thousands and decimal separators the way people write them", () => {
    expect(parseAmount("1.500.000")).toBe(1_500_000);
    expect(parseAmount("1,500")).toBe(1_500);
    expect(parseAmount("1,5")).toBe(1.5);
    expect(parseAmount("2.5")).toBe(2.5);
    expect(parseAmount("1.234,56")).toBe(1234.56);
    expect(parseAmount("1,234.56")).toBe(1234.56);
  });
});

describe("analyzeText - counts and suggestion", () => {
  it("counts characters, words and non-empty lines", () => {
    expect(analyzeText("Một hai ba\n\n bốn - năm ", TODAY).stats).toEqual({ characters: 23, words: 5, lines: 2 });
  });

  it("suggests the first line as the title with the first date and time found", () => {
    const { suggestion } = analyzeText("\n  Họp khách hàng ABC  \nlúc 9h30 ngày 20/10/2026", TODAY);

    expect(suggestion).toEqual({ title: "Họp khách hàng ABC", date: "2026-10-20", time: "09:30" });
  });

  it("shortens a very long first line and suggests nothing when there is no date", () => {
    const { suggestion } = analyzeText("x".repeat(300), TODAY);

    expect(suggestion.title).toHaveLength(120);
    expect(suggestion.title.endsWith("…")).toBe(true);
    expect(suggestion.date).toBeNull();
    expect(suggestion.time).toBeNull();
  });
});
