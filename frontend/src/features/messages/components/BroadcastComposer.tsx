"use client";

import { useState } from "react";
import { Megaphone } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import { useBroadcastMessage } from "../hooks/useMessages";

/**
 * Shown only to a flagged system/broadcast account (UserProfile.systemAccount) - sends one
 * message to every active user in every company (backend MessageServiceImpl.broadcastMessage).
 * Deliberately separate from the normal 1-1 composer: this is a "send to everyone" action, not
 * a conversation, so it gets its own confirmation step rather than living inside a thread.
 */
export function BroadcastComposer() {
  const [body, setBody] = useState("");
  const [confirming, setConfirming] = useState(false);
  const broadcast = useBroadcastMessage();
  const { showToast } = useToast();

  async function handleSend() {
    if (!body.trim()) return;
    try {
      const count = await broadcast.mutateAsync(body.trim());
      showToast("success", `Đã gửi thông báo tới ${count} người dùng`);
      setBody("");
      setConfirming(false);
    } catch (err) {
      showToast("error", err instanceof ApiRequestError ? err.message : "Không gửi được thông báo");
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-lg border border-primary/30 bg-surface-muted p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Megaphone size={18} className="text-primary" aria-hidden />
        Gửi thông báo tới tất cả người dùng
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Nội dung thông báo..."
        rows={2}
        className="rounded border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      />
      {confirming ? (
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-600">Gửi tới TẤT CẢ người dùng trong toàn hệ thống?</p>
          <Button onClick={handleSend} loading={broadcast.isPending}>
            Xác nhận gửi
          </Button>
          <Button variant="secondary" onClick={() => setConfirming(false)}>
            Huỷ
          </Button>
        </div>
      ) : (
        <div>
          <Button variant="secondary" onClick={() => setConfirming(true)} disabled={!body.trim()}>
            Gửi thông báo
          </Button>
        </div>
      )}
    </div>
  );
}
