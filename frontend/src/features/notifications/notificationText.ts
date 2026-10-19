import type { TranslationKey } from "@/lib/i18n/dictionary";
import type { I18n } from "@/lib/i18n/useI18n";
import type { Notification, NotificationParams, NotificationType } from "./types";

interface Template {
  title: TranslationKey;
  /** Omitted (or undefined for these params) when the stored body is already the text to show, e.g. the sender's own words. */
  body?: TranslationKey | ((params: NotificationParams) => TranslationKey | undefined);
  /** The values the texts use; a notification missing one of them shows its stored text instead. */
  needs: string[];
}

/**
 * How each notification type is worded. The backend stores the same sentences in Vietnamese (title/body) next to the
 * `params` they were built from, so a reader in another language gets the text rebuilt here from `type` + `params`.
 */
const TEMPLATES: Record<NotificationType, Template> = {
  CALENDAR_EVENT_INVITE: { title: "notifications.text.calendarInvite.title", body: "notifications.text.calendarInvite.body", needs: ["actor", "title"] },
  FOLDER_ACCESS_REQUESTED: { title: "notifications.text.folderRequest.title", body: "notifications.text.folderRequest.body", needs: ["actor", "folder"] },
  MESSAGE_RECEIVED: {
    title: "notifications.text.message.title",
    // An attachment-only message has no words of the sender to preview; the server marks it instead of wording it.
    body: (params) => (params.attachmentOnly === "true" ? "notifications.text.message.attachment" : undefined),
    needs: ["actor"],
  },
  PROJECT_INVITED: { title: "notifications.text.projectInvited.title", body: "notifications.text.projectInvited.body", needs: ["actor", "project"] },
  PROJECT_RESPONDED: {
    title: "notifications.text.projectResponded.title",
    body: (params) => (params.accepted === "true" ? "notifications.text.projectResponded.accepted" : "notifications.text.projectResponded.declined"),
    needs: ["department", "project", "accepted"],
  },
  PROJECT_MEMBER_ADDED: { title: "notifications.text.projectMemberAdded.title", body: "notifications.text.projectMemberAdded.body", needs: ["actor", "project"] },
  TASK_ASSIGNED: { title: "notifications.text.taskAssigned.title", body: "notifications.text.taskAssigned.body", needs: ["actor", "title"] },
  TASK_ACCEPTED: { title: "notifications.text.taskUpdate.title", body: "notifications.text.taskAccepted.body", needs: ["actor", "title"] },
  TASK_DECLINED: { title: "notifications.text.taskUpdate.title", body: "notifications.text.taskDeclined.body", needs: ["actor", "title"] },
  TASK_COMPLETED: { title: "notifications.text.taskUpdate.title", body: "notifications.text.taskCompleted.body", needs: ["actor", "title"] },
  WHITEBOARD_SHARED: {
    title: "notifications.text.whiteboardShared.title",
    body: (params) => (params.role === "EDITOR" ? "notifications.text.whiteboardShared.editor" : "notifications.text.whiteboardShared.viewer"),
    needs: ["actor", "board", "role"],
  },
};

/** The title and body to show for a notification, in the language of `t`; the stored text when it cannot be rebuilt. */
export function notificationText(notification: Notification, t: I18n["t"]): { title: string; body: string | null } {
  const template = TEMPLATES[notification.type];
  const params = notification.params;
  if (!template || !params || template.needs.some((name) => !(name in params))) {
    return { title: notification.title, body: notification.body };
  }
  const bodyKey = typeof template.body === "function" ? template.body(params) : template.body;
  return { title: t(template.title, params), body: bodyKey ? t(bodyKey, params) : notification.body };
}
