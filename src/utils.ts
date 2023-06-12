import { Task } from "./types";
import * as vscode from "vscode";

export const convertTimeIntervalToDate = (timeInterval: string) => {
  if (timeInterval.includes("m")) {
    const minutes = parseInt(timeInterval.replace("m", ""));
    return new Date(new Date().getTime() + minutes * 60000);
  } else if (timeInterval.includes("h")) {
    const hours = parseInt(timeInterval.replace("h", ""));
    return new Date(new Date().getTime() + hours * 3600000);
  } else return undefined;
};

export const dateToString = (date: Date) => {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

export const converTimeInputToRedableString = (timeInterval: string) => {
  if (timeInterval.includes("m")) {
    const minutes = parseInt(timeInterval.replace("m", ""));
    return `${minutes} minutes`;
  } else if (timeInterval.includes("h")) {
    const hours = parseInt(timeInterval.replace("h", ""));
    return `${hours} hours`;
  } else return undefined;
};

export const dateDiff = (date1: Date, date2: Date) => {
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
      return formatter.format(diffInHours, "hour").replace(/^in /, "") + " ago";
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
        formatter.format(diffInSeconds, "second").replace(/^in /, "") + " left"
      );
    }
  }
};

export const getDependentTasks = (tasks: Array<Task>, task: Task) => {
  return tasks.filter((t) => t.dependsOn && t.dependsOn.id === task.id);
};

export const filterOverdueTasks = (tasks: Task[]) => {
  return tasks.filter(
    (task) => task.status === "ongoing" && new Date() >= new Date(task.dueTime)
  );
};

export const getOverdueTasksFromDayBefore = async (
  context: vscode.ExtensionContext
) => {
  //get yesterday's date
  const yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
  const dateKey = dateToString(yesterday);

  const value = context.globalState.get<Task[]>(dateKey);

  if (value !== undefined) {
    const overdueTasks = value.filter((task) => {
      if (task.status === "ongoing") return true;
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
      } else {
        context.globalState.update(dateKey, []);
      }
    } else {
      vscode.window.showInformationMessage("No overdue tasks from yesterday");
    }
  }
};
