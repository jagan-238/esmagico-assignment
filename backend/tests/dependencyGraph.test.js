import { describe, it, expect } from '@jest/globals';
import { topologicalSortDeterministic, wouldCreateCycle } from '../src/services/dependencyGraph.js';

const t = (id, deps, priority, hours, createdAt = '2020-01-01') => ({
  id,
  dependencies: deps,
  priority,
  estimatedHours: hours,
  createdAt: new Date(createdAt),
});

describe('topologicalSortDeterministic', () => {
  it('orders by priority DESC, then hours ASC, then createdAt ASC', () => {
    const tasks = [
      t('a', [], 3, 5, '2020-01-03'),
      t('b', [], 3, 5, '2020-01-01'),
      t('c', [], 3, 5, '2020-01-02'),
    ];
    const { hasCycle, sortedIds } = topologicalSortDeterministic(tasks);
    expect(hasCycle).toBe(false);
    expect(sortedIds).toEqual(['b', 'c', 'a']);
  });

  it('prefers higher priority first when both ready', () => {
    const tasks = [t('low', [], 1, 1, '2020-01-01'), t('high', [], 5, 10, '2020-01-01')];
    const { sortedIds } = topologicalSortDeterministic(tasks);
    expect(sortedIds[0]).toBe('high');
  });

  it('detects cycle A -> B -> A', () => {
    const tasks = [t('a', ['b'], 1, 1), t('b', ['a'], 1, 1)];
    const { hasCycle } = topologicalSortDeterministic(tasks);
    expect(hasCycle).toBe(true);
  });

  it('linear chain respects dependencies', () => {
    const tasks = [t('c', ['b'], 1, 1), t('a', [], 1, 1), t('b', ['a'], 1, 1)];
    const { hasCycle, sortedIds } = topologicalSortDeterministic(tasks);
    expect(hasCycle).toBe(false);
    expect(sortedIds.indexOf('a')).toBeLessThan(sortedIds.indexOf('b'));
    expect(sortedIds.indexOf('b')).toBeLessThan(sortedIds.indexOf('c'));
  });
});

describe('wouldCreateCycle', () => {
  it('rejects adding edge that closes a loop', () => {
    const all = [
      { id: 'a', dependencies: [], priority: 1, estimatedHours: 1, createdAt: new Date() },
      { id: 'b', dependencies: ['a'], priority: 1, estimatedHours: 1, createdAt: new Date() },
    ];
    expect(wouldCreateCycle(all, 'a', ['b'])).toBe(true);
  });

  it('allows DAG update', () => {
    const all = [
      { id: 'a', dependencies: [], priority: 1, estimatedHours: 1, createdAt: new Date() },
      { id: 'b', dependencies: [], priority: 1, estimatedHours: 1, createdAt: new Date() },
    ];
    expect(wouldCreateCycle(all, 'b', ['a'])).toBe(false);
  });
});
