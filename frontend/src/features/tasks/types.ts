export type AssigneeType = "USER" | "DEPARTMENT";
export type TaskStatus = "ASSIGNED" | "ACCEPTED" | "DECLINED" | "DONE" | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

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
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  assigneeType: AssigneeType;
  assigneeUserId?: number;
  assigneeDepartmentId?: number;
  priority?: TaskPriority;
  dueDate?: string;
}
