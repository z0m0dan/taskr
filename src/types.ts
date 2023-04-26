export interface Task {
  id: string;
  name: string;
  dueTime: Date;
  status: "scheduled" | "done" | "overdue" | "ongoing";
  createdAt: Date;
  time?: string;
  dependsOn?: {
    name: string;
    id: string;
  };
}
