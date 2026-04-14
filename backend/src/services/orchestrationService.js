import { Task } from '../models/Task.js';
import { getProjectIfMember } from './projectService.js';
import { computeExecutionPlan } from './executionEngine.js';
import { simulateSchedule } from './simulationEngine.js';

export async function runComputeExecution(projectId, userId) {
  const project = await getProjectIfMember(projectId, userId);
  if (!project) {
    const err = new Error('Project not found or access denied');
    err.status = 404;
    throw err;
  }
  const tasks = await Task.find({ projectId });
  const plan = computeExecutionPlan(tasks);
  if (plan.error) {
    const err = new Error(plan.error);
    err.status = 400;
    throw err;
  }
  return {
    executionOrder: plan.executionOrder,
    readyTasks: plan.readyTasks,
    meta: plan.meta,
  };
}

export async function runSimulation(projectId, userId, { availableHours, failedTaskIds }) {
  const project = await getProjectIfMember(projectId, userId);
  if (!project) {
    const err = new Error('Project not found or access denied');
    err.status = 404;
    throw err;
  }
  const tasks = await Task.find({ projectId });
  return simulateSchedule(tasks, { availableHours, failedTaskIds });
}
