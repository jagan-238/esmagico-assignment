import jwt from 'jsonwebtoken';

const INVITE_TYPE = 'project_invite';

export function signProjectInvite(projectId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return jwt.sign({ type: INVITE_TYPE, projectId: String(projectId) }, secret, { expiresIn: '30m' });
}

export function verifyProjectInvite(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  const payload = jwt.verify(token, secret);
  if (payload.type !== INVITE_TYPE || !payload.projectId) {
    throw new Error('Invalid invite token');
  }
  return { projectId: payload.projectId };
}
