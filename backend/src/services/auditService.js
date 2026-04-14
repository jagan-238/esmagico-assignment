import { AuditLog } from '../models/AuditLog.js';

export async function logAudit({ actorId = null, action, entityType, entityId = '', metadata = {} }) {
  await AuditLog.create({
    actorId,
    action,
    entityType,
    entityId: entityId ? String(entityId) : '',
    metadata,
    timestamp: new Date(),
  });
}
