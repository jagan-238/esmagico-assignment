import {
  listTasks,
  createTask,
  updateTask,
  retryTask,
  getTaskHistory,
} from '../services/taskService.js';
import { ok, fail } from '../utils/apiResponse.js';

export async function getTasks(req, res) {
  try {
    const tasks = await listTasks(req.params.projectId, req.user.id);
    return ok(res, { tasks });
  } catch (e) {
    return fail(res, e.message, e.status || 500);
  }
}

export async function postTask(req, res) {
  try {
    const task = await createTask(req.params.projectId, req.user.id, req.body);
    return ok(res, { task }, 201);
  } catch (e) {
    return fail(res, e.message, e.status || 500);
  }
}

export async function patchTask(req, res) {
  try {
    const task = await updateTask(req.params.projectId, req.params.taskId, req.user.id, req.body);
    return ok(res, { task });
  } catch (e) {
    if (e.status === 409 && e.latest) {
      return res.status(409).json({
        success: false,
        error: e.message,
        latest: e.latest,
      });
    }
    return fail(res, e.message, e.status || 500);
  }
}

export async function postRetryTask(req, res) {
  try {
    const task = await retryTask(req.params.projectId, req.params.taskId, req.user.id, req.body);
    return ok(res, { task });
  } catch (e) {
    if (e.status === 409 && e.latest) {
      return res.status(409).json({
        success: false,
        error: e.message,
        latest: e.latest,
      });
    }
    return fail(res, e.message, e.status || 500);
  }
}

export async function getHistory(req, res) {
  try {
    const history = await getTaskHistory(req.params.projectId, req.params.taskId, req.user.id);
    return ok(res, { history });
  } catch (e) {
    return fail(res, e.message, e.status || 500);
  }
}
