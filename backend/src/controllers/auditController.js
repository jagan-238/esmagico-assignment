import { listAuditLogs, listWebhookLogs } from '../services/auditQueryService.js';
import { ok, fail } from '../utils/apiResponse.js';

export async function getAuditLogs(req, res) {
  try {
    const logs = await listAuditLogs(req.params.projectId, req.user.id, {
      limit: req.query.limit,
    });
    return ok(res, { logs });
  } catch (e) {
    return fail(res, e.message, e.status || 500);
  }
}

export async function getWebhookLogs(req, res) {
  try {
    const logs = await listWebhookLogs(req.params.projectId, req.user.id, {
      limit: req.query.limit,
    });
    return ok(res, { logs });
  } catch (e) {
    return fail(res, e.message, e.status || 500);
  }
}
