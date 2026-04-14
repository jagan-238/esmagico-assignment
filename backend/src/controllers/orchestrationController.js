import { runComputeExecution, runSimulation } from '../services/orchestrationService.js';
import { ok, fail } from '../utils/apiResponse.js';

export async function postComputeExecution(req, res) {
  try {
    const result = await runComputeExecution(req.params.projectId, req.user.id);
    return ok(res, result);
  } catch (e) {
    return fail(res, e.message, e.status || 500);
  }
}

export async function postSimulate(req, res) {
  try {
    const result = await runSimulation(req.params.projectId, req.user.id, {
      availableHours: req.body.availableHours,
      failedTaskIds: req.body.failedTaskIds,
    });
    if (result.error) {
      return fail(res, result.error, 400);
    }
    return ok(res, {
      executionOrder: result.executionOrder,
      selectedTasks: result.selectedTasks,
      blockedTasks: result.blockedTasks,
      skippedTasks: result.skippedTasks,
      totalPriorityScore: result.totalPriorityScore,
      remainingHours: result.remainingHours,
    });
  } catch (e) {
    return fail(res, e.message, e.status || 500);
  }
}
