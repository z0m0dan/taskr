<script lang="ts">
  import { onMount } from "svelte";

  interface Task {
    id: string;
    name: string;
    dueTime: Date;
    status: "pending" | "Completed" | "overdue" | "scheduled";
    time?: string;
    nextTaskId?: string;
  }

  let tasks: Task[] = [];

  onMount(() => {
    tsvscode.postMessage({
      command: "onMount",
    });
    window.addEventListener("message", (event) => {
      const { command, value } = event.data; // The json data that the extension sent
      switch (command) {
        case "populateTasks":
          if (value.length > 0) tasks = value;
          console.log(value);
          return;
      }
    });
  });
</script>

<h1>Hello for scheduled</h1>
<div id="task-container">
  <ul id="task-list">
    {#each tasks as task}
      <li class="task">
        <span class="task-title">
          {task.name}
        </span>
        <span class="task-time">
          {task.time}
        </span>
        {#if task.status === "overdue"}
          <span class="task-status overdue">Overdue</span>
        {:else if task.status === "Completed"}
          <span class="task-status">Completed</span>
        {:else}
          <span>After: Tarea x</span>
          <div class="button-section">
            <button class="btn btn-complete" data-uuid="${task.id}"
              >Delete</button
            >
          </div>
        {/if}
      </li>
    {/each}
  </ul>
</div>

<style lang="scss">
  #task-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
  }

  #task-list {
    list-style: none;
    padding: 0;
    margin: 0;
    width: 100%;
  }

  .task {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem;
    border-bottom: 1px solid #ccc;
    width: 100%;
  }

  .task-title {
    font-size: 1.2rem;
    font-weight: 500;
  }

  .task-time {
    font-size: 1rem;
    font-weight: 300;
  }

  .task-status {
    font-size: 1rem;
    font-weight: 300;
    color: #fff;
    padding: 0.2rem 0.5rem;
    border-radius: 0.2rem;
    background-color: #2ecc71;
  }

  .overdue {
    background-color: #e74c3c;
  }

  .button-section {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .btn {
    padding: 0.2rem 0.5rem;
    border-radius: 0.2rem;
    border: none;
    font-size: 1rem;
    font-weight: 300;
    cursor: pointer;
  }

  .btn-complete {
    background-color: #2ecc71;
    color: #fff;
  }


</style>
