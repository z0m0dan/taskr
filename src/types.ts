export type TaskStatus = "scheduled" | "done" | "overdue" | "ongoing";

export interface Task {
  id: string;
  name: string;
  dueTime: Date;
  status: TaskStatus;
  createdAt: Date;
  timeInterval: string;
  displayTime?: string;
  isNotificationSet: boolean;
  dependsOn?: {
    name: string;
    id: string;
  };
}
