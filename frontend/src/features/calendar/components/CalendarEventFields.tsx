"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TYPE_KEYS, type EventFormValues } from "../eventRange";
import type { CalendarEventType } from "../types";

import { useI18n } from "@/lib/i18n/useI18n";
interface CalendarEventFieldsProps {
  form: EventFormValues;
  onChange: (form: EventFormValues) => void;
}

/** The fields shared by "add my event" and "add an event for a staff member"; a business trip asks for a from/to date range. */
export function CalendarEventFields({ form, onChange }: CalendarEventFieldsProps) {
  const { t } = useI18n();
  const isTrip = form.eventType === "BUSINESS_TRIP";
  return (
    <>
      <Input label={t("common.title")} value={form.title} onChange={(e) => onChange({ ...form, title: e.target.value })} required />
      <Select
        label={t("calendar.calendarEventFields.type")}
        value={form.eventType}
        onChange={(e) => onChange({ ...form, eventType: e.target.value as CalendarEventType })}
        options={Object.entries(TYPE_KEYS).map(([value, key]) => ({ value, label: t(key) }))}
      />
      {isTrip ? (
        <>
          <Input
            label={t("calendar.calendarEventFields.businessTripFrom")}
            type="date"
            value={form.startDate}
            onChange={(e) => onChange({ ...form, startDate: e.target.value })}
            required
          />
          <Input
            label={t("calendar.calendarEventFields.to")}
            type="date"
            value={form.endDate}
            min={form.startDate || undefined}
            onChange={(e) => onChange({ ...form, endDate: e.target.value })}
            required
          />
        </>
      ) : (
        <Input
          label={t("calendar.calendarEventFields.startTime")}
          type="datetime-local"
          value={form.startAt}
          onChange={(e) => onChange({ ...form, startAt: e.target.value })}
          required
        />
      )}
      <Input
        label={t("common.descriptionOptional")}
        value={form.description}
        onChange={(e) => onChange({ ...form, description: e.target.value })}
      />
    </>
  );
}
