"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PlusButton } from "@/components/ui/PlusButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
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
import type { CalendarEventType } from "../types";

const TYPE_LABELS: Record<CalendarEventType, string> = {
  MEETING: "Họp",
  DEADLINE: "Hạn chót",
  BUSINESS_TRIP: "Công tác",
  OTHER: "Khác",
};

const TYPE_DOT: Record<CalendarEventType, string> = {
  MEETING: "bg-primary",
  DEADLINE: "bg-danger",
  BUSINESS_TRIP: "bg-yellow-500",
  OTHER: "bg-gray-400",
};

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

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

/**
 * A self-drawn month grid (Apple Calendar-style, simplified) - no calendar library added for
 * this one view (CLAUDE.md section 29). Events the caller didn't create themselves and that are
 * still PENDING get an Accept/Decline pair; everything else is read-only display.
 */
export function CalendarView() {
  const { data: events, isLoading } = useMyCalendarEvents();
  const createEvent = useCreateOwnEvent();
  const acceptEvent = useAcceptEvent();
  const declineEvent = useDeclineEvent();
  const deleteEvent = useDeleteEvent();
  const { showToast } = useToast();

  const [monthDate, setMonthDate] = useState(() => new Date());
  const [form, setForm] = useState({
    title: "",
    eventType: "MEETING" as CalendarEventType,
    startAt: "",
    description: "",
  });
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const grid = useMemo(() => buildMonthGrid(monthDate), [monthDate]);
  const today = new Date();

  const eventsByDay = (day: Date) =>
    (events ?? []).filter((e) => sameDay(new Date(e.startAt), day) && e.status !== "DECLINED");

  const pendingEvents = (events ?? []).filter((e) => e.status === "PENDING");

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await createEvent.mutateAsync({
        title: form.title,
        eventType: form.eventType,
        startAt: new Date(form.startAt).toISOString(),
        description: form.description || undefined,
      });
      setForm({ title: "", eventType: "MEETING", startAt: "", description: "" });
      showToast("success", "Đã thêm sự kiện");
      setCreating(false);
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không thêm được sự kiện");
    }
  }

  if (isLoading) {
    return <Skeleton rows={4} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Lịch của tôi</h2>
        <PlusButton label="Thêm sự kiện" onClick={() => setCreating(true)} />
      </div>

      {pendingEvents.length > 0 && (
        <section className="flex flex-col gap-2 rounded border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm font-medium text-gray-900">Sự kiện chờ bạn xác nhận</p>
          {pendingEvents.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {e.title} - {new Date(e.startAt).toLocaleString("vi-VN")}
                {e.createdByName && !e.createdBySelf && (
                  <span className="text-gray-500"> (thêm bởi {e.createdByName})</span>
                )}
              </span>
              <div className="flex gap-2">
                <Button onClick={() => acceptEvent.mutate(e.id)} loading={acceptEvent.isPending}>
                  Chấp nhận
                </Button>
                <Button variant="danger" onClick={() => declineEvent.mutate(e.id)} loading={declineEvent.isPending}>
                  Từ chối
                </Button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}
          >
            ←
          </Button>
          <p className="text-sm font-semibold text-gray-900">
            Tháng {monthDate.getMonth() + 1}/{monthDate.getFullYear()}
          </p>
          <Button
            variant="secondary"
            onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}
          >
            →
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded border border-gray-200 bg-gray-200 text-xs">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="bg-surface-muted px-2 py-1 text-center font-medium text-gray-500">
              {label}
            </div>
          ))}
          {grid.map((day) => {
            const dayEvents = eventsByDay(day);
            const isCurrentMonth = day.getMonth() === monthDate.getMonth();
            const isToday = sameDay(day, today);
            return (
              <div
                key={day.toISOString()}
                className={`min-h-20 bg-white p-1 ${isCurrentMonth ? "" : "bg-gray-50 text-gray-300"}`}
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${isToday ? "bg-primary text-primary-foreground" : ""}`}
                >
                  {day.getDate()}
                </span>
                <div className="mt-1 flex flex-col gap-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <span key={e.id} className="flex items-center gap-1 truncate text-[11px] text-gray-700">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TYPE_DOT[e.eventType]}`} />
                      {e.title}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium text-gray-700">Tất cả sự kiện</p>
        {(events ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">Chưa có sự kiện nào</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {(events ?? []).map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-200 px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <Badge tone={e.status === "DECLINED" ? "danger" : e.status === "PENDING" ? "warning" : "neutral"}>
                    {TYPE_LABELS[e.eventType]}
                  </Badge>
                  {e.title} - {new Date(e.startAt).toLocaleString("vi-VN")}
                </span>
                <Button variant="danger" onClick={() => deleteEvent.mutate(e.id)} loading={deleteEvent.isPending}>
                  Xoá
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {creating && (
        <Modal title="Thêm sự kiện mới" onClose={() => setCreating(false)}>
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Tiêu đề" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Select
            label="Loại"
            value={form.eventType}
            onChange={(e) => setForm({ ...form, eventType: e.target.value as CalendarEventType })}
            options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <Input
            label="Thời gian bắt đầu"
            type="datetime-local"
            value={form.startAt}
            onChange={(e) => setForm({ ...form, startAt: e.target.value })}
            required
          />
          <Input
            label="Mô tả (tuỳ chọn)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          {errorMessage && (
            <p role="alert" className="text-sm text-danger sm:col-span-2">
              {errorMessage}
            </p>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" loading={createEvent.isPending}>
              Thêm sự kiện
            </Button>
            <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
              Huỷ
            </Button>
          </div>
        </form>
        </Modal>
      )}
    </div>
  );
}
