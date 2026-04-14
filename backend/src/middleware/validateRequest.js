import { validationResult } from 'express-validator';
import { fail } from '../utils/apiResponse.js';

export function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return fail(res, errors.array()[0]?.msg || 'Validation failed', 400, { details: errors.array() });
  }
  next();
}
