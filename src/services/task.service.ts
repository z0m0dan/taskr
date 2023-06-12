import * as vscode from "vscode";
import { convertTimeIntervalToDate, dateDiff, dateToString } from "../utils";
import { Task, TaskStatus } from "../types";

// create a singleton class to manage the tasks

export class TaskCRUD {
  constructor(private readonly context: vscode.ExtensionContext) {}

  getTaskList(statusFilter?: TaskStatus[]): Task[] | undefined {
    const dateKey = dateToString(new Date());

    const taskList = this.context.globalState.get<Task[]>(dateKey);
    if (!taskList) {
      return undefined;
    }

    if (statusFilter) {
      return taskList.filter((task) => statusFilter.includes(task.status));
    }

    return taskList;
  }

  getTasksByStatus(status: TaskStatus): Task[] | undefined {
    const taskList = this.getTaskList();
    if (!taskList) {
      return undefined;
    }

    //filter pending tasks
    const filteredTaskList = taskList.filter((task) => task.status === status);

    return filteredTaskList;
  }

  addTask(task: Task): boolean {
    try {
      const dateKey = dateToString(new Date());
      const tasks = this.getTaskList();
      if (!tasks) {
        this.context.globalState.update(dateKey, [task]);
        return true;
      }

      tasks.push(task);
      this.context.globalState.update(dateKey, tasks);
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  updateTask(taskId: string, status: TaskStatus): boolean {
    const dateKey = dateToString(new Date());
    const tasks = this.getTaskList();
    if (!tasks) {
      return false;
    }

    const taskToUpdate = tasks.find((t) => t.id === taskId);

    if (!taskToUpdate) {
      return false;
    }

    taskToUpdate.status = status;
    this.context.globalState.update(dateKey, tasks);

    return true;
  }

  removeTask(taskId: string): boolean {
    const dateKey = dateToString(new Date());
    const tasks = this.getTaskList();
    if (!tasks) {
      return false;
    }

    const updatedTasks = tasks.filter((task) => task.id !== taskId);
    this.context.globalState.update(dateKey, updatedTasks);

    return true;
  }

  removeAllTasks(): boolean {
    const dateKey = dateToString(new Date());
    this.context.globalState.update(dateKey, []);
    return true;
  }

  scheduleTask(task: Task): boolean {
    const dateKey = dateToString(new Date());
    const tasks = this.getTaskList();
    if (!tasks) {
      return false;
    }

    const taskToUpdate = tasks.find((t) => t.id === task.id);

    if (!taskToUpdate) {
      return false;
    }

    taskToUpdate.isNotificationSet = true;
    this.context.globalState.update(dateKey, tasks);

    return true;
  }

  updateDependentTasks(taskId: string, status: TaskStatus): boolean {
    const dateKey = dateToString(new Date());
    const tasks = this.getTaskList();
    if (!tasks) {
      return false;
    }

    const dependentTasks = tasks.filter(
      (task) => task.dependsOn?.id === taskId
    );

    if (!dependentTasks) {
      return false;
    }

    dependentTasks.forEach((task) => {
      task.status = status;
      if (!task.dueTime)
        task.dueTime =
          convertTimeIntervalToDate(task.timeInterval) ?? new Date();
    });

    this.context.globalState.update(dateKey, tasks);

    return true;
  }

  updateTasksList(tasks: Task[]): boolean {
    const dateKey = dateToString(new Date());
    this.context.globalState.update(dateKey, tasks);

    return true;
  }

  updateOverdueTasks(): void {
    const dateKey = dateToString(new Date());
    const tasks = this.getTaskList();

    if (!tasks) {
      return;
    }
    const updatedTasks = tasks.map((task) => {
      if (task.status === "ongoing" && new Date() >= new Date(task.dueTime)) {
        task.status = "overdue";
        this.updateDependentTasks(task.id, "ongoing");
      }
      task.displayTime = dateDiff(new Date(), new Date(task.dueTime));
      return task;
    });

    this.context.globalState.update(dateKey, updatedTasks);
  }
}
