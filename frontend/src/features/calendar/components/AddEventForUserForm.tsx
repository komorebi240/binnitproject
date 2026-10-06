"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useCreateEventForUser } from "../hooks/useCalendar";
import { EMPTY_EVENT_FORM, toEventInput } from "../eventRange";
import { CalendarEventFields } from "./CalendarEventFields";

interface AddEventForUserFormProps {
  userId: number;
  onDone: () => void;
}

/**
 * Used from UserManager ("Thêm lịch") - the manager never gets to SEE the target's calendar
 * (it's private, see CalendarServiceImpl), only to propose a PENDING event they must accept.
 */
export function AddEventForUserForm({ userId, onDone }: AddEventForUserFormProps) {
  const createEvent = useCreateEventForUser();
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY_EVENT_FORM);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await createEvent.mutateAsync({
        userId,
        input: toEventInput(form),
      });
      showToast("success", "Đã gửi lịch, chờ người đó xác nhận");
      onDone();
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không thêm được lịch");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-3 rounded border border-line bg-surface-muted p-4 sm:grid-cols-2"
    >
      <CalendarEventFields form={form} onChange={setForm} />
      {errorMessage && (
        <p role="alert" className="text-sm text-danger sm:col-span-2">
          {errorMessage}
        </p>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={createEvent.isPending}>
          Gửi lịch
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Huỷ
        </Button>
      </div>
    </form>
  );
}
