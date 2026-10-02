export type NotificationType = "CALENDAR_EVENT_INVITE" | "MESSAGE_RECEIVED" | "FOLDER_ACCESS_REQUESTED";

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  body: string | null;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  read: boolean;
  createdAt: string;
}
