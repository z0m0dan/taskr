import { Task } from "./types";

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

export const filterDuededTasks = (tasks: Array<Task>) => {
  return tasks.filter(
    (task) => task.status === "pending" && new Date() >= new Date(task.dueTime)
  );
};
