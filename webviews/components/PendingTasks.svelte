<script lang="ts">
  import { onMount } from "svelte";
  import { type Task } from "../../src/types";

  let tasks: Task[] = [];

  const handleRemoveTask = (id: string) => {
    tsvscode.postMessage({
      command: "remove-task",
      value: id,
    });
  };

  onMount(() => {
    tsvscode.postMessage({
      command: "onLoad",
    });

    window.addEventListener("message", (event) => {
      const { command, value } = event.data; // The json data that the extension sent
      switch (command) {
        case "update-tasks-list":
          tasks = value;
          break; 
      }
    });
  });
</script>

{#if tasks && tasks.length > 0}
  <div id="task-container">
    <table id="taskList">
      <thead>
        <tr>
          <th>Name</th>
          <th>Due Time</th>
          <th>Depends on</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each tasks as task}
          <tr>
            <td>{task.name}</td>
            <td>{task.timeInterval}</td>
            <td>{task.dependsOn?.name}</td>
            <td>
              <div class="button-section">
                <button on:click={() => handleRemoveTask(task.id)}
                  >Delete</button
                >
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  <div class="no-tasks">
    <p>No tasks found</p>
  </div>
{/if}

<style lang="scss">
  #taskList {
    font-family: Arial, Helvetica, sans-serif;
    border-collapse: collapse;
    width: 100%;
    text-align: left;
  }
</style>
