import { Router } from 'express';
import { body } from 'express-validator';
import {
  postCreateProject,
  getProjects,
  getProject,
  patchWebhook,
  postInvite,
  postJoin,
} from '../controllers/projectController.js';
import { getAuditLogs, getWebhookLogs } from '../controllers/auditController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import taskRoutes from './taskRoutes.js';
import { postComputeExecution, postSimulate } from '../controllers/orchestrationController.js';

const router = Router();

router.use(requireAuth);

router.post(
  '/',
  [body('name').trim().notEmpty().withMessage('Name required'), body('description').optional().isString()],
  validateRequest,
  postCreateProject
);
router.get('/', getProjects);
router.post(
  '/join',
  [body('token').notEmpty().withMessage('Invite token required')],
  validateRequest,
  postJoin
);

router.get('/:projectId', getProject);
router.patch(
  '/:projectId/webhook',
  [
    body('webhookUrl').optional().isString(),
    body('webhookEnabled').optional().isBoolean(),
  ],
  validateRequest,
  patchWebhook
);
router.post('/:projectId/invite', postInvite);
router.get('/:projectId/audit-logs', getAuditLogs);
router.get('/:projectId/webhook-logs', getWebhookLogs);

router.post('/:projectId/compute-execution', postComputeExecution);
router.post(
  '/:projectId/simulate',
  [
    body('availableHours').isFloat({ min: 0 }).withMessage('availableHours required and must be >= 0'),
    body('failedTaskIds').optional().isArray(),
  ],
  validateRequest,
  postSimulate
);

router.use('/:projectId/tasks', taskRoutes);

export default router;
