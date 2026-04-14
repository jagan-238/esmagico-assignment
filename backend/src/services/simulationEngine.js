import { topologicalSortDeterministic, buildTaskSnapshotForGraph } from './dependencyGraph.js';

const BLOCKED = 'Blocked';
const FAILED = 'Failed';

/**
 * Propagate blocks from failed task IDs (and optional already-blocked tasks).
 */
export function computeBlockedByFailures(taskDocs, simulatedFailedIds) {
  const byId = new Map(taskDocs.map((t) => [t._id.toString(), t]));
  const blocked = new Set();
  const failed = new Set(simulatedFailedIds.map(String));

  let changed = true;
  while (changed) {
    changed = false;
    for (const t of taskDocs) {
      const id = t._id.toString();
      if (blocked.has(id)) continue;
      if (t.status === BLOCKED) {
        blocked.add(id);
        changed = true;
        continue;
      }
      if (failed.has(id)) continue;
      const deps = (t.dependencies || []).map((d) => d.toString());
      for (const d of deps) {
        if (failed.has(d) || blocked.has(d)) {
          blocked.add(id);
          changed = true;
          break;
        }
      }
    }
  }
  return { blocked, failed };
}

export function simulateSchedule(taskDocs, { availableHours, failedTaskIds = [] }) {
  const failedSet = new Set((failedTaskIds || []).map(String));
  const { blocked } = computeBlockedByFailures(taskDocs, [...failedSet]);

  const schedulable = taskDocs.filter((t) => {
    const id = t._id.toString();
    return !blocked.has(id) && !failedSet.has(id) && t.status !== BLOCKED;
  });

  const idSet = new Set(schedulable.map((t) => t._id.toString()));
  const graphTasks = schedulable.map((t) => {
    const snap = buildTaskSnapshotForGraph(t);
    return {
      ...snap,
      dependencies: snap.dependencies.filter((d) => idSet.has(d)),
    };
  });

  const { hasCycle, sortedIds } = topologicalSortDeterministic(graphTasks);
  if (hasCycle) {
    return {
      error: 'Dependency cycle detected in schedulable tasks',
      executionOrder: [],
      selectedTasks: [],
      blockedTasks: [...blocked].sort(),
      skippedTasks: [],
      totalPriorityScore: 0,
    };
  }

  let remaining = Number(availableHours);
  if (Number.isNaN(remaining) || remaining < 0) remaining = 0;

  const selected = [];
  const skipped = [];
  let score = 0;
  const selectedSet = new Set();

  for (const id of sortedIds) {
    const task = schedulable.find((x) => x._id.toString() === id);
    if (!task) continue;
    const deps = (task.dependencies || []).map((d) => d.toString()).filter((d) => idSet.has(d));
    const depsOk = deps.every((d) => selectedSet.has(d));
    if (!depsOk) {
      skipped.push(id);
      continue;
    }
    const hrs = task.estimatedHours;
    if (hrs <= remaining) {
      selected.push(id);
      selectedSet.add(id);
      remaining -= hrs;
      score += task.priority;
    } else {
      skipped.push(id);
    }
  }

  return {
    error: null,
    executionOrder: sortedIds,
    selectedTasks: selected,
    blockedTasks: [...blocked].sort(),
    skippedTasks: skipped,
    totalPriorityScore: score,
    remainingHours: remaining,
  };
}
