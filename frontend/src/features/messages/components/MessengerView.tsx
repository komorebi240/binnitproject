"use client";

import { useEffect, useRef, useState } from "react";
import { Archive, ArrowLeft, DotsThreeVertical } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
import type { UserProfile } from "@/features/auth/types";
import { useConversations, useRecallMessage, useSetConversationArchived, useThreadWith } from "../hooks/useMessages";
import type { Conversation, Message } from "../types";
import { MessageBubble } from "./MessageBubble";
import { ColleagueSearch } from "./ColleagueSearch";
import { MessageComposer } from "./MessageComposer";

interface MessengerViewProps {
  currentUser: UserProfile;
  /** Pre-selects a conversation (was `?with=` - tabs aren't URL-driven, so TabContentRenderer
   * parses it from the tab's virtual path and passes it in). */
  initialWith?: string | null;
  /** Real name for a conversation that has no messages yet (was `?name=`), so it doesn't
   * fall back to "Người dùng #id" before the backend has anything to source a name from. */
  initialWithName?: string | null;
}

type ListView = "active" | "archived";

function previewOf(c: Conversation): string {
  if (c.lastMessageRecalled) return "Tin nhắn đã thu hồi";
  if (c.lastMessageBody) return c.lastMessageBody;
  if (c.lastMessageAttachmentName) return `Tệp: ${c.lastMessageAttachmentName}`;
  return "";
}

/** Simple 1-1 chat - polling, no groups, no real-time transport. Supports image/file attachments, recall, and archiving a conversation. */
export function MessengerView({ currentUser, initialWith = null, initialWithName = null }: MessengerViewProps) {
  const [listView, setListView] = useState<ListView>("active");
  const { data: activeConversations, isLoading: conversationsLoading } = useConversations(false);
  const { data: archivedConversations } = useConversations(true);
  const [activeUserId, setActiveUserId] = useState<number | null>(initialWith ? Number(initialWith) : null);
  const { data: thread, isLoading: threadLoading } = useThreadWith(activeUserId);
  const recallMessage = useRecallMessage(activeUserId);
  const setArchived = useSetConversationArchived();
  const { showToast } = useToast();
  const [openMenuUserId, setOpenMenuUserId] = useState<number | null>(null);
  const [pickedName, setPickedName] = useState<string | null>(null);
  const [messageToRecall, setMessageToRecall] = useState<Message | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [thread]);

  const conversations = listView === "active" ? activeConversations : archivedConversations;
  const activeConversation = [...(activeConversations ?? []), ...(archivedConversations ?? [])].find(
    (c) => c.otherUserId === activeUserId,
  );
  const activeName =
    activeConversation?.otherUserName ??
    (activeUserId === Number(initialWith) ? initialWithName : null) ??
    pickedName ??
    (activeUserId ? `Người dùng #${activeUserId}` : null);

  function handleArchive(userId: number, archived: boolean) {
    setOpenMenuUserId(null);
    setArchived.mutate(
      { userId, archived },
      {
        onSuccess: () => {
          showToast("success", archived ? "Đã chuyển vào Lưu trữ" : "Đã đưa ra khỏi Lưu trữ");
          if (archived && userId === activeUserId) setActiveUserId(null);
        },
        onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : "Không thực hiện được"),
      },
    );
  }

  function confirmRecall() {
    if (!messageToRecall) return;
    recallMessage.mutate(messageToRecall.id, {
      onSuccess: () => {
        setMessageToRecall(null);
        showToast("success", "Đã thu hồi tin nhắn");
      },
      onError: (err) => {
        setMessageToRecall(null);
        showToast("error", err instanceof ApiRequestError ? err.message : "Không thu hồi được");
      },
    });
  }

  const tabClassName = (view: ListView) =>
    `flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${listView === view ? "bg-surface-muted text-gray-900" : "text-gray-500 hover:bg-surface-muted"}`;

  return (
    <div className="flex h-[70vh] gap-4">
      <aside className={`${activeUserId != null ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col gap-2 overflow-y-auto md:w-64 rounded-lg border border-gray-200 bg-surface p-3 shadow-sm`}>
        <div role="tablist" aria-label="Danh sách hội thoại" className="flex gap-1">
          <button type="button" role="tab" aria-selected={listView === "active"} onClick={() => setListView("active")} className={tabClassName("active")}>
            Tin nhắn
          </button>
          <button type="button" role="tab" aria-selected={listView === "archived"} onClick={() => setListView("archived")} className={tabClassName("archived")}>
            <Archive size={14} aria-hidden />
            Lưu trữ
            {(archivedConversations ?? []).length > 0 && <span className="text-gray-400">{archivedConversations?.length}</span>}
          </button>
        </div>

        <ColleagueSearch
          currentUser={currentUser}
          onPick={(userId, fullName) => {
            setPickedName(fullName);
            setListView("active");
            setActiveUserId(userId);
          }}
        />

        {conversationsLoading ? (
          <Skeleton rows={3} />
        ) : (conversations ?? []).length === 0 && (listView === "archived" || activeUserId == null) ? (
          <EmptyState
            title={listView === "archived" ? "Chưa có hội thoại nào được lưu trữ" : "Chưa có hội thoại nào"}
            description={listView === "archived" ? undefined : "Nhắn tin cho ai đó từ trang Phòng ban."}
          />
        ) : (
          <ul className="flex flex-col gap-1">
            {listView === "active" && activeUserId != null && !activeConversation && (
              <li>
                <button type="button" className="flex w-full items-center gap-2 rounded bg-surface-muted px-2 py-2 text-left text-sm">
                  <Avatar avatarUrl={null} fullName={activeName ?? "?"} size="sm" />
                  {activeName ?? `Người dùng #${activeUserId}`}
                </button>
              </li>
            )}
            {(conversations ?? []).map((c) => (
              <li key={c.otherUserId} className="relative">
                <button
                  type="button"
                  onClick={() => setActiveUserId(c.otherUserId)}
                  className={`flex w-full items-center gap-2 rounded py-2 pl-2 pr-8 text-left text-sm transition-colors duration-150 hover:bg-surface-muted ${activeUserId === c.otherUserId ? "bg-surface-muted" : ""}`}
                >
                  <Avatar
                    avatarUrl={c.otherUserAvatarUrl}
                    fullName={c.otherUserName ?? "?"}
                    presenceStatus={c.otherUserPresenceStatus ?? undefined}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex w-full items-center justify-between font-medium text-gray-900">
                      <span className="truncate">{c.otherUserName ?? `Người dùng #${c.otherUserId}`}</span>
                      {c.unreadCount > 0 && (
                        <span className="ml-2 rounded-full bg-danger px-1.5 py-0.5 text-[10px] text-danger-foreground">
                          {c.unreadCount}
                        </span>
                      )}
                    </span>
                    <span className={`block w-full truncate text-xs text-gray-500 ${c.lastMessageRecalled ? "italic" : ""}`}>
                      {previewOf(c)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setOpenMenuUserId(openMenuUserId === c.otherUserId ? null : c.otherUserId)}
                  aria-label="Tuỳ chọn hội thoại"
                  className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-gray-400 transition-colors duration-150 hover:bg-gray-200 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <DotsThreeVertical size={16} weight="bold" aria-hidden />
                </button>
                {openMenuUserId === c.otherUserId && (
                  <>
                    <button type="button" aria-label="Đóng" onClick={() => setOpenMenuUserId(null)} className="fixed inset-0 z-20 cursor-default" />
                    <div className="animate-fade-in absolute right-1 top-9 z-30 w-40 rounded border border-gray-200 bg-white py-1 text-sm shadow-lg">
                      <button
                        type="button"
                        onClick={() => handleArchive(c.otherUserId, listView === "active")}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-700 hover:bg-surface-muted"
                      >
                        <Archive size={14} aria-hidden />
                        {listView === "active" ? "Lưu trữ" : "Bỏ lưu trữ"}
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div className={`${activeUserId == null ? "hidden md:flex" : "flex"} min-w-0 flex-1 flex-col rounded-lg border border-gray-200 bg-surface p-4 shadow-sm`}>
        {activeUserId == null ? (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
            Chọn một hội thoại để bắt đầu
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center gap-2 border-b border-gray-100 pb-2">
              <button
                type="button"
                onClick={() => setActiveUserId(null)}
                aria-label="Quay lại danh sách hội thoại"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-gray-600 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary md:hidden"
              >
                <ArrowLeft size={18} aria-hidden />
              </button>
              <Avatar
                avatarUrl={activeConversation?.otherUserAvatarUrl ?? null}
                fullName={activeName ?? "?"}
                presenceStatus={activeConversation?.otherUserPresenceStatus ?? undefined}
                size="sm"
              />
              <p className="truncate text-sm font-semibold text-gray-900">{activeName}</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {threadLoading ? (
                <Skeleton rows={3} />
              ) : (
                <div className="flex flex-col gap-3">
                  {(thread ?? []).map((m) => {
                    const isMine = m.senderId === currentUser.userId;
                    return (
                      <MessageBubble
                        key={m.id}
                        message={m}
                        isMine={isMine}
                        senderName={isMine ? currentUser.fullName : (activeName ?? "?")}
                        senderAvatarUrl={isMine ? currentUser.avatarUrl : (activeConversation?.otherUserAvatarUrl ?? null)}
                        onRecall={setMessageToRecall}
                      />
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>
            <MessageComposer recipientUserId={activeUserId} />
          </>
        )}
      </div>

      {messageToRecall && (
        <Modal title="Thu hồi tin nhắn?" onClose={() => setMessageToRecall(null)} widthClassName="max-w-sm">
          <p className="text-sm text-gray-600">
            Nội dung và tệp đính kèm sẽ bị xoá cho cả hai bên, chỉ còn dòng &quot;Tin nhắn đã thu hồi&quot;. Không thể hoàn tác.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setMessageToRecall(null)}>
              Huỷ
            </Button>
            <Button variant="danger" onClick={confirmRecall} loading={recallMessage.isPending}>
              Thu hồi
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
