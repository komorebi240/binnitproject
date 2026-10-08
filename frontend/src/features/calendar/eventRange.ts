import type { TranslationKey } from "@/lib/i18n/dictionary";
import type { CalendarEvent, CalendarEventType, CreateCalendarEventInput } from "./types";

export const TYPE_KEYS: Record<CalendarEventType, TranslationKey> = {
  MEETING: "calendar.eventRange.meeting",
  DEADLINE: "common.deadline",
  BUSINESS_TRIP: "calendar.eventRange.businessTrip",
  OTHER: "calendar.eventRange.other",
};

export const UPCOMING_LIMIT = 8;

type EventSpan = Pick<CalendarEvent, "startAt" | "endAt">;

/** What the add-event forms collect; a business trip uses the two dates, every other type one date and time. */
export interface EventFormValues {
  title: string;
  eventType: CalendarEventType;
  startAt: string;
  startDate: string;
  endDate: string;
  description: string;
}

export const EMPTY_EVENT_FORM: EventFormValues = {
  title: "",
  eventType: "MEETING",
  startAt: "",
  startDate: "",
  endDate: "",
  description: "",
};

function dayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function eventEnd(event: EventSpan): Date {
  return new Date(event.endAt ?? event.startAt);
}

function isSameDay(a: Date, b: Date): boolean {
  return dayStart(a).getTime() === dayStart(b).getTime();
}

/** True when `day` falls between the event's first and last day (a multi-day trip covers every day in between). */
export function coversDay(event: EventSpan, day: Date): boolean {
  const target = dayStart(day).getTime();
  return dayStart(new Date(event.startAt)).getTime() <= target && target <= dayStart(eventEnd(event)).getTime();
}

/** Events that have not finished yet, soonest first (declined ones never show). */
export function upcomingEvents<T extends EventSpan & Pick<CalendarEvent, "status">>(
  events: T[],
  now: Date,
  limit = UPCOMING_LIMIT,
): T[] {
  return events
    .filter((event) => event.status !== "DECLINED" && eventEnd(event).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, limit);
}

/** "5/10 09:30" for a one-day event, "5/10 - 9/10" for a trip that spans several days (day and month in the order of `locale`). */
export function formatSpan(event: EventSpan, locale: string): string {
  const start = new Date(event.startAt);
  const label = (date: Date) => date.toLocaleDateString(locale, { day: "numeric", month: "numeric" });
  if (!event.endAt || isSameDay(start, new Date(event.endAt))) {
    return `${label(start)} ${start.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`;
  }
  return `${label(start)} - ${label(new Date(event.endAt))}`;
}

/** Turns the form into the API payload; a trip runs from the start of its first day to the end of its last. */
export function toEventInput(form: EventFormValues): CreateCalendarEventInput {
  const base = { title: form.title, eventType: form.eventType, description: form.description || undefined };
  if (form.eventType === "BUSINESS_TRIP") {
    const start = new Date(`${form.startDate}T00:00:00`);
    const end = new Date(`${form.endDate}T23:59:59`);
    return { ...base, startAt: start.toISOString(), endAt: end.toISOString() };
  }
  return { ...base, startAt: new Date(form.startAt).toISOString() };
}
