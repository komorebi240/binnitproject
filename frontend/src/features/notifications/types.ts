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
  | "PROJECT_MEMBER_ADDED";

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
