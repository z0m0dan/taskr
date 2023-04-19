<script lang="ts">
  import { onMount } from "svelte";
  import { type Task } from "./../../src/types";
  interface IerrorsMessages {
    taskName: string | undefined;
    taskTime: string | undefined;
  }

  let taskName: string;
  let taskTime: string;

  let selectedTaskToDepend: string;

  let dropdownTasks: Task[] = [];

  let isScheduled: boolean;

  let errors: IerrorsMessages = {
    taskName: undefined,
    taskTime: undefined,
  };

  let tasks: Task[] = [];

  onMount(() => {
    tsvscode.postMessage({
      command: "onLoad",
    });
    window.addEventListener("message", (event) => {
      const { command, value } = event.data; // The json data that the extension sent
      switch (command) {
        case "update-tasks-list":
          tasks = value.filter((task: Task) => task.status === "ongoing");
          dropdownTasks = value.filter(
            (task: Task) =>
              task.status === "ongoing" || task.status === "scheduled"
          );
          console.log(dropdownTasks);

          if (tasks.length > 0) {
            selectedTaskToDepend = tasks[0].id;
          }
          break;
      }
    });
  });

  const handleRemoveTask = (id: string) =>
    tsvscode.postMessage({
      command: "remove-task",
      value: id,
    });

  const validateTaskTime = () => {
    const timeRegex = /^([0-9]+[h|m])|([0-9]{2}:[0-9]{2})$/;
    if (!timeRegex.test(taskTime) && taskTime.length > 0) {
      errors.taskTime = "Invalid time format";
    } else {
      errors.taskTime = undefined;
    }
  };

  const validateTaskName = () => {
    if (errors.taskName) errors.taskName = undefined;
  };

  const handleClearTasks = () =>
    tsvscode.postMessage({
      command: "clear-tasks",
    });

  const handleAddTask = () => {
    if (!taskName || !taskTime) {
      errors.taskName = "Theres an empty field";
      return;
    }

    if (isScheduled) {
      tsvscode.postMessage({
        command: "schedule-task",
        value: {
          title: taskName,
          dueTime: taskTime,
          dependsOn: selectedTaskToDepend,
        },
      });
      return;
    }
    tsvscode.postMessage({
      command: "add-task",
      value: {
        title: taskName,
        dueTime: taskTime,
      },
    });
  };

  const handleCompleteTask = (id: string) =>
    tsvscode.postMessage({
      command: "complete-task",
      value: id,
    });
</script>

<div id="container">
  <div id="header">
    <h3>Create a task</h3>
  </div>
  <div id="input-container">
    <div class="form-control">
      <label for="task-name">Task Name</label>
      <input
        type="text"
        id="task-name"
        placeholder="Eg. Create a new task"
        bind:value={taskName}
        on:keyup={validateTaskName}
      />
      <!-- Form error message -->
      {#if errors.taskName}
        <div class="error-message">{errors.taskName}</div>
      {/if}
    </div>

    <div class="form-control">
      <label for="task-time">Task Due Time</label>
      <input
        type="text"
        id="task-time"
        placeholder="eg. 1h, 5m or 12:00, 19:00 "
        bind:value={taskTime}
        on:keyup={validateTaskTime}
      />
      {#if errors.taskTime}
        <div class="error-message">{errors.taskTime}</div>
      {/if}
    </div>
    {#if tasks}
      <div id="schedule-task-section">
        <div class="form-control flex">
          <input
            type="checkbox"
            id="schedule-task"
            bind:checked={isScheduled}
          />
          <label for="schedule-task">Schedule task</label>
        </div>
      </div>
      {#if isScheduled}
        <div class="form-control">
          <label for="task-select">Set this task after: </label>
          <select
            name="task-select"
            id="task-select"
            bind:value={selectedTaskToDepend}
          >
            {#each dropdownTasks as task}
              <option value={task.id}>{task.name}</option>
            {/each}
          </select>
        </div>
      {/if}
    {/if}
    <button on:click={handleAddTask}>Add Task</button>
    <button on:click={handleClearTasks}>Clear Tasks</button>
  </div>
  <div id="task-container">
    <h3>Created tasks</h3>

    {#if tasks && tasks.length > 0}
      <table>
        <thead>
          <th>Name</th>
          <th>Time left</th>
          <th>Actions</th>
        </thead>
        <tbody>
          {#each tasks as task}
            <tr>
              <td>{task.name}</td>
              <td>{task.time}</td>
              <td>
                {#if task.status === "ongoing"}
                  <div class="button-section">
                    <button on:click={() => handleCompleteTask(task.id)}
                      >Complete</button
                    >
                    <button on:click={() => handleRemoveTask(task.id)}
                      >Remove</button
                    >
                  </div>
                {/if}
              </td>
            </tr>{/each}
        </tbody>
      </table>
    {:else}
      <div id="no-tasks">No tasks created, create one to start!</div>
    {/if}
  </div>
</div>
