"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useI18n";
import { EMPTY_EVENT_FORM, toEventInput, type EventFormValues } from "../eventRange";
import { useCreateOwnEvent } from "../hooks/useCalendar";
import { CalendarEventFields } from "./CalendarEventFields";

/** "Add an event" to the user's own calendar; `initial` pre-fills it (Smart select suggests a date and time it found). */
export function CreateOwnEventDialog({ initial, onClose }: { initial?: Partial<EventFormValues>; onClose: () => void }) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const createEvent = useCreateOwnEvent();
  const [form, setForm] = useState<EventFormValues>({ ...EMPTY_EVENT_FORM, ...initial });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await createEvent.mutateAsync(toEventInput(form));
      showToast("success", t("calendar.calendarView.eventAdded"));
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : t("calendar.calendarView.couldnTAddTheEvent"));
    }
  }

  return (
    <Modal title={t("calendar.calendarView.addANewEvent")} onClose={onClose}>
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
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
