import { AuditLog } from '../models/AuditLog.js';
import { WebhookDeliveryLog } from '../models/WebhookDeliveryLog.js';
import { getProjectIfMember } from './projectService.js';

export async function listAuditLogs(projectId, userId, { limit = 100 } = {}) {
  const project = await getProjectIfMember(projectId, userId);
  if (!project) {
    const err = new Error('Project not found or access denied');
    err.status = 404;
    throw err;
  }
  const logs = await AuditLog.find({
    $or: [
      { entityType: 'Project', entityId: String(projectId) },
      { 'metadata.projectId': String(projectId) },
    ],
  })
    .sort({ timestamp: -1 })
    .limit(Math.min(Number(limit) || 100, 500));

  return logs.map((l) => ({
    id: l._id.toString(),
    actorId: l.actorId ? l.actorId.toString() : null,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    metadata: l.metadata,
    timestamp: l.timestamp,
  }));
}

export async function listWebhookLogs(projectId, userId, { limit = 50 } = {}) {
  const project = await getProjectIfMember(projectId, userId);
  if (!project) {
    const err = new Error('Project not found or access denied');
    err.status = 404;
    throw err;
  }
  const logs = await WebhookDeliveryLog.find({ projectId })
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 50, 200));
  return logs.map((l) => ({
    id: l._id.toString(),
    taskId: l.taskId.toString(),
    url: l.url,
    attempt: l.attempt,
    statusCode: l.statusCode,
    success: l.success,
    errorMessage: l.errorMessage,
    createdAt: l.createdAt,
  }));
}
