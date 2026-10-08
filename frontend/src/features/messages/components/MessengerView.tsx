"use client";

import { useState } from "react";
import { Archive, ArrowLeft, DotsThreeVertical } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { JumpToLatest } from "@/components/ui/JumpToLatest";
import { Tabs } from "@/components/ui/Tabs";
import { useStickToBottom } from "@/lib/hooks/useStickToBottom";
import { ApiRequestError } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
import type { UserProfile } from "@/features/auth/types";
import {
  useConversations,
  useRecallMessage,
  useSetConversationArchived,
  useThreadWith,
} from "../hooks/useMessages";
import type { Conversation, Message } from "../types";
import { MessageBubble } from "./MessageBubble";
import { ColleagueSearch } from "./ColleagueSearch";
import { MessageComposer } from "./MessageComposer";

import { useI18n, type I18n } from "@/lib/i18n/useI18n";
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

function previewOf(c: Conversation, t: I18n["t"]): string {
  if (c.lastMessageRecalled) return t("messages.messageBubble.messageRecalled");
  if (c.lastMessageBody) return c.lastMessageBody;
  if (c.lastMessageAttachmentName) return t("messages.messengerView.fileLastmessageattachmentname", { lastMessageAttachmentName: c.lastMessageAttachmentName });
  return "";
}

/** Simple 1-1 chat - polling, no groups, no real-time transport. Supports image/file attachments, recall, and archiving a conversation. */
export function MessengerView({
  currentUser,
  initialWith = null,
  initialWithName = null,
}: MessengerViewProps) {
  const { t } = useI18n();
  const [listView, setListView] = useState<ListView>("active");
  const { data: activeConversations, isLoading: conversationsLoading } = useConversations(false);
  const { data: archivedConversations } = useConversations(true);
  const [activeUserId, setActiveUserId] = useState<number | null>(
    initialWith ? Number(initialWith) : null,
  );
  const { data: thread, isLoading: threadLoading } = useThreadWith(activeUserId);
  const recallMessage = useRecallMessage(activeUserId);
  const setArchived = useSetConversationArchived();
  const { showToast } = useToast();
  const [openMenuUserId, setOpenMenuUserId] = useState<number | null>(null);
  const [pickedName, setPickedName] = useState<string | null>(null);
  const [messageToRecall, setMessageToRecall] = useState<Message | null>(null);
  const lastMessage = (thread ?? []).at(-1);
  const { scrollRef, onScroll, canJumpToLatest, jumpToLatest } = useStickToBottom({
    latestKey: lastMessage ? String(lastMessage.id) : null,
    resetKey: activeUserId,
    ownLatest: lastMessage?.senderId === currentUser.userId,
  });

  const conversations = listView === "active" ? activeConversations : archivedConversations;
  const activeConversation = [
    ...(activeConversations ?? []),
    ...(archivedConversations ?? []),
  ].find((c) => c.otherUserId === activeUserId);
  const activeName =
    activeConversation?.otherUserName ??
    (activeUserId === Number(initialWith) ? initialWithName : null) ??
    pickedName ??
    (activeUserId ? t("messages.messengerView.userActiveuserid", { activeUserId }) : null);

  function handleArchive(userId: number, archived: boolean) {
    setOpenMenuUserId(null);
    setArchived.mutate(
      { userId, archived },
      {
        onSuccess: () => {
          showToast("success", archived ? t("messages.messengerView.movedToArchive") : t("messages.messengerView.movedOutOfArchive"));
          if (archived && userId === activeUserId) setActiveUserId(null);
        },
        onError: (err) =>
          showToast("error", err instanceof ApiRequestError ? err.message : t("common.couldnTDoThat")),
      },
    );
  }

  function confirmRecall() {
    if (!messageToRecall) return;
    recallMessage.mutate(messageToRecall.id, {
      onSuccess: () => {
        setMessageToRecall(null);
        showToast("success", t("messages.messengerView.messageRecalled"));
      },
      onError: (err) => {
        setMessageToRecall(null);
        showToast("error", err instanceof ApiRequestError ? err.message : t("common.couldnTRecallIt"));
      },
    });
  }

  return (
    <div className="flex h-[70vh] gap-4">
      <aside
        className={`${activeUserId != null ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col gap-2 overflow-y-auto md:w-64 rounded-lg glass-card p-3`}
      >
        <Tabs
          label={t("messages.messengerView.conversationList")}
          variant="segmented"
          value={listView}
          onChange={setListView}
          items={[
            { id: "active", label: t("common.messages") },
            {
              id: "archived",
              label: (
                <>
                  <Archive size={14} aria-hidden />
                  {t("messages.messengerView.archive")}
                  {(archivedConversations ?? []).length > 0 && (
                    <span className="text-fg-faint">{archivedConversations?.length}</span>
                  )}
                </>
              ),
            },
          ]}
        />

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
        ) : (conversations ?? []).length === 0 &&
          (listView === "archived" || activeUserId == null) ? (
          <EmptyState
            title={
              listView === "archived"
                ? t("messages.messengerView.noArchivedConversationsYet")
                : t("messages.messengerView.noConversationsYet")
            }
            description={
              listView === "archived" ? undefined : t("messages.messengerView.messageSomeoneFromTheDepartmentsPage")
            }
          />
        ) : (
          <ul className="flex flex-col gap-1">
            {listView === "active" && activeUserId != null && !activeConversation && (
              <li>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded bg-surface-muted px-2 py-2 text-left text-sm"
                >
                  <Avatar avatarUrl={null} fullName={activeName ?? "?"} size="sm" />
                  {activeName ?? t("messages.messengerView.userActiveuserid", { activeUserId })}
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
                    <span className="flex w-full items-center justify-between font-medium text-fg">
                      <span className="truncate">
                        {c.otherUserName ?? t("messages.messengerView.userOtheruserid", { otherUserId: c.otherUserId })}
                      </span>
                      {c.unreadCount > 0 && (
                        <span className="ml-2 rounded-full bg-danger px-1.5 py-0.5 text-[10px] text-danger-foreground">
                          {c.unreadCount}
                        </span>
                      )}
                    </span>
                    <span
                      className={`block w-full truncate text-xs text-fg-muted ${c.lastMessageRecalled ? "italic" : ""}`}
                    >
                      {previewOf(c, t)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setOpenMenuUserId(openMenuUserId === c.otherUserId ? null : c.otherUserId)
                  }
                  aria-label={t("messages.messengerView.conversationOptions")}
                  className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-fg-faint transition-colors duration-150 hover:bg-line hover:text-fg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <DotsThreeVertical size={16} weight="bold" aria-hidden />
                </button>
                {openMenuUserId === c.otherUserId && (
                  <>
                    <button
                      type="button"
                      aria-label={t("common.close")}
                      onClick={() => setOpenMenuUserId(null)}
                      className="fixed inset-0 z-20 cursor-default"
                    />
                    <div className="animate-fade-in absolute right-1 top-9 z-30 w-40 rounded glass py-1 text-sm">
                      <button
                        type="button"
                        onClick={() => handleArchive(c.otherUserId, listView === "active")}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-fg-soft hover:bg-surface-muted"
                      >
                        <Archive size={14} aria-hidden />
                        {listView === "active" ? t("messages.messengerView.archive") : t("messages.messengerView.unarchive")}
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div
        className={`${activeUserId == null ? "hidden md:flex" : "flex"} min-w-0 flex-1 flex-col rounded-lg glass-card p-4`}
      >
        {activeUserId == null ? (
          <div className="flex flex-1 items-center justify-center text-sm text-fg-faint">
            {t("messages.messengerView.chooseAConversationToStart")}
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center gap-2 border-b border-line/60 pb-2">
              <button
                type="button"
                onClick={() => setActiveUserId(null)}
                aria-label={t("messages.messengerView.backToTheConversationList")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-fg-soft hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary md:hidden"
              >
                <ArrowLeft size={18} aria-hidden />
              </button>
              <Avatar
                avatarUrl={activeConversation?.otherUserAvatarUrl ?? null}
                fullName={activeName ?? "?"}
                presenceStatus={activeConversation?.otherUserPresenceStatus ?? undefined}
                size="sm"
              />
              <p className="truncate text-sm font-semibold text-fg">{activeName}</p>
            </div>
            <div className="relative min-h-0 flex-1">
              <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto">
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
                          senderAvatarUrl={
                            isMine
                              ? currentUser.avatarUrl
                              : (activeConversation?.otherUserAvatarUrl ?? null)
                          }
                          onRecall={setMessageToRecall}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
              {canJumpToLatest && <JumpToLatest onClick={jumpToLatest} />}
            </div>
            <MessageComposer recipientUserId={activeUserId} />
          </>
        )}
      </div>

      {messageToRecall && (
        <Modal
          title={t("messages.messengerView.recallThisMessage")}
          onClose={() => setMessageToRecall(null)}
          widthClassName="max-w-sm"
        >
          <p className="text-sm text-fg-soft">
            {t("messages.messengerView.theTextAndAttachmentAreDeleted")}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setMessageToRecall(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={confirmRecall} loading={recallMessage.isPending}>
              {t("common.recall")}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
