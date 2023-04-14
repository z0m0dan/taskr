<script lang="ts">
  import { onMount } from "svelte";

  interface Task {
    id: string;
    name: string;
    dueTime: Date;
    status: "pending" | "done" | "overdue" | "scheduled";
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
{#each tasks as task}
  <p>{task.name}</p>
{/each}
