"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { JumpToLatest } from "@/components/ui/JumpToLatest";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useStickToBottom } from "@/lib/hooks/useStickToBottom";
import type { UserProfile } from "@/features/auth/types";
import { useProjectMessages, useSendProjectMessage } from "../hooks/useProjects";
import { MAX_PROJECT_MESSAGE_LENGTH, type ProjectDetail } from "../types";

/** One shared chat channel for everyone in the project (refreshes every few seconds; no attachments or recall). */
export function ProjectChatTab({
  project,
  currentUser,
}: {
  project: ProjectDetail;
  currentUser: UserProfile;
}) {
  const { data: messages, isLoading } = useProjectMessages(project.id, true);
  const send = useSendProjectMessage(project.id);
  const { showToast } = useToast();
  const [body, setBody] = useState("");
  const lastMessage = (messages ?? []).at(-1);
  const { scrollRef, onScroll, canJumpToLatest, jumpToLatest } = useStickToBottom({
    latestKey: lastMessage ? String(lastMessage.id) : null,
    resetKey: project.id,
    ownLatest: lastMessage?.senderId === currentUser.userId,
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text) return;
    send.mutate(text, {
      onSuccess: () => setBody(""),
      onError: (err) =>
        showToast(
          "error",
          err instanceof ApiRequestError ? err.message : "Không gửi được tin nhắn",
        ),
    });
  }

  return (
    <section className="flex h-[60vh] flex-col rounded-lg glass-card p-4">
      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto">
          {isLoading ? (
            <Skeleton rows={3} />
          ) : (messages ?? []).length === 0 ? (
            <p className="py-10 text-center text-sm text-fg-faint">
              Chưa có tin nhắn nào. Hãy là người mở đầu cuộc trao đổi.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {(messages ?? []).map((message) => {
                const mine = message.senderId === currentUser.userId;
                return (
                  <li
                    key={message.id}
                    className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}
                  >
                    <Avatar
                      avatarUrl={message.senderAvatarUrl}
                      fullName={message.senderName ?? "?"}
                      size="sm"
                    />
                    <div
                      className={`flex max-w-md flex-col gap-0.5 ${mine ? "items-end" : "items-start"}`}
                    >
                      {!mine && (
                        <span className="text-xs font-medium text-fg-soft">
                          {message.senderName}
                        </span>
                      )}
                      <span
                        className={`whitespace-pre-wrap break-words rounded-lg px-3 py-1.5 text-sm ${
                          mine ? "bg-primary text-primary-foreground" : "bg-surface-muted text-fg"
                        }`}
                      >
                        {message.body}
                      </span>
                      <span className="text-[10px] text-fg-faint">
                        {new Date(message.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {canJumpToLatest && <JumpToLatest onClick={jumpToLatest} />}
      </div>
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2 border-t border-line/60 pt-3">
        <label className="flex-1">
          <span className="sr-only">Tin nhắn cho dự án</span>
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={MAX_PROJECT_MESSAGE_LENGTH}
            placeholder="Nhắn cho cả dự án..."
            className="w-full rounded border border-line-strong px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          />
        </label>
        <Button type="submit" loading={send.isPending} disabled={!body.trim()}>
          Gửi
        </Button>
      </form>
    </section>
  );
}
