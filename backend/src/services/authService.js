import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { logAudit } from './auditService.js';

const SALT_ROUNDS = 10;

export async function signup({ email, password, name }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 400;
    throw err;
  }
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    name: name || '',
  });
  await logAudit({
    actorId: user._id,
    action: 'user_signup',
    entityType: 'User',
    entityId: user._id,
    metadata: { email: user.email },
  });
  return user;
}

export async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }
  return user;
}

export function signAuthToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return jwt.sign({ sub: String(userId) }, secret, { expiresIn: '7d' });
}

export function verifyAuthToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return jwt.verify(token, secret);
}
