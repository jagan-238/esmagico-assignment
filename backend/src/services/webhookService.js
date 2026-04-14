import axios from 'axios';
import { WebhookDeliveryLog } from '../models/WebhookDeliveryLog.js';

const MAX_ATTEMPTS = 3;

export async function deliverTaskCompletionWebhook({
  projectId,
  taskId,
  url,
  payload,
}) {
  const logs = [];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await axios.post(url, payload, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Event': 'task.completed' },
        validateStatus: () => true,
      });
      const success = res.status >= 200 && res.status < 300;
      const snippet = typeof res.data === 'string' ? res.data.slice(0, 500) : JSON.stringify(res.data).slice(0, 500);
      await WebhookDeliveryLog.create({
        projectId,
        taskId,
        url,
        attempt,
        statusCode: res.status,
        success,
        errorMessage: success ? '' : `HTTP ${res.status}`,
        responseSnippet: snippet,
      });
      logs.push({ attempt, statusCode: res.status, success });
      if (success) return { ok: true, logs };
    } catch (err) {
      const msg = err.message || 'request failed';
      await WebhookDeliveryLog.create({
        projectId,
        taskId,
        url,
        attempt,
        statusCode: null,
        success: false,
        errorMessage: msg,
        responseSnippet: '',
      });
      logs.push({ attempt, success: false, error: msg });
    }
  }
  return { ok: false, logs };
}
