export interface Task {
  id: string;
  name: string;
  dueTime: Date;
  status: "pending" | "done" | "overdue" | "scheduled";
  time?: string;
  nextTaskId?: string;
}
