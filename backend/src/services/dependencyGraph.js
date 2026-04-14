/**
 * Tasks: array of { id, dependencies: string[] }
 * Edge: depId -> taskId (task depends on dep)
 * Returns { hasCycle: boolean, sortedIds: string[] } using Kahn with deterministic ordering.
 */
export function topologicalSortDeterministic(tasks) {
  const idSet = new Set(tasks.map((t) => t.id));
  const inDegree = new Map();
  const adj = new Map();

  for (const t of tasks) {
    inDegree.set(t.id, t.dependencies.filter((d) => idSet.has(d)).length);
    if (!adj.has(t.id)) adj.set(t.id, []);
  }
  for (const t of tasks) {
    for (const d of t.dependencies) {
      if (!idSet.has(d)) continue;
      if (!adj.has(d)) adj.set(d, []);
      adj.get(d).push(t.id);
    }
  }

  const taskById = new Map(tasks.map((t) => [t.id, t]));

  function compareReady(a, b) {
    const ta = taskById.get(a);
    const tb = taskById.get(b);
    if (tb.priority !== ta.priority) return tb.priority - ta.priority;
    if (ta.estimatedHours !== tb.estimatedHours) return ta.estimatedHours - tb.estimatedHours;
    const ca = new Date(ta.createdAt).getTime();
    const cb = new Date(tb.createdAt).getTime();
    if (ca !== cb) return ca - cb;
    return a.localeCompare(b);
  }

  const ready = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) ready.push(id);
  }
  ready.sort(compareReady);

  const order = [];
  while (ready.length) {
    const id = ready.shift();
    order.push(id);
    const outs = adj.get(id) || [];
    for (const next of outs) {
      const nd = inDegree.get(next) - 1;
      inDegree.set(next, nd);
      if (nd === 0) {
        let inserted = false;
        for (let i = 0; i < ready.length; i++) {
          if (compareReady(next, ready[i]) < 0) {
            ready.splice(i, 0, next);
            inserted = true;
            break;
          }
        }
        if (!inserted) ready.push(next);
      }
    }
  }

  const hasCycle = order.length !== tasks.length;
  return { hasCycle, sortedIds: order };
}

/**
 * Detect cycle if we add/update edges for one task's dependencies within the full task set.
 */
export function wouldCreateCycle(allTasks, taskId, newDependencyIds) {
  const idSet = new Set(allTasks.map((t) => t.id));
  const depsByTask = new Map();
  for (const t of allTasks) {
    if (t.id === taskId) {
      depsByTask.set(t.id, newDependencyIds.filter((d) => idSet.has(d) && d !== taskId));
    } else {
      depsByTask.set(t.id, (t.dependencies || []).filter((d) => idSet.has(d) && d !== t.id));
    }
  }
  const tasksForSort = allTasks.map((t) => ({
    id: t.id,
    dependencies: depsByTask.get(t.id) || [],
    priority: t.priority ?? 1,
    estimatedHours: t.estimatedHours ?? 0,
    createdAt: t.createdAt || new Date(0),
  }));
  return topologicalSortDeterministic(tasksForSort).hasCycle;
}

export function buildTaskSnapshotForGraph(taskDoc) {
  return {
    id: taskDoc._id.toString(),
    dependencies: (taskDoc.dependencies || []).map((d) => d.toString()),
    priority: taskDoc.priority,
    estimatedHours: taskDoc.estimatedHours,
    createdAt: taskDoc.createdAt,
  };
}
