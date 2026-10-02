export type CalendarEventType = "MEETING" | "DEADLINE" | "BUSINESS_TRIP" | "OTHER";
export type CalendarEventStatus = "CONFIRMED" | "PENDING" | "DECLINED";

export interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  eventType: CalendarEventType;
  startAt: string;
  endAt: string | null;
  status: CalendarEventStatus;
  createdByUserId: number;
  createdByName: string | null;
  createdBySelf: boolean;
}

export interface CreateCalendarEventInput {
  title: string;
  description?: string;
  eventType: CalendarEventType;
  startAt: string;
  endAt?: string;
}
