// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { v4 as createId } from "uuid";
import * as vscode from "vscode";
import { ScheduledProvider } from "./Providers/PendingTasksProvider";
import { SidebarProvider } from "./Providers/SidebarProvider";
import { Task } from "./types";
import {
  converTimeInputToRedableString,
  convertTimeIntervalToDate,
  dateToString,
  getOverdueTasksFromDayBefore,
} from "./utils";

export function activate(context: vscode.ExtensionContext) {
  const globalState = context.globalState;

  //call the function to check for overdue tasks
  getOverdueTasksFromDayBefore(context);

  //register the sidbar provider

  const scheduledProvider = new ScheduledProvider(
    context.extensionUri,
    context
  );

  // function to update the scheduled tasks
  const updateScheduledTasks = async () => {
    const dateKey = dateToString(new Date());
    const tasks = globalState.get<Task[]>(dateKey);
    if (!tasks) return;
    const scheduledTasks = tasks.filter((task) => task.status === "scheduled");
    scheduledProvider._view?.webview.postMessage({
      command: "update-tasks-list",
      value: scheduledTasks,
    });
  };

  const sidebarProvider = new SidebarProvider(
    context.extensionUri,
    context,
    updateScheduledTasks
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("taskr-sidebar", sidebarProvider),
    vscode.window.registerWebviewViewProvider(
      "taskr-sidebar-scheduled",
      scheduledProvider
    )
  );

  // Register the 'createValue' command.
  let createValueDisposable = vscode.commands.registerCommand(
    "taskr.createValue",
    async () => {
      // Prompt the user to enter a value.
      const value = await vscode.window.showInputBox({
        prompt: "Select the name of the task",
      });
      const dueStringTime = await vscode.window.showInputBox({
        prompt: "Select the due time of the task eg. 1h, 5m",
        validateInput: (text) => {
          if (!text.match(/^[0-9]+[h|m]$/)) {
            if (
              text.includes("h") &&
              parseInt(text.split("h")[0]) > 24 &&
              parseInt(text.split("h")[0]) < 0
            ) {
              return "Invalid hour value";
            }
            if (
              text.includes("m") &&
              parseInt(text.split("m")[0]) > 60 &&
              parseInt(text.split("m")[0]) < 0
            ) {
              //validate that the minutes are int leaps of 10 minutes
              if (parseInt(text.split("m")[0]) % 10 !== 0) {
                return "Invalid minute value, minutes should be in leaps of 10";
              }
              return "Invalid minute value";
            }

            return "Please enter a valid time";
          }
          return "";
        },
      });
      if (value !== undefined && dueStringTime !== undefined) {
        // Save the value in the global state.

        const dueTime = convertTimeIntervalToDate(dueStringTime);

        if (dueTime === undefined) {
          vscode.window.showErrorMessage("Invalid time interval");
          return;
        }

        const task: Task = {
          id: createId(),
          name: value,
          timeInterval: dueStringTime,
          dueTime,
          isNotificationSet: false,
          status: "ongoing",
          createdAt: new Date(),
        };

        const dateKey = dateToString(dueTime);

        const tasks = (globalState.get(dateKey) as Array<Task>) ?? [];
        tasks.push(task);
        await globalState.update(dateKey, tasks);

        vscode.window.showInformationMessage(
          `Task "${
            task.name
          }" was created will remind you on ${converTimeInputToRedableString(
            dueStringTime
          )}'`
        );
      }
    }
  );

  let clearTasksDisposable = vscode.commands.registerCommand(
    "taskr.clearTasks",
    async () => {
      //confirmation box to clear tasks
      const message = `Are you sure you want to clear all tasks?`;
      const yes = "Yes";
      const no = "No";
      const confirmationMessage = await vscode.window.showInformationMessage(
        message,
        yes,
        no
      );

      if (confirmationMessage !== yes) {
        return;
      }

      const dateKey = dateToString(new Date());

      const value = globalState.get<Task[]>(dateKey);

      if (value !== undefined) {
        globalState.update(dateKey, undefined);
        vscode.window.showInformationMessage("Tasks cleared");
        sidebarProvider._view?.webview.postMessage({
          type: "onLoad",
        });
      } else {
        vscode.window.showWarningMessage("No tasks to clear");
      }
    }
  );

  // Register the 'getValue' command.
  let getValueDisposable = vscode.commands.registerCommand(
    "taskr.getValue",
    async () => {
      // Retrieve the value from the global state.

      const dateKey = dateToString(new Date());

      const value = globalState.get<Task[]>(dateKey);
      if (value !== undefined) {
        value.forEach((task) => {
          if (task.status === "ongoing") {
            vscode.window.showInformationMessage(
              `You have a task "${task.name}" due on ${task.dueTime}`
            );
          }
        });
      } else {
        vscode.window.showWarningMessage("No value found in the global state.");
      }
    }
  );

  context.subscriptions.push(
    createValueDisposable,
    getValueDisposable,
    clearTasksDisposable
  );
}

// This method is called when your extension is deactivated
export function deactivate(context: vscode.ExtensionContext) {}
