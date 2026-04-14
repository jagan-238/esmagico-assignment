import { topologicalSortDeterministic, buildTaskSnapshotForGraph } from './dependencyGraph.js';

const BLOCKED = 'Blocked';
const COMPLETED = 'Completed';
const RUNNING = 'Running';

/**
 * Topological sort uses all tasks so Blocked tasks still block dependents.
 * `executionOrder` omits Blocked tasks per spec; readiness uses full dependency chain.
 */
export function computeExecutionPlan(tasks) {
  const byId = new Map(tasks.map((t) => [t._id.toString(), t]));
  const graphTasks = tasks.map((t) => {
    const snap = buildTaskSnapshotForGraph(t);
    return {
      ...snap,
      dependencies: snap.dependencies.filter((d) => byId.has(d)),
    };
  });

  const { hasCycle, sortedIds } = topologicalSortDeterministic(graphTasks);
  if (hasCycle) {
    return { error: 'Dependency cycle detected', sortedIds: [], readyNow: [] };
  }

  const executionOrder = sortedIds.filter((id) => byId.get(id).status !== BLOCKED);

  function depsCompleted(task) {
    const deps = (task.dependencies || []).map((d) => d.toString()).filter((d) => byId.has(d));
    return deps.every((d) => byId.get(d).status === COMPLETED);
  }

  const runningByResource = new Map();
  for (const t of tasks) {
    if (t.status === RUNNING) {
      runningByResource.set(t.resourceTag, (runningByResource.get(t.resourceTag) || 0) + 1);
    }
  }

  const readyNow = [];
  for (const id of sortedIds) {
    const task = byId.get(id);
    if (!task || task.status === BLOCKED) continue;
    if (!depsCompleted(task)) continue;
    const runningSame = runningByResource.get(task.resourceTag) || 0;
    if (runningSame > 0) continue;
    if ([COMPLETED, 'Failed'].includes(task.status)) continue;
    readyNow.push(id);
  }

  return {
    error: null,
    executionOrder,
    readyTasks: readyNow,
    meta: {
      excludedBlockedCount: tasks.filter((t) => t.status === BLOCKED).length,
    },
  };
}
