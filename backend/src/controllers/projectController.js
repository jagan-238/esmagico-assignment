import {
  createProject,
  listProjectsForUser,
  getProjectIfMember,
  updateProjectWebhook,
  generateInvite,
  joinProjectWithToken,
} from '../services/projectService.js';
import { ok, fail } from '../utils/apiResponse.js';

export async function postCreateProject(req, res) {
  try {
    const project = await createProject({
      userId: req.user.id,
      name: req.body.name,
      description: req.body.description,
    });
    return ok(res, { project: project.toPublicJSON() }, 201);
  } catch (e) {
    return fail(res, e.message, e.status || 500);
  }
}

export async function getProjects(req, res) {
  try {
    const projects = await listProjectsForUser(req.user.id);
    return ok(res, { projects: projects.map((p) => p.toPublicJSON()) });
  } catch (e) {
    return fail(res, e.message, 500);
  }
}

export async function getProject(req, res) {
  try {
    const project = await getProjectIfMember(req.params.projectId, req.user.id);
    if (!project) return fail(res, 'Project not found or access denied', 404);
    return ok(res, { project: project.toPublicJSON() });
  } catch (e) {
    return fail(res, e.message, 500);
  }
}

export async function patchWebhook(req, res) {
  try {
    const project = await updateProjectWebhook(req.params.projectId, req.user.id, {
      webhookUrl: req.body.webhookUrl,
      webhookEnabled: req.body.webhookEnabled,
    });
    return ok(res, { project: project.toPublicJSON() });
  } catch (e) {
    return fail(res, e.message, e.status || 500);
  }
}

export async function postInvite(req, res) {
  try {
    const { token, expiresInMinutes } = await generateInvite(req.params.projectId, req.user.id);
    return ok(res, { inviteToken: token, expiresInMinutes });
  } catch (e) {
    return fail(res, e.message, e.status || 500);
  }
}

export async function postJoin(req, res) {
  try {
    const project = await joinProjectWithToken(req.user.id, req.body.token);
    return ok(res, { project: project.toPublicJSON() });
  } catch (e) {
    return fail(res, e.message, e.status || 500);
  }
}
