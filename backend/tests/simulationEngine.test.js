import { describe, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import { simulateSchedule } from '../src/services/simulationEngine.js';

function doc(overrides) {
  const id = new mongoose.Types.ObjectId();
  return {
    _id: id,
    projectId: new mongoose.Types.ObjectId(),
    dependencies: (overrides.dependencies || []).map((d) =>
      d instanceof mongoose.Types.ObjectId ? d : new mongoose.Types.ObjectId(d)
    ),
    priority: overrides.priority ?? 1,
    estimatedHours: overrides.estimatedHours ?? 1,
    status: overrides.status || 'Pending',
    createdAt: overrides.createdAt || new Date('2020-01-01'),
  };
}

describe('simulateSchedule', () => {
  it('selects higher priority tasks within hours budget', () => {
    const a = doc({ priority: 5, estimatedHours: 2 });
    const b = doc({ priority: 2, estimatedHours: 2 });
    const aId = a._id.toString();
    const bId = b._id.toString();
    const res = simulateSchedule([a, b], { availableHours: 2, failedTaskIds: [] });
    expect(res.error).toBeNull();
    expect(res.selectedTasks).toContain(aId);
    expect(res.selectedTasks).not.toContain(bId);
    expect(res.totalPriorityScore).toBe(5);
  });

  it('blocks dependents of simulated failures', () => {
    const a = doc({ priority: 5, estimatedHours: 1 });
    const b = doc({ priority: 5, estimatedHours: 1, dependencies: [a._id] });
    const res = simulateSchedule([a, b], { availableHours: 10, failedTaskIds: [a._id.toString()] });
    expect(res.blockedTasks).toContain(b._id.toString());
  });
});
