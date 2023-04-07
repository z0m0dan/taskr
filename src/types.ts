export interface Task {
  id: string;
  name: string;
  dueTime: Date;
  status: "pending" | "done" | "overdue";
  time?: string;
}
