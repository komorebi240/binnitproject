export type AssigneeType = "USER" | "DEPARTMENT";
export type TaskStatus = "ASSIGNED" | "ACCEPTED" | "DECLINED" | "DONE" | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export interface TaskAttachment {
  id: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  image: boolean;
  uploadedByUserId: number;
}

/** Mirrors the backend allowlist (AttachmentStorage) - the server re-validates the real bytes. */
export const TASK_ATTACHMENT_ACCEPT =
  "image/png,image/jpeg,image/gif,image/webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.csv";
export const MAX_TASK_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_TASK_ATTACHMENTS = 10;

export interface ChecklistItem {
  id: number;
  text: string;
  done: boolean;
}

export const MAX_CHECKLIST_ITEMS = 30;
export const MAX_CHECKLIST_TEXT = 200;

export interface Task {
  id: number;
  title: string;
  description: string | null;
  assigneeType: AssigneeType;
  assigneeUserId: number | null;
  assigneeUserName: string | null;
  assigneeDepartmentId: number | null;
  assigneeDepartmentName: string | null;
  assignedByUserId: number;
  assignedByUserName: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  decidedAt: string | null;
  completedAt: string | null;
  driveUrl: string | null;
  attachments: TaskAttachment[];
  checklist: ChecklistItem[];
  /** The cross-department project this task belongs to, if any. */
  projectId: number | null;
  /** UI hint from the server: may the caller add/remove files and change the Drive link. */
  canManage: boolean;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  assigneeType: AssigneeType;
  assigneeUserId?: number;
  assigneeDepartmentId?: number;
  priority?: TaskPriority;
  dueDate?: string;
  driveUrl?: string;
  checklist?: string[];
  /** Makes it a project task: the assignee must be a member of that project. */
  projectId?: number;
}
