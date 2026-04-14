import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [inviteToken, setInviteToken] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/projects');
      if (!data.success) throw new Error(data.error);
      setProjects(data.data.projects);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createProject(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const { data } = await api.post('/api/projects', { name, description });
      if (!data.success) throw new Error(data.error);
      setName('');
      setDescription('');
      await load();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setCreating(false);
    }
  }

  async function joinProject(e) {
    e.preventDefault();
    setJoinBusy(true);
    setError('');
    try {
      const { data } = await api.post('/api/projects/join', { token: inviteToken.trim() });
      if (!data.success) throw new Error(data.error);
      setInviteToken('');
      await load();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setJoinBusy(false);
    }
  }

  return (
    <div className="stack">
      <h1>Projects</h1>
      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error">{error}</p>}

      <div className="card stack">
        <h2>New project</h2>
        <form className="stack" onSubmit={createProject}>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </label>
          <button className="btn" type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>
      </div>

      <div className="card stack">
        <h2>Join with invite</h2>
        <form className="stack" onSubmit={joinProject}>
          <label>
            Invite token
            <input value={inviteToken} onChange={(e) => setInviteToken(e.target.value)} required />
          </label>
          <button className="btn secondary" type="submit" disabled={joinBusy}>
            {joinBusy ? 'Joining…' : 'Join project'}
          </button>
        </form>
      </div>

      <div className="card stack">
        <h2>Your projects</h2>
        {projects.length === 0 && !loading && <p className="muted">No projects yet.</p>}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {projects.map((p) => (
            <li key={p.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
              <Link to={`/projects/${p.id}`}>{p.name}</Link>
              <span className="muted" style={{ marginLeft: 8 }}>
                {p.description}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
