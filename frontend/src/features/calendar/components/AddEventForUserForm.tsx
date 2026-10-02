"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useCreateEventForUser } from "../hooks/useCalendar";
import type { CalendarEventType } from "../types";

const TYPE_LABELS: Record<CalendarEventType, string> = {
  MEETING: "Họp",
  DEADLINE: "Hạn chót",
  BUSINESS_TRIP: "Công tác",
  OTHER: "Khác",
};

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
  const [form, setForm] = useState({ title: "", eventType: "MEETING" as CalendarEventType, startAt: "", description: "" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await createEvent.mutateAsync({
        userId,
        input: {
          title: form.title,
          eventType: form.eventType,
          startAt: new Date(form.startAt).toISOString(),
          description: form.description || undefined,
        },
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
      className="grid grid-cols-1 gap-3 rounded border border-gray-200 bg-surface-muted p-4 sm:grid-cols-2"
    >
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
          Gửi lịch
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Huỷ
        </Button>
      </div>
    </form>
  );
}
