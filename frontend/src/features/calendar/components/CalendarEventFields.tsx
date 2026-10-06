"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TYPE_LABELS, type EventFormValues } from "../eventRange";
import type { CalendarEventType } from "../types";

interface CalendarEventFieldsProps {
  form: EventFormValues;
  onChange: (form: EventFormValues) => void;
}

/** The fields shared by "add my event" and "add an event for a staff member"; a business trip asks for a from/to date range. */
export function CalendarEventFields({ form, onChange }: CalendarEventFieldsProps) {
  const isTrip = form.eventType === "BUSINESS_TRIP";
  return (
    <>
      <Input label="Tiêu đề" value={form.title} onChange={(e) => onChange({ ...form, title: e.target.value })} required />
      <Select
        label="Loại"
        value={form.eventType}
        onChange={(e) => onChange({ ...form, eventType: e.target.value as CalendarEventType })}
        options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
      />
      {isTrip ? (
        <>
          <Input
            label="Công tác từ ngày"
            type="date"
            value={form.startDate}
            onChange={(e) => onChange({ ...form, startDate: e.target.value })}
            required
          />
          <Input
            label="Đến ngày"
            type="date"
            value={form.endDate}
            min={form.startDate || undefined}
            onChange={(e) => onChange({ ...form, endDate: e.target.value })}
            required
          />
        </>
      ) : (
        <Input
          label="Thời gian bắt đầu"
          type="datetime-local"
          value={form.startAt}
          onChange={(e) => onChange({ ...form, startAt: e.target.value })}
          required
        />
      )}
      <Input
        label="Mô tả (tuỳ chọn)"
        value={form.description}
        onChange={(e) => onChange({ ...form, description: e.target.value })}
      />
    </>
  );
}
