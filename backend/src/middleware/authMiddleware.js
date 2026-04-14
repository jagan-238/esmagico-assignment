import { verifyAuthToken } from '../services/authService.js';
import { User } from '../models/User.js';
import { fail } from '../utils/apiResponse.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return fail(res, 'Authentication required', 401);
  }
  try {
    const payload = verifyAuthToken(token);
    const userId = payload.sub;
    const user = await User.findById(userId);
    if (!user) {
      return fail(res, 'User not found', 401);
    }
    req.user = { id: user._id.toString(), email: user.email };
    next();
  } catch {
    return fail(res, 'Invalid or expired token', 401);
  }
}
