export type NotificationType =
  | "CALENDAR_EVENT_INVITE"
  | "MESSAGE_RECEIVED"
  | "FOLDER_ACCESS_REQUESTED"
  | "TASK_ASSIGNED"
  | "TASK_ACCEPTED"
  | "TASK_DECLINED"
  | "TASK_COMPLETED"
  | "PROJECT_INVITED"
  | "PROJECT_RESPONDED"
  | "PROJECT_MEMBER_ADDED"
  | "WHITEBOARD_SHARED";

/** The values a notification text was built from (who, which task...); null for notifications older than the field. */
export type NotificationParams = Record<string, string>;

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  body: string | null;
  params: NotificationParams | null;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  read: boolean;
  createdAt: string;
}
