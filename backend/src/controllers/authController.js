import { signup, login, signAuthToken } from '../services/authService.js';
import { User } from '../models/User.js';
import { ok, fail } from '../utils/apiResponse.js';

export async function postSignup(req, res) {
  try {
    const { email, password, name } = req.body;
    const user = await signup({ email, password, name });
    const token = signAuthToken(user._id);
    return ok(res, { user: user.toPublicJSON(), token });
  } catch (e) {
    return fail(res, e.message, e.status || 500);
  }
}

export async function postLogin(req, res) {
  try {
    const { email, password } = req.body;
    const user = await login({ email, password });
    const token = signAuthToken(user._id);
    return ok(res, { user: user.toPublicJSON(), token });
  } catch (e) {
    return fail(res, e.message, e.status || 500);
  }
}

export async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return fail(res, 'User not found', 401);
    return ok(res, { user: user.toPublicJSON() });
  } catch (e) {
    return fail(res, e.message, 500);
  }
}
