import { Project } from '../models/Project.js';
import { logAudit } from './auditService.js';
import { signProjectInvite, verifyProjectInvite } from './inviteService.js';

export async function createProject({ userId, name, description }) {
  const project = await Project.create({
    name,
    description: description || '',
    ownerId: userId,
    members: [{ userId, role: 'owner' }],
  });
  await logAudit({
    actorId: userId,
    action: 'project_create',
    entityType: 'Project',
    entityId: project._id,
    metadata: { name },
  });
  return project;
}

export async function listProjectsForUser(userId) {
  return Project.find({ 'members.userId': userId }).sort({ updatedAt: -1 });
}

export async function getProjectIfMember(projectId, userId) {
  const project = await Project.findById(projectId);
  if (!project) return null;
  const isMember = project.members.some((m) => m.userId.toString() === String(userId));
  if (!isMember) return null;
  return project;
}

export async function updateProjectWebhook(projectId, userId, { webhookUrl, webhookEnabled }) {
  const project = await getProjectIfMember(projectId, userId);
  if (!project) {
    const err = new Error('Project not found or access denied');
    err.status = 404;
    throw err;
  }
  const isOwner = project.ownerId.toString() === String(userId);
  if (!isOwner) {
    const err = new Error('Only owner can configure webhook');
    err.status = 400;
    throw err;
  }
  if (webhookUrl !== undefined) project.webhookUrl = webhookUrl || '';
  if (webhookEnabled !== undefined) project.webhookEnabled = Boolean(webhookEnabled);
  await project.save();
  return project;
}

export function createInviteToken(project, actorId) {
  return signProjectInvite(project._id);
}

export async function generateInvite(projectId, userId) {
  const project = await getProjectIfMember(projectId, userId);
  if (!project) {
    const err = new Error('Project not found or access denied');
    err.status = 404;
    throw err;
  }
  const token = createInviteToken(project, userId);
  await logAudit({
    actorId: userId,
    action: 'invite_generate',
    entityType: 'Project',
    entityId: project._id,
    metadata: {},
  });
  return { token, expiresInMinutes: 30 };
}

export async function joinProjectWithToken(userId, token) {
  let projectId;
  try {
    ({ projectId } = verifyProjectInvite(token));
  } catch {
    const err = new Error('Invalid or expired invite token');
    err.status = 400;
    throw err;
  }
  const project = await Project.findById(projectId);
  if (!project) {
    const err = new Error('Project not found');
    err.status = 404;
    throw err;
  }
  const already = project.members.some((m) => m.userId.toString() === String(userId));
  if (!already) {
    project.members.push({ userId, role: 'member' });
    await project.save();
    await logAudit({
      actorId: userId,
      action: 'member_join',
      entityType: 'Project',
      entityId: project._id,
      metadata: {},
    });
  }
  return project;
}
