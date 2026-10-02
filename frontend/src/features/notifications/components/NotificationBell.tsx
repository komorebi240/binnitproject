"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "@phosphor-icons/react";
import { useApproveAccessRequest, useRejectAccessRequest } from "@/features/drive/hooks/useDrive";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications, useUnreadCount } from "../hooks/useNotifications";
import type { Notification } from "../types";

/** Where each notification type should take you when clicked — see NotificationServiceImpl/ CalendarServiceImpl/MessageServiceImpl for what relatedEntityId means per type. */
function resolveTarget(notification: Notification): string | null {
  switch (notification.type) {
    case "MESSAGE_RECEIVED":
      // relatedEntityId is the sender's userId (see MessageServiceImpl.sendMessage).
      return notification.relatedEntityId != null ? `/dashboard/messages?with=${notification.relatedEntityId}` : "/dashboard/messages";
    case "CALENDAR_EVENT_INVITE":
      return "/dashboard/calendar";
    case "FOLDER_ACCESS_REQUESTED":
      return "/dashboard/drive";
    default:
      return null;
  }
}

/**
 * Icon-only button (header cluster — see dashboard/layout.tsx) that opens a small dropdown of
 * recent notifications. No Dropdown primitive exists yet (components/ui/README.md), so this
 * builds its own absolute-positioned panel rather than adding one for a single use case
 * (CLAUDE.md section 29).
 *
 * `FOLDER_ACCESS_REQUESTED` gets inline Duyệt/Từ chối buttons so an approver doesn't have to
 * leave this dropdown to decide — `relatedEntityId` is the request's own id (see
 * FolderAccessRequestServiceImpl.notifyApprovers), which `useApproveAccessRequest`/
 * `useRejectAccessRequest` already take directly, no extra fetch needed.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data: unreadCount } = useUnreadCount();
  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const approveFolderRequest = useApproveAccessRequest();
  const rejectFolderRequest = useRejectAccessRequest();

  const count = unreadCount ?? 0;

  function navigateTo(notification: Notification) {
    if (!notification.read) {
      markRead.mutate(notification.id);
    }
    const target = resolveTarget(notification);
    if (target) {
      setOpen(false);
      router.push(target);
    }
  }

  function handleDecide(notification: Notification, decide: (id: number) => void) {
    if (notification.relatedEntityId == null) return;
    decide(notification.relatedEntityId);
    if (!notification.read) {
      markRead.mutate(notification.id);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        title="Thông báo"
        onClick={() => setOpen((v) => !v)}
        aria-label="Thông báo"
        className="relative flex h-9 w-9 items-center justify-center rounded transition-colors duration-150 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Bell size={20} aria-hidden />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-danger-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20 cursor-default"
          />
          <div className="animate-fade-in absolute right-0 top-11 z-30 w-80 rounded border border-gray-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
              <p className="text-sm font-semibold text-gray-900">Thông báo</p>
              {count > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead.mutate()}
                  className="text-xs text-primary hover:underline"
                >
                  Đánh dấu đã đọc hết
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {(notifications ?? []).length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-gray-400">Chưa có thông báo nào</p>
              ) : (
                (notifications ?? []).map((n) => (
                  <div
                    key={n.id}
                    className={`border-b border-gray-50 px-3 py-2 text-sm ${n.read ? "text-gray-500" : "font-medium text-gray-900"}`}
                  >
                    <button
                      type="button"
                      onClick={() => navigateTo(n)}
                      className="block w-full text-left transition-colors duration-150 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <p>{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs font-normal text-gray-500">{n.body}</p>}
                    </button>
                    {n.type === "FOLDER_ACCESS_REQUESTED" && n.relatedEntityId != null && (
                      <div className="mt-1.5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecide(n, approveFolderRequest.mutate)}
                          disabled={approveFolderRequest.isPending}
                          className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
                        >
                          Duyệt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecide(n, rejectFolderRequest.mutate)}
                          disabled={rejectFolderRequest.isPending}
                          className="rounded bg-danger px-2 py-1 text-xs font-medium text-danger-foreground hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
                        >
                          Từ chối
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
