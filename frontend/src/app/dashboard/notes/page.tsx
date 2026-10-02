"use client";

import { NotesPanel } from "@/features/notes/components/NotesPanel";

export default function NotesPage() {
  return (
    <>
      <h1 className="mb-4 text-lg font-semibold text-gray-900">Note của tôi</h1>
      <NotesPanel />
    </>
  );
}
