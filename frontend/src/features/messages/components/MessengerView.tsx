"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
import type { UserProfile } from "@/features/auth/types";
import { useConversations, useSendMessage, useThreadWith } from "../hooks/useMessages";

interface MessengerViewProps {
  currentUser: UserProfile;
}

/** Simple 1-1 chat (Phase 7 plan) — polling, no groups, no real-time transport. */
export function MessengerView({ currentUser }: MessengerViewProps) {
  const searchParams = useSearchParams();
  const initialWith = searchParams.get("with");
  // Passed by the department directory's "Nhắn tin riêng" link so the real name shows up
  // immediately, before any conversation/message exists to source it from the backend.
  const initialWithName = searchParams.get("name");

  const { data: conversations, isLoading: conversationsLoading } = useConversations();
  const [activeUserId, setActiveUserId] = useState<number | null>(initialWith ? Number(initialWith) : null);
  const { data: thread, isLoading: threadLoading } = useThreadWith(activeUserId);
  const sendMessage = useSendMessage(activeUserId);
  const { showToast } = useToast();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [thread]);

  const activeConversation = conversations?.find((c) => c.otherUserId === activeUserId);
  const activeName =
    activeConversation?.otherUserName ??
    (activeUserId === Number(initialWith) ? initialWithName : null) ??
    (activeUserId ? `Người dùng #${activeUserId}` : null);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim() || activeUserId == null) return;
    try {
      await sendMessage.mutateAsync(draft.trim());
      setDraft("");
    } catch (err) {
      showToast("error", err instanceof ApiRequestError ? err.message : "Không gửi được tin nhắn");
    }
  }

  return (
    <div className="flex h-[70vh] gap-4">
      <aside className="w-64 shrink-0 overflow-y-auto border-r border-gray-200 pr-3">
        {conversationsLoading ? (
          <Skeleton rows={3} />
        ) : (conversations ?? []).length === 0 && activeUserId == null ? (
          <EmptyState title="Chưa có hội thoại nào" description="Nhắn tin cho ai đó từ trang Phòng ban." />
        ) : (
          <ul className="flex flex-col gap-1">
            {activeUserId != null && !conversations?.some((c) => c.otherUserId === activeUserId) && (
              <li>
                <button type="button" className="w-full rounded bg-surface-muted px-2 py-2 text-left text-sm">
                  {activeName ?? `Người dùng #${activeUserId}`}
                </button>
              </li>
            )}
            {(conversations ?? []).map((c) => (
              <li key={c.otherUserId}>
                <button
                  type="button"
                  onClick={() => setActiveUserId(c.otherUserId)}
                  className={`flex w-full flex-col items-start rounded px-2 py-2 text-left text-sm transition-colors duration-150 hover:bg-surface-muted ${activeUserId === c.otherUserId ? "bg-surface-muted" : ""}`}
                >
                  <span className="flex w-full items-center justify-between font-medium text-gray-900">
                    {c.otherUserName ?? `Người dùng #${c.otherUserId}`}
                    {c.unreadCount > 0 && (
                      <span className="ml-2 rounded-full bg-danger px-1.5 py-0.5 text-[10px] text-danger-foreground">
                        {c.unreadCount}
                      </span>
                    )}
                  </span>
                  <span className="truncate text-xs text-gray-500">{c.lastMessageBody}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div className="flex flex-1 flex-col">
        {activeUserId == null ? (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
            Chọn một hội thoại để bắt đầu
          </div>
        ) : (
          <>
            <p className="mb-2 border-b border-gray-100 pb-2 text-sm font-semibold text-gray-900">{activeName}</p>
            <div className="flex-1 overflow-y-auto">
              {threadLoading ? (
                <Skeleton rows={3} />
              ) : (
                <div className="flex flex-col gap-2">
                  {(thread ?? []).map((m) => {
                    const isMine = m.senderId === currentUser.userId;
                    return (
                      <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-xs rounded px-3 py-1.5 text-sm ${isMine ? "bg-primary text-primary-foreground" : "bg-surface-muted text-gray-900"}`}
                        >
                          {m.body}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>
            <form onSubmit={handleSend} className="mt-2 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Nhập tin nhắn..."
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm transition-colors duration-150 hover:border-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              />
              <Button type="submit" loading={sendMessage.isPending}>
                Gửi
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
