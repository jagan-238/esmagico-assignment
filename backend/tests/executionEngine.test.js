import { describe, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import { computeExecutionPlan } from '../src/services/executionEngine.js';

function mockTask(overrides) {
  const rawId = overrides._id;
  const id = rawId ? new mongoose.Types.ObjectId(rawId) : new mongoose.Types.ObjectId();
  return {
    _id: id,
    dependencies: (overrides.dependencies || []).map((d) => new mongoose.Types.ObjectId(d)),
    status: overrides.status || 'Pending',
    priority: overrides.priority ?? 1,
    estimatedHours: overrides.estimatedHours ?? 1,
    resourceTag: overrides.resourceTag || 'r1',
    createdAt: overrides.createdAt || new Date('2020-01-01'),
  };
}

describe('computeExecutionPlan', () => {
  it('is deterministic for same inputs', () => {
    const idA = new mongoose.Types.ObjectId().toString();
    const idB = new mongoose.Types.ObjectId().toString();
    const tasks = [
      mockTask({ _id: idA, dependencies: [], priority: 2, estimatedHours: 2 }),
      mockTask({ _id: idB, dependencies: [idA], priority: 5, estimatedHours: 1 }),
    ];
    const a = computeExecutionPlan(tasks);
    const b = computeExecutionPlan(tasks);
    expect(a.executionOrder).toEqual(b.executionOrder);
  });

  it('excludes Blocked tasks from execution order', () => {
    const idA = new mongoose.Types.ObjectId().toString();
    const idB = new mongoose.Types.ObjectId().toString();
    const tasks = [
      mockTask({ _id: idA, dependencies: [], status: 'Blocked' }),
      mockTask({ _id: idB, dependencies: [] }),
    ];
    const plan = computeExecutionPlan(tasks);
    expect(plan.executionOrder).not.toContain(idA);
    expect(plan.executionOrder).toContain(idB);
  });

  it('does not treat dependents of Blocked tasks as ready', () => {
    const idA = new mongoose.Types.ObjectId().toString();
    const idB = new mongoose.Types.ObjectId().toString();
    const tasks = [
      mockTask({ _id: idA, dependencies: [], status: 'Blocked' }),
      mockTask({ _id: idB, dependencies: [idA], status: 'Pending' }),
    ];
    const plan = computeExecutionPlan(tasks);
    expect(plan.readyTasks).not.toContain(idB);
  });

  it('does not mark ready if resource is running', () => {
    const idA = new mongoose.Types.ObjectId().toString();
    const idB = new mongoose.Types.ObjectId().toString();
    const tasks = [
      mockTask({ _id: idA, dependencies: [], status: 'Running', resourceTag: 'gpu' }),
      mockTask({ _id: idB, dependencies: [], status: 'Pending', resourceTag: 'gpu' }),
    ];
    const plan = computeExecutionPlan(tasks);
    expect(plan.readyTasks).not.toContain(idB);
  });
});
