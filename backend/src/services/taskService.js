import mongoose from 'mongoose';
import { Task } from '../models/Task.js';
import { TaskVersionHistory } from '../models/TaskVersionHistory.js';
import { wouldCreateCycle } from './dependencyGraph.js';
import { logAudit } from './auditService.js';
import { deliverTaskCompletionWebhook } from './webhookService.js';
import { getProjectIfMember } from './projectService.js';
import { emitToProject } from '../socket/socketHub.js';
import { validateTaskVersion } from './optimisticLock.js';

async function propagateBlockedAfterFailure(projectId, rootFailedId, actorId) {
  const all = await Task.find({ projectId });
  const cause = new Set([String(rootFailedId)]);
  const blockedIds = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of all) {
      const id = String(t._id);
      if (id === String(rootFailedId)) continue;
      if (blockedIds.has(id)) continue;
      if (t.status === 'Completed') continue;
      const deps = (t.dependencies || []).map((d) => d.toString());
      if (deps.some((d) => cause.has(d))) {
        blockedIds.add(id);
        cause.add(id);
        changed = true;
      }
    }
  }
  for (const bid of blockedIds) {
    const fresh = await Task.findById(bid);
    if (!fresh || fresh.status === 'Blocked' || fresh.status === 'Completed' || fresh.status === 'Failed') continue;
    const previousStatus = fresh.status;
    await saveVersionSnapshot(fresh, actorId);
    fresh.status = 'Blocked';
    fresh.versionNumber += 1;
    await fresh.save();
    await logAudit({
      actorId,
      action: 'task_update',
      entityType: 'Task',
      entityId: fresh._id,
      metadata: { reason: 'dependency_failed', projectId: String(projectId), versionNumber: fresh.versionNumber },
    });
    const pub = fresh.toPublicJSON();
    emitToProject(String(projectId), 'task:updated', { task: pub, previousStatus });
    emitToProject(String(projectId), 'task:status', {
      taskId: pub.id,
      status: pub.status,
      previousStatus,
    });
  }
}

async function saveVersionSnapshot(task, editedBy) {
  await TaskVersionHistory.create({
    taskId: task._id,
    projectId: task.projectId,
    versionNumber: task.versionNumber,
    snapshot: {
      title: task.title,
      description: task.description,
      priority: task.priority,
      estimatedHours: task.estimatedHours,
      status: task.status,
      dependencies: (task.dependencies || []).map((d) => d.toString()),
      resourceTag: task.resourceTag,
      maxRetries: task.maxRetries,
      retryCount: task.retryCount,
    },
    editedBy,
  });
}

export async function listTasks(projectId, userId) {
  const project = await getProjectIfMember(projectId, userId);
  if (!project) {
    const err = new Error('Project not found or access denied');
    err.status = 404;
    throw err;
  }
  const tasks = await Task.find({ projectId }).sort({ createdAt: 1 });
  return tasks.map((t) => t.toPublicJSON());
}

export async function createTask(projectId, userId, body) {
  const project = await getProjectIfMember(projectId, userId);
  if (!project) {
    const err = new Error('Project not found or access denied');
    err.status = 404;
    throw err;
  }

  const depIds = (body.dependencies || [])
    .map((id) => new mongoose.Types.ObjectId(id))
    .filter((id) => String(id) !== String(body._id));

  if (depIds.length) {
    const deps = await Task.find({ _id: { $in: depIds }, projectId });
    if (deps.length !== depIds.length) {
      const err = new Error('One or more dependencies are invalid or belong to another project');
      err.status = 400;
      throw err;
    }
  }

  const allExisting = await Task.find({ projectId });
  const tempId = new mongoose.Types.ObjectId();
  const allForCycle = [
    ...allExisting.map((t) => ({ id: t._id.toString(), dependencies: (t.dependencies || []).map((d) => d.toString()), priority: t.priority, estimatedHours: t.estimatedHours, createdAt: t.createdAt })),
    {
      id: tempId.toString(),
      dependencies: depIds.map((d) => d.toString()),
      priority: body.priority,
      estimatedHours: body.estimatedHours,
      createdAt: new Date(),
    },
  ];
  if (wouldCreateCycle(allForCycle, tempId.toString(), depIds.map((d) => d.toString()))) {
    await logAudit({
      actorId: userId,
      action: 'dependency_reject_cycle',
      entityType: 'Task',
      entityId: '',
      metadata: { projectId: String(projectId), phase: 'create' },
    });
    const err = new Error('Cyclic dependencies are not allowed');
    err.status = 400;
    throw err;
  }

  const task = await Task.create({
    projectId,
    title: body.title,
    description: body.description ?? '',
    priority: body.priority,
    estimatedHours: body.estimatedHours,
    status: body.status || 'Pending',
    dependencies: depIds,
    resourceTag: body.resourceTag || 'default',
    maxRetries: body.maxRetries ?? 0,
    retryCount: 0,
    versionNumber: 1,
    createdBy: userId,
  });

  await logAudit({
    actorId: userId,
    action: 'task_create',
    entityType: 'Task',
    entityId: task._id,
    metadata: { title: task.title, projectId: String(projectId) },
  });

  const pub = task.toPublicJSON();
  emitToProject(String(projectId), 'task:created', { task: pub });
  return pub;
}

export async function updateTask(projectId, taskId, userId, body) {
  const project = await getProjectIfMember(projectId, userId);
  if (!project) {
    const err = new Error('Project not found or access denied');
    err.status = 404;
    throw err;
  }

  const task = await Task.findOne({ _id: taskId, projectId });
  if (!task) {
    const err = new Error('Task not found');
    err.status = 404;
    throw err;
  }

  try {
    validateTaskVersion(body.versionNumber, task.versionNumber);
  } catch (e) {
    if (e.status === 409) e.latest = task.toPublicJSON();
    throw e;
  }

  const depIds =
    body.dependencies !== undefined
      ? body.dependencies.map((id) => new mongoose.Types.ObjectId(id)).filter((id) => String(id) !== String(taskId))
      : null;

  if (depIds) {
    if (depIds.some((id) => String(id) === String(taskId))) {
      const err = new Error('Task cannot depend on itself');
      err.status = 400;
      throw err;
    }
    const deps = await Task.find({ _id: { $in: depIds }, projectId });
    if (deps.length !== depIds.length) {
      const err = new Error('One or more dependencies are invalid');
      err.status = 400;
      throw err;
    }

    const allExisting = await Task.find({ projectId });
    const allForCycle = allExisting.map((t) => ({
      id: t._id.toString(),
      dependencies: t._id.equals(taskId)
        ? depIds.map((d) => d.toString())
        : (t.dependencies || []).map((d) => d.toString()),
      priority: t.priority,
      estimatedHours: t.estimatedHours,
      createdAt: t.createdAt,
    }));
    if (wouldCreateCycle(allForCycle, String(taskId), depIds.map((d) => d.toString()))) {
      await logAudit({
        actorId: userId,
        action: 'dependency_reject_cycle',
        entityType: 'Task',
        entityId: String(taskId),
        metadata: { projectId: String(projectId) },
      });
      const err = new Error('Cyclic dependencies are not allowed');
      err.status = 400;
      throw err;
    }
  }

  await saveVersionSnapshot(task, userId);

  if (depIds) task.dependencies = depIds;
  const prevStatus = task.status;

  if (body.title !== undefined) task.title = body.title;
  if (body.description !== undefined) task.description = body.description;
  if (body.priority !== undefined) task.priority = body.priority;
  if (body.estimatedHours !== undefined) task.estimatedHours = body.estimatedHours;
  if (body.status !== undefined) task.status = body.status;
  if (body.resourceTag !== undefined) task.resourceTag = body.resourceTag;
  if (body.maxRetries !== undefined) task.maxRetries = body.maxRetries;

  task.versionNumber += 1;
  await task.save();

  await logAudit({
    actorId: userId,
    action: 'task_update',
    entityType: 'Task',
    entityId: task._id,
    metadata: {
      versionNumber: task.versionNumber,
      fields: Object.keys(body),
      projectId: String(projectId),
    },
  });

  if (body.status === 'Failed') {
    await logAudit({
      actorId: userId,
      action: 'task_failure',
      entityType: 'Task',
      entityId: task._id,
      metadata: {
        retryCount: task.retryCount,
        maxRetries: task.maxRetries,
        projectId: String(projectId),
      },
    });
  }

  if (task.status === 'Failed' && prevStatus !== 'Failed') {
    await propagateBlockedAfterFailure(projectId, task._id, userId);
  }

  const pub = task.toPublicJSON();
  emitToProject(String(projectId), 'task:updated', { task: pub, previousStatus: prevStatus });
  if (prevStatus !== task.status) {
    emitToProject(String(projectId), 'task:status', { taskId: pub.id, status: task.status, previousStatus: prevStatus });
  }

  if (prevStatus !== 'Completed' && task.status === 'Completed') {
    if (project.webhookEnabled && project.webhookUrl) {
      deliverTaskCompletionWebhook({
        projectId: project._id,
        taskId: task._id,
        url: project.webhookUrl,
        payload: {
          event: 'task.completed',
          task: pub,
          project: { id: project._id.toString(), name: project.name },
        },
      }).catch(() => {});
    }
  }

  return pub;
}

export async function retryTask(projectId, taskId, userId, body) {
  const project = await getProjectIfMember(projectId, userId);
  if (!project) {
    const err = new Error('Project not found or access denied');
    err.status = 404;
    throw err;
  }
  const task = await Task.findOne({ _id: taskId, projectId });
  if (!task) {
    const err = new Error('Task not found');
    err.status = 404;
    throw err;
  }
  try {
    validateTaskVersion(body.versionNumber, task.versionNumber);
  } catch (e) {
    if (e.status === 409) e.latest = task.toPublicJSON();
    throw e;
  }
  if (task.retryCount >= task.maxRetries) {
    const err = new Error('Max retries exceeded');
    err.status = 400;
    throw err;
  }
  if (task.status !== 'Failed') {
    const err = new Error('Only failed tasks can be retried');
    err.status = 400;
    throw err;
  }

  await saveVersionSnapshot(task, userId);
  task.retryCount += 1;
  task.status = 'Pending';
  task.versionNumber += 1;
  await task.save();

  await logAudit({
    actorId: userId,
    action: 'task_retry',
    entityType: 'Task',
    entityId: task._id,
    metadata: { retryCount: task.retryCount, projectId: String(projectId) },
  });

  const pub = task.toPublicJSON();
  emitToProject(String(projectId), 'task:retry', { task: pub });
  emitToProject(String(projectId), 'task:updated', { task: pub });
  return pub;
}

export async function getTaskHistory(projectId, taskId, userId) {
  const project = await getProjectIfMember(projectId, userId);
  if (!project) {
    const err = new Error('Project not found or access denied');
    err.status = 404;
    throw err;
  }
  const task = await Task.findOne({ _id: taskId, projectId });
  if (!task) {
    const err = new Error('Task not found');
    err.status = 404;
    throw err;
  }
  const history = await TaskVersionHistory.find({ taskId }).sort({ versionNumber: -1 });
  return history.map((h) => ({
    versionNumber: h.versionNumber,
    snapshot: h.snapshot,
    editedBy: h.editedBy ? h.editedBy.toString() : null,
    createdAt: h.createdAt,
  }));
}
