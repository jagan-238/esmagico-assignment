import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getTasks,
  postTask,
  patchTask,
  postRetryTask,
  getHistory,
} from '../controllers/taskController.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router({ mergeParams: true });

const TASK_STATUSES = ['Pending', 'Running', 'Completed', 'Failed', 'Blocked'];

router.get('/', getTasks);

router.post(
  '/',
  [
    body('title').trim().notEmpty(),
    body('description').optional().isString(),
    body('priority').isInt({ min: 1, max: 5 }),
    body('estimatedHours').isFloat({ min: 0 }),
    body('status').optional().isIn(TASK_STATUSES),
    body('dependencies').optional().isArray(),
    body('resourceTag').optional().isString().trim(),
    body('maxRetries').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  postTask
);

router.patch(
  '/:taskId',
  [
    param('taskId').isMongoId(),
    body('versionNumber').isInt({ min: 1 }).withMessage('versionNumber required'),
    body('title').optional().trim().notEmpty(),
    body('description').optional().isString(),
    body('priority').optional().isInt({ min: 1, max: 5 }),
    body('estimatedHours').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(TASK_STATUSES),
    body('dependencies').optional().isArray(),
    body('resourceTag').optional().isString(),
    body('maxRetries').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  patchTask
);

router.post(
  '/:taskId/retry',
  [param('taskId').isMongoId(), body('versionNumber').isInt({ min: 1 })],
  validateRequest,
  postRetryTask
);

router.get('/:taskId/history', [param('taskId').isMongoId()], validateRequest, getHistory);

export default router;
