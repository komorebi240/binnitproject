"use client";

import { useState } from "react";
import { Megaphone } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useBroadcastMessage } from "../hooks/useMessages";

import { useI18n } from "@/lib/i18n/useI18n";
/**
 * Shown only to a flagged system/broadcast account (UserProfile.systemAccount) - sends one
 * message to every active user in every company (backend MessageServiceImpl.broadcastMessage).
 * Deliberately separate from the normal 1-1 composer: this is a "send to everyone" action, not
 * a conversation, so it gets its own confirmation step rather than living inside a thread.
 */
export function BroadcastComposer() {
  const { t } = useI18n();
  const [body, setBody] = useState("");
  const [confirming, setConfirming] = useState(false);
  const broadcast = useBroadcastMessage();
  const { showToast } = useToast();

  async function handleSend() {
    if (!body.trim()) return;
    try {
      const count = await broadcast.mutateAsync(body.trim());
      showToast("success", t("messages.broadcastComposer.notificationSentToCountUsers", { count }));
      setBody("");
      setConfirming(false);
    } catch (err) {
      showToast("error", err instanceof ApiRequestError ? err.message : t("messages.broadcastComposer.couldnTSendTheNotification"));
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-lg border border-primary/30 bg-surface-muted p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-fg">
        <Megaphone size={18} className="text-primary-text" aria-hidden />
        {t("messages.broadcastComposer.sendANotificationToAllUsers")}
      </div>
      <Textarea
        label={t("messages.broadcastComposer.notificationText")}
        hideLabel
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("messages.broadcastComposer.notificationText2")}
        rows={2}
      />
      {confirming ? (
        <div className="flex items-center gap-2">
          <p className="text-xs text-fg-soft">{t("messages.broadcastComposer.sendToAllUsersAcrossThe")}</p>
          <Button onClick={handleSend} loading={broadcast.isPending}>
            {t("messages.broadcastComposer.confirmAndSend")}
          </Button>
          <Button variant="secondary" onClick={() => setConfirming(false)}>
            {t("common.cancel")}
          </Button>
        </div>
      ) : (
        <div>
          <Button variant="secondary" onClick={() => setConfirming(true)} disabled={!body.trim()}>
            {t("messages.broadcastComposer.sendNotification")}
          </Button>
        </div>
      )}
    </div>
  );
}
