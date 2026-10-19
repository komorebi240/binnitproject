"use client";

import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Highlight } from "@/components/ui/Highlight";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { matchesAllWords } from "@/lib/textMatch";
import type { PresenceStatus, UserProfile } from "@/features/auth/types";
import { useColleagues } from "../hooks/useColleagues";
import { useConversations, useForwardMessage } from "../hooks/useMessages";
import { MAX_FORWARD_RECIPIENTS, type Message } from "../types";

import { useI18n } from "@/lib/i18n/useI18n";
interface Candidate {
  userId: number;
  fullName: string;
  avatarUrl: string | null;
  presenceStatus: PresenceStatus | null;
}

interface ForwardDialogProps {
  message: Message;
  currentUser: UserProfile;
  onClose: () => void;
}

/**
 * Picks up to 10 people to receive a copy of a message: the people the user already chats with (most recent first),
 * then their colleagues. Each receives the copy in their own 1-1 conversation with the user; the server checks every
 * recipient (same company) again.
 */
export function ForwardDialog({ message, currentUser, onClose }: ForwardDialogProps) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const forward = useForwardMessage();
  const { data: active } = useConversations(false);
  const { data: archived } = useConversations(true);
  const { colleagues } = useColleagues(currentUser);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number[]>([]);

  const candidates: Candidate[] = [];
  const seen = new Set<number>([currentUser.userId]);
  for (const c of [...(active ?? []), ...(archived ?? [])]) {
    if (seen.has(c.otherUserId)) continue;
    seen.add(c.otherUserId);
    candidates.push({
      userId: c.otherUserId,
      fullName: c.otherUserName ?? t("messages.messengerView.userOtheruserid", { otherUserId: c.otherUserId }),
      avatarUrl: c.otherUserAvatarUrl,
      presenceStatus: c.otherUserPresenceStatus,
    });
  }
  for (const person of colleagues) {
    if (seen.has(person.userId)) continue;
    seen.add(person.userId);
    candidates.push({ userId: person.userId, fullName: person.fullName, avatarUrl: person.avatarUrl, presenceStatus: person.presenceStatus });
  }
  const shown = candidates.filter((c) => matchesAllWords(c.fullName, query));
  const full = selected.length >= MAX_FORWARD_RECIPIENTS;
  const preview = message.body
    || (message.attachment ? t("messages.messengerView.fileLastmessageattachmentname", { lastMessageAttachmentName: message.attachment.fileName }) : "");

  function toggle(userId: number) {
    setSelected((current) => (current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]));
  }

  function send() {
    forward.mutate(
      { messageId: message.id, recipientUserIds: selected },
      {
        onSuccess: (count) => {
          showToast("success", t("messages.forwardDialog.sentToCount", { count }));
          onClose();
        },
        onError: (err) => showToast("error", err instanceof ApiRequestError ? err.message : t("common.couldnTDoThat")),
      },
    );
  }

  return (
    <Modal title={t("messages.forwardDialog.forwardMessage")} onClose={onClose} widthClassName="max-w-md">
      <p className="line-clamp-3 whitespace-pre-wrap break-words rounded border border-line/60 bg-surface-muted px-3 py-2 text-sm text-fg-soft">
        {preview}
      </p>

      <label className="relative block">
        <span className="sr-only">{t("messages.forwardDialog.findPeople")}</span>
        <MagnifyingGlass size={14} aria-hidden className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-fg-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("messages.forwardDialog.findPeople")}
          autoFocus
          className="w-full rounded border border-line bg-surface py-2 pl-7 pr-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />
      </label>

      <ul className="flex max-h-72 flex-col gap-0.5 overflow-y-auto" aria-label={t("messages.forwardDialog.recipients")}>
        {shown.length === 0 ? (
          <li className="px-2 py-3 text-center text-sm text-fg-faint">{t("messages.colleagueSearch.noOneMatches")}</li>
        ) : (
          shown.map((c) => {
            const checked = selected.includes(c.userId);
            return (
              <li key={c.userId}>
                <label
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-muted ${!checked && full ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && full}
                    onChange={() => toggle(c.userId)}
                    className="h-4 w-4 accent-primary"
                  />
                  <Avatar avatarUrl={c.avatarUrl} fullName={c.fullName} presenceStatus={c.presenceStatus ?? undefined} size="sm" />
                  <span className="min-w-0 truncate text-fg">
                    <Highlight text={c.fullName} query={query} />
                  </span>
                </label>
              </li>
            );
          })
        )}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-fg-muted" aria-live="polite">
          {full
            ? t("messages.forwardDialog.atMostMaxPeople", { max: MAX_FORWARD_RECIPIENTS })
            : t("messages.forwardDialog.selectedCountOfMax", { selected: selected.length, max: MAX_FORWARD_RECIPIENTS })}
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={send} disabled={selected.length === 0} loading={forward.isPending}>
            {t("messages.messageBubble.forward")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
