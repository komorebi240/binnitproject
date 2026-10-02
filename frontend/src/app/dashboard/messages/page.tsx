"use client";

import { Suspense } from "react";
import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import { MessengerView } from "@/features/messages/components/MessengerView";

export default function MessagesPage() {
  const { data: currentUser } = useCurrentUser();
  if (!currentUser) return null;

  return (
    <>
      <h1 className="mb-4 text-lg font-semibold text-gray-900">Tin nhắn</h1>
      <Suspense fallback={null}>
        <MessengerView currentUser={currentUser} />
      </Suspense>
    </>
  );
}
