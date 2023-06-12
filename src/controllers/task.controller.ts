import { validateTaskInput } from "../Providers/helpers/validations";
import { TaskCRUD } from "../services/task.service";
import { Task, TaskStatus } from "../types";
import { v4 as createId } from "uuid";

import * as vscode from "vscode";
import { convertTimeIntervalToDate } from "../utils";

interface IAddTask {
  title: string;
  dueTime: string;
}
interface IScheduleTask {
  title: string;
  dueTime: string;
  dependsOn: string;
}

export class TaskController {
  taskCRUD: TaskCRUD;
  //@ts-ignore
  constructor(private readonly context: vscode.ExtensionContext) {
    this.taskCRUD = new TaskCRUD(context);
  }

  removeAllTasks(): boolean {
    return this.taskCRUD.removeAllTasks();
  }

  updateOverdueTasks() {
    console.log("Checking for tasks...");
    
    return this.taskCRUD.updateOverdueTasks();
  }

  getTaskList(status?: TaskStatus[]): Task[] | undefined {
    return this.taskCRUD.getTaskList(status);
  }

  addTask(task: IAddTask): boolean {
    const res = validateTaskInput(task);

    if (!res.ok) {
      vscode.window.showErrorMessage(res.message!);
      return false;
    }

    const dueTime = convertTimeIntervalToDate(task.dueTime);
    if (!dueTime) {
      vscode.window.showErrorMessage("Invalid time interval");
      return false;
    }

    const newTask: Task = {
      id: createId(),
      name: task.title,
      dueTime: dueTime,
      status: "ongoing",
      displayTime: task.dueTime,
      isNotificationSet: false,
      createdAt: new Date(),
      timeInterval: task.dueTime,
    };

    if (!this.taskCRUD.addTask(newTask)) {
      vscode.window.showErrorMessage("Failed to add task");
      return false;
    }

    vscode.window.showInformationMessage("Task added successfully");

    return true;
  }

  scheduleTask(task: IScheduleTask): boolean {
    const res = validateTaskInput(task);

    if (!res.ok) {
      vscode.window.showErrorMessage(res.message!);
      return false;
    }

    const dueTime = convertTimeIntervalToDate(task.dueTime);
    if (!dueTime) {
      vscode.window.showErrorMessage("Invalid time interval");
      return false;
    }

    const taskList = this.getTaskList();
    if (!taskList) {
      vscode.window.showErrorMessage(
        "Cannot schedule task without any task added to the list"
      );
      return false;
    }

    const taskToDependOn = taskList.find(
      (task) => task.id === task.dependsOn?.id
    );

    if (!taskToDependOn) {
      vscode.window.showErrorMessage("No task found");
      return false;
    }

    const newTask: Task = {
      id: createId(),
      name: task.title,
      timeInterval: task.dueTime,
      status: "scheduled",
      createdAt: new Date(),
      isNotificationSet: false,
      dueTime: dueTime,
      dependsOn: {
        id: taskToDependOn.id,
        name: taskToDependOn.name,
      },
    };

    if (!this.taskCRUD.addTask(newTask)) {
      vscode.window.showErrorMessage("Failed to schedule task");
      return false;
    }

    vscode.window.showInformationMessage("Task scheduled successfully");

    return true;
  }

  removeTask(taskId: string): boolean {
    if (!this.taskCRUD.removeTask(taskId)) {
      vscode.window.showErrorMessage("Failed to remove task");
      return false;
    }

    vscode.window.showInformationMessage("Task removed successfully");

    return true;
  }

  updateTask(taskId: string, statusToSet: TaskStatus): boolean {
    if (!this.taskCRUD.updateTask(taskId, statusToSet)) {
      vscode.window.showErrorMessage("Failed to update task");
      return false;
    }

    vscode.window.showInformationMessage("Task updated successfully");

    return true;
  }

  async clearTasks(): Promise<boolean> {
    const confirmation = await vscode.window.showInformationMessage(
      "Are you sure you want to clear all tasks?",
      "Yes",
      "No"
    );
    if (confirmation !== "Yes") {
      return false;
    }

    if (!this.taskCRUD.removeAllTasks()) {
      vscode.window.showErrorMessage("Failed to clear tasks");
      return false;
    }

    vscode.window.showInformationMessage("Tasks cleared successfully");

    return true;
  }
}
