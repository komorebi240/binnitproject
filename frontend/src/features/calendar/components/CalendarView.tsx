"use client";

import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PlusButton } from "@/components/ui/PlusButton";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import {
  useAcceptEvent,
  useCreateOwnEvent,
  useDeclineEvent,
  useDeleteEvent,
  useMyCalendarEvents,
} from "../hooks/useCalendar";
import { coversDay, EMPTY_EVENT_FORM, formatSpan, toEventInput, TYPE_KEYS, upcomingEvents } from "../eventRange";
import type { CalendarEvent, CalendarEventType } from "../types";
import { CalendarEventFields } from "./CalendarEventFields";

import { useI18n } from "@/lib/i18n/useI18n";
import { weekdayShortKey } from "@/lib/weekdays";
const TYPE_DOT: Record<CalendarEventType, string> = {
  MEETING: "bg-primary",
  DEADLINE: "bg-danger",
  BUSINESS_TRIP: "bg-warning",
  OTHER: "bg-fg-faint",
};

// Monday first, as `Date.getDay()` numbers (0 = Sunday)
const WEEKDAYS_MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Mon-first 6-week grid covering the given month - the simplest layout that always fits every month. */
function buildMonthGrid(monthDate: Date): Date[] {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = Monday
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function EventRow({ event, onDelete, deleting }: { event: CalendarEvent; onDelete: () => void; deleting: boolean }) {
  const { t, intlLocale } = useI18n();
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded border border-line px-3 py-2 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <Badge tone={event.status === "PENDING" ? "warning" : "neutral"}>{t(TYPE_KEYS[event.eventType])}</Badge>
        <span className="truncate">{event.title}</span>
        <span className="shrink-0 text-fg-muted">{formatSpan(event, intlLocale)}</span>
      </span>
      <Button variant="danger" onClick={onDelete} loading={deleting}>
        {t("common.delete")}
      </Button>
    </li>
  );
}

/**
 * A self-drawn month grid (Apple Calendar-style, simplified) - no calendar library added for
 * this one view (CLAUDE.md section 29). Events the caller didn't create themselves and that are
 * still PENDING get an Accept/Decline pair; clicking a day opens that day's events, and below the
 * grid only what is coming up is listed (not the whole history).
 */
export function CalendarView() {
  const { t, intlLocale } = useI18n();
  const { data: events, isLoading } = useMyCalendarEvents();
  const createEvent = useCreateOwnEvent();
  const acceptEvent = useAcceptEvent();
  const declineEvent = useDeclineEvent();
  const deleteEvent = useDeleteEvent();
  const { showToast } = useToast();

  const [monthDate, setMonthDate] = useState(() => new Date());
  const [form, setForm] = useState(EMPTY_EVENT_FORM);
  const [creating, setCreating] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const grid = useMemo(() => buildMonthGrid(monthDate), [monthDate]);
  const today = new Date();

  const eventsOnDay = (day: Date) => (events ?? []).filter((e) => coversDay(e, day) && e.status !== "DECLINED");
  const pendingEvents = (events ?? []).filter((e) => e.status === "PENDING");
  const coming = upcomingEvents(events ?? [], today);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await createEvent.mutateAsync(toEventInput(form));
      setForm(EMPTY_EVENT_FORM);
      showToast("success", t("calendar.calendarView.eventAdded"));
      setCreating(false);
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : t("calendar.calendarView.couldnTAddTheEvent"));
    }
  }

  if (isLoading) {
    return <Skeleton rows={4} />;
  }

  const selectedEvents = selectedDay ? eventsOnDay(selectedDay) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-fg">{t("common.myCalendar")}</h2>
        <PlusButton label={t("common.addAnEvent")} onClick={() => setCreating(true)} />
      </div>

      {pendingEvents.length > 0 && (
        <Alert tone="warning" title={t("calendar.calendarView.eventsWaitingForYourConfirmation")} className="p-4">
          {pendingEvents.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {e.title} - {formatSpan(e, intlLocale)}
                {e.createdByName && !e.createdBySelf && (
                  <span className="opacity-80"> {t("calendar.calendarView.addedByName", { name: e.createdByName })}</span>
                )}
              </span>
              <div className="flex gap-2">
                <Button onClick={() => acceptEvent.mutate(e.id)} loading={acceptEvent.isPending}>
                  {t("calendar.calendarView.accept")}
                </Button>
                <Button variant="danger" onClick={() => declineEvent.mutate(e.id)} loading={declineEvent.isPending}>
                  {t("common.decline")}
                </Button>
              </div>
            </div>
          ))}
        </Alert>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}
          >
            ←
          </Button>
          <p className="text-sm font-semibold text-fg">
            {t("calendar.calendarView.monthYear", {
              month: monthDate.getMonth() + 1,
              monthName: monthDate.toLocaleDateString(intlLocale, { month: "long" }),
              year: monthDate.getFullYear(),
            })}
          </p>
          <Button
            variant="secondary"
            onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}
          >
            →
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded border border-line bg-line text-xs">
          {WEEKDAYS_MONDAY_FIRST.map((weekday) => (
            <div key={weekday} className="bg-surface-muted/70 px-2 py-1 text-center font-medium text-fg-muted">
              {t(weekdayShortKey(weekday))}
            </div>
          ))}
          {grid.map((day) => {
            const dayEvents = eventsOnDay(day);
            const isCurrentMonth = day.getMonth() === monthDate.getMonth();
            const isToday = sameDay(day, today);
            return (
              <button
                type="button"
                key={day.toISOString()}
                onClick={() => setSelectedDay(day)}
                aria-label={t("calendar.calendarView.vV2V32", { v: day.getDate(), v2: day.getMonth() + 1, v3: dayEvents.length > 0 ? t("calendar.calendarView.eventCountSuffix", { count: dayEvents.length }) : "" })}
                className={`min-h-20 bg-surface/60 p-1 text-left transition-colors duration-150 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${isCurrentMonth ? "" : "bg-surface-muted/40 text-fg-faint"}`}
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${isToday ? "bg-primary text-primary-foreground" : ""}`}
                >
                  {day.getDate()}
                </span>
                <span className="mt-1 flex flex-col gap-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <span key={e.id} className="flex items-center gap-1 truncate text-[11px] text-fg-soft">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TYPE_DOT[e.eventType]}`} />
                      {e.title}
                    </span>
                  ))}
                  {dayEvents.length > 3 && <span className="text-[11px] text-fg-faint">{t("calendar.calendarView.moreCount", { count: dayEvents.length - 3 })}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium text-fg-soft">{t("common.upcomingEvents")}</p>
        {coming.length === 0 ? (
          <p className="text-sm text-fg-faint">{t("calendar.calendarView.noUpcomingEvents")}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {coming.map((e) => (
              <EventRow key={e.id} event={e} onDelete={() => deleteEvent.mutate(e.id)} deleting={deleteEvent.isPending} />
            ))}
          </ul>
        )}
      </section>

      {selectedDay && (
        <Modal
          title={t("calendar.calendarView.vV2V3", { v: selectedDay.getDate(), v2: selectedDay.getMonth() + 1, v3: selectedDay.getFullYear() })}
          onClose={() => setSelectedDay(null)}
        >
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-fg-faint">{t("calendar.calendarView.noEventsOnThisDay")}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {selectedEvents.map((e) => (
                <EventRow key={e.id} event={e} onDelete={() => deleteEvent.mutate(e.id)} deleting={deleteEvent.isPending} />
              ))}
            </ul>
          )}
        </Modal>
      )}

      {creating && (
        <Modal title={t("calendar.calendarView.addANewEvent")} onClose={() => setCreating(false)}>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CalendarEventFields form={form} onChange={setForm} />
            {errorMessage && (
              <p role="alert" className="text-sm text-danger sm:col-span-2">
                {errorMessage}
              </p>
            )}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" loading={createEvent.isPending}>
                {t("common.addAnEvent")}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
