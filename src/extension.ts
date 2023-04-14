// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { schedule } from "node-cron";
import {
  dateToString,
  converTimeInputToRedableString,
  convertTimeIntervalToDate,
  filterDuededTasks,
} from "./utils";
import { SidebarProvider } from "./Providers/SidebarProvider";
import { Task } from "./types";
import { v4 as createId } from "uuid";
import { CompletedSidebarProvider } from "./Providers/CompletedSidebarProvider";
import { ScheduledProvider } from "./Providers/ScheduledSidebarProvider";

const getOverdueTasks = async (context: vscode.ExtensionContext) => {
  //get yesterday's date
  const yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
  const dateKey = dateToString(yesterday);

  const value = context.globalState.get<Task[]>(dateKey);

  if (value !== undefined) {
    const overdueTasks = value.filter((task) => {
      if (task.status === "pending") return true;
      return false;
    });

    if (overdueTasks.length > 0) {
      //create message to show if the user wants to move the tasks to today
      const message = `You have ${overdueTasks.length} overdue tasks from yesterday, would you like to move them to today?`;
      const yes = "Yes";
      const no = "No";
      const confirmationMessage = await vscode.window.showInformationMessage(
        message,
        yes,
        no
      );

      //if the user selects yes, move the tasks to today
      if (confirmationMessage === "Yes") {
        const today = new Date();
        const todayKey = dateToString(today);
        const todayTasks =
          (context.globalState.get(todayKey) as Array<Task>) ?? [];
        overdueTasks.forEach((task) => {
          task.dueTime = new Date(task.dueTime.getTime() + 24 * 60 * 60 * 1000);

          todayTasks.push(task);
        });
        await context.globalState.update(todayKey, todayTasks);
        vscode.window.showInformationMessage(
          "Overdue tasks moved to today with the same due time"
        );
      }
    } else {
      vscode.window.showInformationMessage("No overdue tasks from yesterday");
    }
  }
};
const cronJobKey = "cronJobKey";

export function activate(context: vscode.ExtensionContext) {
  const globalState = context.globalState;

  //call the function to check for overdue tasks
  getOverdueTasks(context);

  //register the sidbar provider
  const sidebarProvider = new SidebarProvider(context.extensionUri, context);
  const completedProvider = new CompletedSidebarProvider(
    context.extensionUri
    // context
  );
  const scheduledProvider = new ScheduledProvider(
    context.extensionUri
    // context
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("taskr-sidebar", sidebarProvider),
    vscode.window.registerWebviewViewProvider(
      "taskr-sidebar-scheduled",
      scheduledProvider
    ),
    vscode.window.registerWebviewViewProvider(
      "taskr-sidebar-completed",
      completedProvider
    )
  );

  // Schedule a cron job to check for tasks

  if (
    globalState.get(cronJobKey) === undefined ||
    !globalState.get(cronJobKey)
  ) {
    //add a key to the global state to avoid re-scheduling the cron job

    globalState.update(cronJobKey, true);

    schedule("*/2 * * * *", () => {
      console.log("Checking for tasks...");

      const dateKey = dateToString(new Date());

      const value = globalState.get<Task[]>(dateKey);
      if (value !== undefined) {
        const overdueTasks = filterDuededTasks(value);

        if (overdueTasks.length > 0) {
          //update the tasks to overdue

          overdueTasks.forEach((task) => {
            task.status = "overdue";
          });

          globalState.update(dateKey, overdueTasks);

          overdueTasks.forEach((task) => {
            vscode.window.showInformationMessage(
              `The task "${task.name}" is overdue`
            );
          });
        } else {
          console.log("No overdue tasks");
        }
        sidebarProvider._view?.webview.postMessage({
          type: "onReload",
        });
      }
    });
  }

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
          dueTime,
          status: "pending",
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
          if (task.status === "pending") {
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
export function deactivate() {}
