(() => {
  const vscode = acquireVsCodeApi();

  const btn = document.getElementById("add-task");
  const input = document.getElementById("task-input");
  const time = document.getElementById("task-time");
  const clearTaskBtn = document.getElementById("clear-tasks");

  const renderTasks = (taskList) => {
    const taskListContainer = document.getElementById("task-list");

    //clear the task list
    taskListContainer.innerHTML = "";

    taskList.forEach((task) => {
      const taskItem = document.createElement("li");
      taskItem.className = "task";
      taskItem.id = task.id;
      taskItem.innerHTML = `
          <span class="task-title">
              ${task.name}
          </span>
          <span class="task-time">
              ${task.time}
          </span>
          ${
            task.status === "completed"
              ? `<span class="task-status">Completed</span>`
              : task.status === "overdue"
              ? `<span class="task-status overdue">Overdue</span>`
              : `  <div class="button-section">
              <button class="btn btn-complete" data-uuid="${task.id}">Complete</button>
              <button class="btn btn-delete" data-uuid="${task.id}">Delete</button>
          </div>`
          }
        
      `;

      taskListContainer.appendChild(taskItem);
    });

    //add the event listener to the complete button
    const completeBtn = document.querySelector(".btn-complete");
    completeBtn.addEventListener("click", () => {
      completeTask(completeBtn.dataset.uuid);
    });

    //add the event listener to the delete button
    const deleteBtn = document.querySelector(".btn-delete");

    deleteBtn.addEventListener("click", () => {
      deleteTask(deleteBtn.dataset.uuid);
    });
  };

  const renderNoTask = (message) => {
    const taskList = document.getElementById("task-list");

    //clear the task list
    taskList.innerHTML = "";

    const taskItem = document.createElement("li");
    taskItem.className = "task";
    taskItem.id = "no-task";
    taskItem.innerHTML = `
        <span class="task-title">
            ${message}
        </span>
    `;

    taskList.appendChild(taskItem);
    noTask = true;
  };

  //get onload listener
  window.addEventListener("load", () => {
    //create the listener to listen to the message from the extension

    vscode.postMessage({
      command: "onLoad",
    });

    window.addEventListener("message", (event) => {
      const message = event.data; // The JSON data our extension sent

      switch (message.command) {
        case "update-task-list": {
          renderTasks(message.value);
          break;
        }
        case "no-task-found": {
          renderNoTask(message.value);
          break;
        }
      }
    });
  });

  clearTaskBtn.addEventListener("click", () => {
    vscode.postMessage({
      command: "clear-tasks",
    });
  });

  btn.addEventListener("click", () => {
    vscode.postMessage({
      command: "add-task",
      value: {
        title: input.value,
        dueTime: time.value,
      },
    });
  });

  const deleteTask = (taskId) => {
    vscode.postMessage({
      command: "onDelete",
      value: taskId,
    });
  };

  const completeTask = (taskId) => {
    vscode.postMessage({
      command: "onComplete",
      value: taskId,
    });
  };
})();
