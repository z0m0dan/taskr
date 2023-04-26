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

const getDependentTasks = (tasks: Array<Task>, task: Task) => {
  return tasks.filter((t) => t.dependsOn && t.dependsOn.id === task.id);
};

export const updateOverdueTasks = (tasks: Array<Task>) => {
  const updatedTasks = tasks.map((task) => {
    if (task.status === "ongoing" && new Date() >= new Date(task.dueTime)) {
      task.status = "overdue";
    }
    return task;
  });

  const updatedDependantTasks = updatedTasks.map((task) => {
    if (task.status === "overdue") {
      const dependantTasks = getDependentTasks(updatedTasks, task);
      if (dependantTasks.length > 1) {
        const sorted = dependantTasks.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
        );
        sorted[0].status = "ongoing";
      } else if (dependantTasks.length === 1) {
        dependantTasks[0].status = "ongoing";
      }
    }
    return task;
  });

  return updatedDependantTasks;
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
