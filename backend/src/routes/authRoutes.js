import { Router } from 'express';
import { body } from 'express-validator';
import { postSignup, postLogin, getMe } from '../controllers/authController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post(
  '/signup',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password min 8 characters'),
    body('name').optional().isString().trim(),
  ],
  validateRequest,
  postSignup
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validateRequest,
  postLogin
);

router.get('/me', requireAuth, getMe);

export default router;
