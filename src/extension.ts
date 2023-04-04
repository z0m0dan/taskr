// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { schedule } from "node-cron";
import {
  dateToString,
  converTimeInputToRedableString,
  convertTimeIntervalToDate,
} from "./utils";
import path = require("path");

interface Task {
  name: string;
  dueTime: Date;
  status: "pending" | "done" | "overdue";
}

export function activate(context: vscode.ExtensionContext) {
  const globalState = context.globalState;

  // Schedule a cron job to check for tasks

  schedule("*/1 * * * *", () => {
    console.log("Checking for tasks...");

    const dateKey = dateToString(new Date());

    const value = globalState.get<Task[]>(dateKey);
    if (value !== undefined) {
      const overdueTasks = value.filter((task) => {
        if (task.status === "pending") {
          const now = new Date();
          if (now >= task.dueTime) {
            return true;
          }
        }
        return false;
      });

      if (overdueTasks.length > 0) {
        overdueTasks.forEach((task) => {
          vscode.window.showInformationMessage(
            `The task "${task.name}" is overdue`
          );
        });
      } else {
        console.log("No overdue tasks");
      }
    }
  });

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

  let soundDisposable = vscode.commands.registerCommand(
    "taskr.playAudioCue",
    () => {
      const audioFilePath = path.join(
        context.extensionPath,
        "audio",
        "audio.mp3"
      );
      const audioUri = vscode.Uri.file(audioFilePath);

      // Create a webview panel to play the audio file.
      const panel = vscode.window.createWebviewPanel(
        "myWebviewPanel",
        "Audio Player",
        vscode.ViewColumn.Active,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );
      panel.webview.html = `
      <audio controls autoplay>
        <source src="${audioUri}" type="audio/mpeg">
      </audio>
    `;
    }
  );

  context.subscriptions.push(
    createValueDisposable,
    getValueDisposable,
    soundDisposable
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
