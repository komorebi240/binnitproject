"use client";

import { CalendarView } from "@/features/calendar/components/CalendarView";

export default function CalendarPage() {
  return (
    <>
      <h1 className="mb-4 text-lg font-semibold text-gray-900">Lịch của tôi</h1>
      <CalendarView />
    </>
  );
}
