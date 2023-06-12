import { schedule } from "node-cron";
import * as vscode from "vscode";
import { TaskController } from "../controllers/task.controller";
import { getNonce } from "./getNounce";

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  _doc?: vscode.TextDocument;
  _context?: vscode.ExtensionContext;
  private tasksController?: TaskController;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    //@ts-ignore
    private readonly context: vscode.ExtensionContext,
    private readonly updateScheduledTasks: () => void
  ) {
    schedule("*/2 * * * *", () => {
      this.tasksController?.updateOverdueTasks();
      updateScheduledTasks();
    });
    this.tasksController = new TaskController(context);
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
        case "add-task":
          {
            if (this.tasksController?.addTask(data.value)) {
              this._view?.webview.postMessage({
                command: "update-tasks-list",
                value: this.tasksController?.getTaskList([
                  "ongoing",
                  "overdue",
                  "done",
                ]),
              });
            }
          }
          break;

        case "onDelete": {
          if (this.tasksController?.removeTask(data.value)) {
            this._view?.webview.postMessage({
              command: "update-tasks-list",
              value: this.tasksController?.getTaskList([
                "ongoing",
                "overdue",
                "done",
              ]),
            });
          }
          break;
        }

        case "complete-task": {
          if (this.tasksController?.updateTask(data.value, "done")) {
            this._view?.webview.postMessage({
              command: "update-tasks-list",
              value: this.tasksController?.getTaskList([
                "ongoing",
                "overdue",
                "done",
              ]),
            });
          }

          break;
        }
        case "onLoad": {
          webviewView.webview.postMessage({
            command: "update-tasks-list",
            value: this.tasksController?.getTaskList([
              "ongoing",
              "overdue",
              "done",
            ]),
          });
          break;
        }
        case "clear-tasks": {
          if (this.tasksController?.removeAllTasks()) {
            webviewView.webview.postMessage({
              command: "update-tasks-list",
              value: this.tasksController?.getTaskList([
                "ongoing",
                "overdue",
                "done",
              ]),
            });
          }
          break;
        }
        case "schedule-task": {
          const value: {
            title: string;
            dueTime: string;
            dependsOn: string;
          } = data.value;

          if (this.tasksController?.scheduleTask(value)) {
            this.updateScheduledTasks();
          }
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
