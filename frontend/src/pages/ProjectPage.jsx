import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { connectSocket } from '../socket.js';

const STATUSES = ['Pending', 'Running', 'Completed', 'Failed', 'Blocked'];

export default function ProjectPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(null);
  const [execResult, setExecResult] = useState(null);
  const [simResult, setSimResult] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 3,
    estimatedHours: 1,
    resourceTag: 'default',
    maxRetries: 0,
    dependencies: '',
  });

  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pRes, tRes] = await Promise.all([
        api.get(`/api/projects/${projectId}`),
        api.get(`/api/projects/${projectId}/tasks`),
      ]);
      if (!pRes.data.success) throw new Error(pRes.data.error);
      if (!tRes.data.success) throw new Error(tRes.data.error);
      const proj = pRes.data.data.project;
      setProject(proj);
      setTasks(tRes.data.data.tasks);
      setWebhookEnabled(proj.webhookEnabled);
      setWebhookUrl(proj.webhookUrl || '');
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return undefined;
    socket.emit('project:join', projectId);
    const onCreated = (payload) => {
      setTasks((prev) => [...prev, payload.task]);
    };
    const onUpdated = (payload) => {
      setTasks((prev) => prev.map((t) => (t.id === payload.task.id ? payload.task : t)));
    };
    socket.on('task:created', onCreated);
    socket.on('task:updated', onUpdated);
    socket.on('task:status', onUpdated);
    socket.on('task:retry', onUpdated);
    return () => {
      socket.emit('project:leave', projectId);
      socket.off('task:created', onCreated);
      socket.off('task:updated', onUpdated);
      socket.off('task:status', onUpdated);
      socket.off('task:retry', onUpdated);
      socket.disconnect();
    };
  }, [projectId]);

  async function createTask(e) {
    e.preventDefault();
    setError('');
    setConflict(null);
    const deps = form.dependencies
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const { data } = await api.post(`/api/projects/${projectId}/tasks`, {
        title: form.title,
        description: form.description,
        priority: Number(form.priority),
        estimatedHours: Number(form.estimatedHours),
        resourceTag: form.resourceTag,
        maxRetries: Number(form.maxRetries),
        dependencies: deps,
      });
      if (!data.success) throw new Error(data.error);
      setForm((f) => ({ ...f, title: '', description: '', dependencies: '' }));
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!edit) return;
    setError('');
    setConflict(null);
    const deps = edit.dependencies
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const { data } = await api.patch(`/api/projects/${projectId}/tasks/${edit.id}`, {
        versionNumber: edit.versionNumber,
        title: edit.title,
        description: edit.description,
        priority: Number(edit.priority),
        estimatedHours: Number(edit.estimatedHours),
        status: edit.status,
        resourceTag: edit.resourceTag,
        maxRetries: Number(edit.maxRetries),
        dependencies: deps,
      });
      if (data.success) {
        setTasks((prev) => prev.map((t) => (t.id === data.data.task.id ? data.data.task : t)));
        setEdit(null);
      }
    } catch (e) {
      if (e.response?.status === 409) {
        const latest = e.response.data.latest;
        setConflict({ message: e.response.data.error, latest });
        if (latest) {
          setEdit((ed) =>
            ed && ed.id === latest.id
              ? {
                  ...ed,
                  ...latest,
                  dependencies: (latest.dependencies || []).join(', '),
                  versionNumber: latest.versionNumber,
                }
              : ed
          );
          setTasks((prev) => prev.map((t) => (t.id === latest.id ? latest : t)));
        }
      } else {
        setError(e.response?.data?.error || e.message);
      }
    }
  }

  async function retryTask(task) {
    setError('');
    setConflict(null);
    try {
      const { data } = await api.post(`/api/projects/${projectId}/tasks/${task.id}/retry`, {
        versionNumber: task.versionNumber,
      });
      if (data.success) {
        setTasks((prev) => prev.map((t) => (t.id === data.data.task.id ? data.data.task : t)));
      }
    } catch (e) {
      if (e.response?.status === 409) {
        const latest = e.response.data.latest;
        setConflict({ message: e.response.data.error, latest });
        if (latest) setTasks((prev) => prev.map((t) => (t.id === latest.id ? latest : t)));
      } else {
        setError(e.response?.data?.error || e.message);
      }
    }
  }

  async function runExecution() {
    setError('');
    try {
      const { data } = await api.post(`/api/projects/${projectId}/compute-execution`);
      if (!data.success) throw new Error(data.error);
      setExecResult(data.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }

  async function runSimulation(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const availableHours = Number(fd.get('availableHours'));
    const failedRaw = fd.get('failedTaskIds') || '';
    const failedTaskIds = failedRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setError('');
    try {
      const { data } = await api.post(`/api/projects/${projectId}/simulate`, {
        availableHours,
        failedTaskIds,
      });
      if (!data.success) throw new Error(data.error);
      setSimResult(data.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }

  async function saveWebhook(e) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.patch(`/api/projects/${projectId}/webhook`, {
        webhookUrl,
        webhookEnabled,
      });
      if (!data.success) throw new Error(data.error);
      setProject(data.data.project);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }

  async function copyInvite() {
    setError('');
    try {
      const { data } = await api.post(`/api/projects/${projectId}/invite`);
      if (!data.success) throw new Error(data.error);
      await navigator.clipboard.writeText(data.data.inviteToken);
      alert('Invite token copied (expires in 30 minutes).');
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }

  const taskById = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks]);

  if (loading && !project) return <p className="muted layout">Loading…</p>;

  return (
    <div className="stack">
      <p>
        <Link to="/">← Back</Link>
      </p>
      <h1>{project?.name || 'Project'}</h1>
      {error && <p className="error">{error}</p>}
      {conflict && (
        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <strong>Conflict:</strong> {conflict.message} — data was refreshed. Review and save again.
        </div>
      )}

      <div className="row">
        <button type="button" className="btn secondary" onClick={copyInvite}>
          Copy invite token
        </button>
        <button type="button" className="btn secondary" onClick={load}>
          Refresh tasks
        </button>
      </div>

      <div className="card stack">
        <h2>Webhook (task completion)</h2>
        <form className="stack" onSubmit={saveWebhook}>
          <label>
            Webhook URL
            <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://…" />
          </label>
          <label className="row" style={{ alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={webhookEnabled}
              onChange={(e) => setWebhookEnabled(e.target.checked)}
            />
            Enabled
          </label>
          <button className="btn" type="submit">
            Save webhook
          </button>
        </form>
      </div>

      <div className="card stack">
        <h2>Execution plan</h2>
        <button type="button" className="btn" onClick={runExecution}>
          Compute execution order
        </button>
        {execResult && (
          <div className="muted stack">
            <div>
              <strong>Order:</strong> {execResult.executionOrder?.join(', ') || '—'}
            </div>
            <div>
              <strong>Ready now:</strong> {execResult.readyTasks?.join(', ') || '—'}
            </div>
          </div>
        )}
      </div>

      <div className="card stack">
        <h2>Simulation</h2>
        <form className="stack" onSubmit={runSimulation}>
          <label>
            Available hours
            <input name="availableHours" type="number" min={0} step={0.5} defaultValue={8} required />
          </label>
          <label>
            Failed task IDs (comma-separated, optional)
            <input name="failedTaskIds" placeholder="id1, id2" />
          </label>
          <button className="btn secondary" type="submit">
            Run simulation
          </button>
        </form>
        {simResult && (
          <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: '1rem', borderRadius: 8, overflow: 'auto' }}>
            {JSON.stringify(simResult, null, 2)}
          </pre>
        )}
      </div>

      <div className="card stack">
        <h2>Dependency map</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {tasks.map((t) => (
            <li key={t.id} style={{ marginBottom: '0.5rem' }}>
              <strong>{t.title}</strong>{' '}
              <span className="muted">
                → depends on:{' '}
                {(t.dependencies || []).length ? t.dependencies.map((id) => taskById[id]?.title || id).join(', ') : 'none'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card stack">
        <h2>New task</h2>
        <form className="stack" onSubmit={createTask}>
          <label>
            Title
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </label>
          <label>
            Description
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </label>
          <div className="row">
            <label>
              Priority (1–5)
              <input
                type="number"
                min={1}
                max={5}
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              />
            </label>
            <label>
              Est. hours
              <input
                type="number"
                min={0}
                step={0.25}
                value={form.estimatedHours}
                onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
              />
            </label>
            <label>
              Resource tag
              <input value={form.resourceTag} onChange={(e) => setForm({ ...form, resourceTag: e.target.value })} />
            </label>
            <label>
              Max retries
              <input
                type="number"
                min={0}
                value={form.maxRetries}
                onChange={(e) => setForm({ ...form, maxRetries: e.target.value })}
              />
            </label>
          </div>
          <label>
            Dependencies (task IDs, comma-separated)
            <input
              value={form.dependencies}
              onChange={(e) => setForm({ ...form, dependencies: e.target.value })}
              placeholder="optional"
            />
          </label>
          <button className="btn" type="submit">
            Create task
          </button>
        </form>
      </div>

      <div className="card stack">
        <h2>Tasks</h2>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>P</th>
                <th>Hrs</th>
                <th>Res</th>
                <th>Retry</th>
                <th>Ver</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td>{t.title}</td>
                  <td>{t.status}</td>
                  <td>{t.priority}</td>
                  <td>{t.estimatedHours}</td>
                  <td>{t.resourceTag}</td>
                  <td>
                    {t.retryCount}/{t.maxRetries}
                  </td>
                  <td>{t.versionNumber}</td>
                  <td>
                    <button type="button" className="btn secondary" onClick={() => setEdit({ ...t, dependencies: (t.dependencies || []).join(', ') })}>
                      Edit
                    </button>{' '}
                    {t.status === 'Failed' && t.retryCount < t.maxRetries && (
                      <button type="button" className="btn" onClick={() => retryTask(t)}>
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <div className="card stack" style={{ position: 'sticky', bottom: 0, border: '2px solid #2563eb' }}>
          <h3>Edit task</h3>
          <form className="stack" onSubmit={saveEdit}>
            <label>
              Title
              <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} required />
            </label>
            <label>
              Description
              <textarea value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} rows={2} />
            </label>
            <label>
              Status
              <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <div className="row">
              <label>
                Priority
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={edit.priority}
                  onChange={(e) => setEdit({ ...edit, priority: e.target.value })}
                />
              </label>
              <label>
                Est. hours
                <input
                  type="number"
                  min={0}
                  step={0.25}
                  value={edit.estimatedHours}
                  onChange={(e) => setEdit({ ...edit, estimatedHours: e.target.value })}
                />
              </label>
              <label>
                Resource
                <input value={edit.resourceTag} onChange={(e) => setEdit({ ...edit, resourceTag: e.target.value })} />
              </label>
              <label>
                Max retries
                <input
                  type="number"
                  min={0}
                  value={edit.maxRetries}
                  onChange={(e) => setEdit({ ...edit, maxRetries: e.target.value })}
                />
              </label>
            </div>
            <label>
              Dependencies (IDs)
              <input value={edit.dependencies} onChange={(e) => setEdit({ ...edit, dependencies: e.target.value })} />
            </label>
            <p className="muted">Version for optimistic lock: {edit.versionNumber}</p>
            <div className="row">
              <button className="btn" type="submit">
                Save
              </button>
              <button type="button" className="btn secondary" onClick={() => setEdit(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
