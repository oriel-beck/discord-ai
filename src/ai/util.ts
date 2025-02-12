export async function handleTasks<T>(promises: Promise<T>[]) {
  const tasks = await Promise.allSettled(promises);
  const errors = [];
  const data = [];

  for (const task of tasks) {
    if (task.status === 'fulfilled') {
      data.push(task.value);
    } else {
      errors.push(task.reason instanceof Error ? task.reason.message : task.reason);
    }
  }

  return {
    data: data.length ? data.join('\n') : undefined,
    error: errors.length ? errors.join('\n') : undefined,
  };
}
