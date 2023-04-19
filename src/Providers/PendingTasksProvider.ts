import * as vscode from "vscode";
import { getNonce } from "./getNounce";
import { dateToString } from "../utils";
import { Task } from "../types";

export class ScheduledProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  _doc?: vscode.TextDocument;
  _context?: vscode.ExtensionContext;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly context: vscode.ExtensionContext // private readonly context: vscode.ExtensionContext
  ) {}

  getTaskList(): Task[] | undefined {
    const dateKey = dateToString(new Date());

    const taskList = this.context.globalState.get<Task[]>(dateKey);
    if (!taskList) {
      return undefined;
    }

    //filter pending tasks
    const pendingTaskList = taskList.filter(
      (task) => task.status === "scheduled"
    );

    return pendingTaskList;
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
        case "onLoad": {
          const tasks = this.getTaskList();
          if (tasks) {
            const scheduledTasks = this.getTaskList();
            webviewView.webview.postMessage({
              command: "update-tasks-list",
              value: scheduledTasks,
            });
          }
        }
        case "remove-task": {          
          const dateKey = dateToString(new Date());
          const tasks = this.context.globalState.get<Task[]>(dateKey);
          if (!tasks) {
            return;
          }
          const updatedTasks = tasks.filter((task) => task.id !== data.value);
          this.context.globalState.update(dateKey, updatedTasks);
          webviewView.webview.postMessage({
            command: "update-tasks-list",
            value: updatedTasks,
          });
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
      vscode.Uri.joinPath(
        this._extensionUri,
        "out",
        "compiled",
        "PendingTasks.js"
      )
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
      </div>
      <script nonce="${nonce}">const tsvscode = acquireVsCodeApi();</script>
      <script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}
