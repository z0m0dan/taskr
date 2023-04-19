import * as vscode from "vscode";
import { getNonce } from "./getNounce";
import { Task } from "../types";
import { convertTimeIntervalToDate, dateToString } from "../utils";
import { v4 as createId } from "uuid";

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  _doc?: vscode.TextDocument;
  _context?: vscode.ExtensionContext;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly context: vscode.ExtensionContext,
    private readonly updateScheduledTasks: () => void
  ) {}

  private validateTaskInput(value: { title: string; dueTime: string }) {
    if (!value || !value.title || !value.dueTime) {
      return {
        ok: false,
        message: "Some of the fields are empty",
      };
    }

    if (value.title.length <= 0 || value.dueTime.length <= 0) {
      return {
        ok: false,
        message: "Some of the fields are empty",
      };
    }

    if (!value.title.match(/^[0-9]+[h|m]$/)) {
      if (
        value.title.includes("h") &&
        parseInt(value.title.split("h")[0]) > 24 &&
        parseInt(value.title.split("h")[0]) < 0
      ) {
        return {
          ok: false,
          message: "Invalid hour value",
        };
      }
      if (
        value.title.includes("m") &&
        parseInt(value.title.split("m")[0]) > 60 &&
        parseInt(value.title.split("m")[0]) < 0
      ) {
        //validate that the minutes are int leaps of 10 minutes
        if (parseInt(value.title.split("m")[0]) % 2 !== 0) {
          return {
            ok: false,
            message: "Invalid minute value, minutes should be in leaps of 2",
          };
        }
        return {
          ok: false,
          message: "Invalid minute value",
        };
      }
    }

    return {
      ok: true,
    };
  }

  dateDiff(date1: Date, date2: Date) {
    const diffInMs = date1.getTime() - date2.getTime();
    const diffInSeconds = Math.abs(diffInMs) / 1000;
    const diffInMinutes = Math.ceil(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const remainingMinutes = diffInMinutes % 60;
    const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    if (diffInMs < 0) {
      if (diffInHours > 0 && remainingMinutes > 0) {
        return (
          formatter.format(diffInHours, "hour") +
          " " +
          formatter.format(remainingMinutes, "minute") +
          " ago"
        );
      } else if (diffInHours > 0) {
        return (
          formatter.format(diffInHours, "hour").replace(/^in /, "") + " ago"
        );
      } else if (remainingMinutes > 0) {
        return (
          formatter.format(remainingMinutes, "minute").replace(/^in /, "") +
          " ago"
        );
      } else if (diffInSeconds < 60) {
        return "few seconds ago";
      } else {
        return (
          formatter.format(diffInSeconds, "second").replace(/^in /, "") + " ago"
        );
      }
    } else {
      if (diffInHours > 0 && remainingMinutes > 0) {
        return (
          formatter.format(diffInHours, "hour") +
          " " +
          formatter
            .format(Math.ceil(remainingMinutes), "minute")
            .replace(/^in /, "") +
          " left"
        );
      } else if (diffInHours > 0) {
        return (
          formatter.format(diffInHours, "hour").replace(/^in /, "") + " left"
        );
      } else if (remainingMinutes > 0) {
        return (
          formatter.format(remainingMinutes, "minute").replace(/^in /, "") +
          " left"
        );
      } else {
        return (
          formatter.format(diffInSeconds, "second").replace(/^in /, "") +
          " left"
        );
      }
    }
  }

  getTaskList(): Task[] | undefined {
    const dateKey = dateToString(new Date());

    const taskList = this.context.globalState.get<Task[]>(dateKey);
    if (!taskList) {
      return undefined;
    }



    //parse time from taskList
    const taskListWithTime: Task[] = taskList.map((task) => {
      if(task.status === "done" || task.status === "overdue" || task.status === 'scheduled') return task;
      const time = this.dateDiff(new Date(task.dueTime), new Date());
      return { ...task, time };
    });

    return taskListWithTime;
  }

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.command) {
        case "add-task": {
          const value = data.value;
          const res = this.validateTaskInput(value);

          if (!res.ok) {
            vscode.window.showErrorMessage(res.message!);
          } else {
            const dateKey = dateToString(new Date());

            const dueTime = convertTimeIntervalToDate(value.dueTime);
            if (!dueTime) {
              vscode.window.showErrorMessage("Invalid time interval");
              return;
            }

            const taskList = this.getTaskList();
            if (!taskList) {
              this.context.globalState.update(dateKey, [
                {
                  id: createId(),
                  name: value.title,
                  dueTime: dueTime,
                  status: "ongoing",
                },
              ]);
            } else {
              taskList.push({
                id: createId(),
                name: value.title,
                dueTime: dueTime,
                status: "ongoing",
              });
              this.context.globalState.update(dateKey, taskList);
            }
            vscode.window.showInformationMessage("Task added successfully");

            this.updateScheduledTasks();
            webviewView.webview.postMessage({
              command: "update-tasks-list",
              value: this.getTaskList(),
            });
          }
          break;
        }
        case "onDelete": {
          const value = data.value;
          const dateKey = dateToString(new Date());
          const taskList = this.getTaskList();
          if (!taskList) {
            vscode.window.showErrorMessage("No task found");
            return;
          }
          const newTaskList = taskList.filter((task) => {
            return task.id !== value;
          });

          this.context.globalState.update(dateKey, newTaskList);
          vscode.window.showInformationMessage("Task deleted successfully");
          webviewView.webview.postMessage({
            command: "update-tasks-list",
            value: this.getTaskList(),
          });
          break;
        }

        case "complete-task": {
          console.log("complete-task");

          const value = data.value;
          const dateKey = dateToString(new Date());
          const taskList = this.getTaskList();
          if (!taskList) {
            vscode.window.showErrorMessage("No task found");
            return;
          }
          const newTaskList = taskList.map((task) => {
            if (task.id === value) {
              return {
                ...task,
                status: "done",
                dueTime: new Date(),
              };
            }
            return task;
          });

          this.context.globalState.update(dateKey, newTaskList);
          vscode.window.showInformationMessage("Task completed successfully");
          webviewView.webview.postMessage({
            command: "update-tasks-list",
            value: this.getTaskList(),
          });

          break;
        }
        case "onLoad": {
          const taskList = this.getTaskList();
          if (!taskList) {
            webviewView.webview.postMessage({
              command: "update-tasks-list",
              value: [],
            });
          }
          webviewView.webview.postMessage({
            command: "update-tasks-list",
            value: taskList,
          });
          break;
        }
        case "clear-tasks": {
          //Confirmation dialog to clear tasks
          const confirmation = await vscode.window.showInformationMessage(
            "Are you sure you want to clear all tasks?",
            "Yes",
            "No"
          );
          if (confirmation !== "Yes") {
            return;
          }

          const dateKey = dateToString(new Date());
          this.context.globalState.update(dateKey, undefined);
          vscode.window.showInformationMessage("Tasks cleared successfully");
          webviewView.webview.postMessage({
            command: "update-tasks-list",
            value: this.getTaskList(),
          });
          this.updateScheduledTasks();
          break;
        }
        case "schedule-task": {
          const value: {
            title: string;
            dueTime: string;
            dependsOn: string;
          } = data.value;
          const taskList = this.getTaskList();
          if (!taskList) {
            vscode.window.showErrorMessage("No task found");
            return;
          }

          const dateKey = dateToString(new Date());

          const dueTime = value.dueTime;

          const task = taskList.find((task) => task.id === value.dependsOn);

          this.context.globalState.update(dateKey, [
            ...taskList,
            {
              id: createId(),
              name: value.title, 
              dueTime: dueTime,
              status: "scheduled",
              dependsOn: {
                id: task?.id,
                name: task?.name,
              },
            },
          ]);
          vscode.window.showInformationMessage("Task scheduled successfully");

          this.updateScheduledTasks();
          break;
        }
        case "onError": {
          if (!data.value) {
            return;
          }
          vscode.window.showErrorMessage(data.value);
          break;
        }
      }
    });
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "compiled", "MainPage.js")
    );

    const mainCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.css")
    );

    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
        -->
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${mainCssUri}" rel="stylesheet">

			</head>
      <body>


      <script nonce="${nonce}">
      const tsvscode = acquireVsCodeApi();
      </script>
      <script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}
