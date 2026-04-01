'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch, getToken } from '../../lib/api';
import AdminNav from '../AdminNav';

const TABS = ['projects', 'logs'];

export default function DeveloperPage() {
  const router = useRouter();
  const [tab, setTab]             = useState('projects');
  const [projects, setProjects]   = useState([]);
  const [logs, setLogs]           = useState([]);
  const [logStats, setLogStats]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // Project form
  const [showNewProject, setShowNewProject]   = useState(false);
  const [newProjectName, setNewProjectName]   = useState('');
  const [newProjectDesc, setNewProjectDesc]   = useState('');
  const [creating, setCreating]               = useState(false);

  // Key management
  const [expandedProject, setExpandedProject] = useState(null);
  const [projectKeys, setProjectKeys]          = useState({});
  const [newKeyName, setNewKeyName]            = useState('');
  const [newKeyEnv, setNewKeyEnv]              = useState('live');
  const [creatingKey, setCreatingKey]          = useState(false);
  const [revealedKey, setRevealedKey]          = useState(null); // { projectId, key }

  // Log filters
  const [logProject, setLogProject]  = useState('');
  const [logAction, setLogAction]    = useState('');

  const loadProjects = useCallback(async () => {
    const res = await authFetch('/api/v1/projects');
    if (!res.ok) { setError('Failed to load projects'); return; }
    const data = await res.json();
    setProjects(data.projects || []);
  }, []);

  const loadLogs = useCallback(async () => {
    const params = new URLSearchParams();
    if (logProject) params.set('project_id', logProject);
    if (logAction)  params.set('action', logAction);
    params.set('limit', '100');
    const res = await authFetch(`/api/v1/logs?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    setLogs(data.logs || []);
    setLogStats(data.stats || null);
  }, [logProject, logAction]);

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    Promise.all([loadProjects()]).finally(() => setLoading(false));
  }, [loadProjects, router]);

  useEffect(() => {
    if (tab === 'logs') loadLogs();
  }, [tab, loadLogs]);

  async function createProject(e) {
    e.preventDefault();
    setCreating(true);
    const res = await authFetch('/api/v1/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newProjectName, description: newProjectDesc }),
    });
    setCreating(false);
    if (res.ok) {
      setNewProjectName(''); setNewProjectDesc(''); setShowNewProject(false);
      loadProjects();
    }
  }

  async function deleteProject(id) {
    if (!confirm('Delete this project and all its API keys?')) return;
    await authFetch(`/api/v1/projects?id=${id}`, { method: 'DELETE' });
    loadProjects();
  }

  async function loadKeys(projectId) {
    if (expandedProject === projectId) { setExpandedProject(null); return; }
    setExpandedProject(projectId);
    const res = await authFetch(`/api/v1/keys?project_id=${projectId}`);
    if (res.ok) {
      const data = await res.json();
      setProjectKeys(prev => ({ ...prev, [projectId]: data.keys || [] }));
    }
  }

  async function createKey(projectId) {
    setCreatingKey(true);
    const res = await authFetch('/api/v1/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, name: newKeyName, env: newKeyEnv }),
    });
    setCreatingKey(false);
    if (res.ok) {
      const data = await res.json();
      setRevealedKey({ projectId, key: data.key, name: data.name });
      setNewKeyName('');
      loadKeys(projectId);
    }
  }

  async function revokeKey(keyId, projectId) {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    await authFetch(`/api/v1/keys?id=${keyId}`, { method: 'DELETE' });
    const res = await authFetch(`/api/v1/keys?project_id=${projectId}`);
    if (res.ok) {
      const data = await res.json();
      setProjectKeys(prev => ({ ...prev, [projectId]: data.keys || [] }));
    }
  }

  async function testWebhook(projectId) {
    const res = await authFetch('/api/v1/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId }),
    });
    const data = await res.json();
    alert(data.success ? '✅ Test event delivered!' : `❌ Failed: ${data.error || data.message}`);
  }

  const actionBadge = (action) => {
    const colors = { ALLOW: '#10b981', WARN: '#f59e0b', BLOCK: '#ef4444' };
    return (
      <span style={{ background: colors[action] || '#6b7280', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
        {action}
      </span>
    );
  };

  if (loading) return (
    <div>
      <AdminNav active="Developer" />
      <div className="page-container"><p style={{ color: 'var(--muted)' }}>Loading...</p></div>
    </div>
  );

  return (
    <div>
    <AdminNav active="Developer" />
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Developer</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>
            API keys, projects, proxy logs, and integrations
          </p>
        </div>
        <a href="/developer/docs" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>
          API Docs →
        </a>
      </div>

      {/* Quick start callout */}
      <div className="card" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 13 }}>
          <strong>One-line integration:</strong>{' '}
          <code style={{ background: '#e0f2fe', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>
            openai.baseURL = &quot;{process.env.NEXT_PUBLIC_BASE_URL || 'https://app.promptfence.ai'}/api/v1/proxy/openai&quot;
          </code>{' '}
          — PromptFence scans prompts before they reach OpenAI.
        </p>
      </div>

      {error && <div className="status-error">{error}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: tab === t ? 600 : 400,
            color: tab === t ? 'var(--primary)' : 'var(--muted)',
            borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t === 'projects' ? 'Projects & Keys' : 'Proxy Logs'}
          </button>
        ))}
      </div>

      {/* ── PROJECTS TAB ── */}
      {tab === 'projects' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Projects ({projects.length})</h2>
            <button className="btn btn-primary" onClick={() => setShowNewProject(v => !v)}>
              {showNewProject ? 'Cancel' : '+ New Project'}
            </button>
          </div>

          {showNewProject && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Create Project</h3>
              <form onSubmit={createProject} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Project name *</label>
                  <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                    placeholder="e.g. Customer Support Bot" required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Description</label>
                  <input value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)}
                    placeholder="Optional — what does this project do?" />
                </div>
                <button type="submit" className="btn btn-primary" disabled={creating} style={{ alignSelf: 'flex-start' }}>
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </form>
            </div>
          )}

          {projects.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
              <p style={{ fontSize: 24, marginBottom: 8 }}>🔧</p>
              <p>No projects yet. Create one to get your first API key.</p>
            </div>
          ) : (
            projects.map(project => (
              <div key={project.id} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>{project.name}</h3>
                    {project.description && <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 8px' }}>{project.description}</p>}
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--muted)' }}>
                      <span>{project.active_key_count} active key{project.active_key_count !== 1 ? 's' : ''}</span>
                      <span>{project.total_calls.toLocaleString()} total calls</span>
                      <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn"
                      onClick={() => loadKeys(project.id)}
                      style={{ fontSize: 13 }}
                    >
                      {expandedProject === project.id ? 'Hide Keys ↑' : 'Manage Keys ↓'}
                    </button>
                    <button
                      onClick={() => deleteProject(project.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13 }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Keys panel */}
                {expandedProject === project.id && (
                  <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>

                    {/* Revealed key banner */}
                    {revealedKey?.projectId === project.id && (
                      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#15803d', margin: '0 0 6px' }}>
                          ✅ API key created — save it now, it won&apos;t be shown again
                        </p>
                        <code style={{ fontSize: 12, background: '#dcfce7', padding: '6px 10px', borderRadius: 4, display: 'block', wordBreak: 'break-all' }}>
                          {revealedKey.key}
                        </code>
                        <button
                          onClick={() => { navigator.clipboard.writeText(revealedKey.key); }}
                          style={{ marginTop: 6, fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#15803d', textDecoration: 'underline' }}
                        >
                          Copy to clipboard
                        </button>
                        <button
                          onClick={() => setRevealedKey(null)}
                          style={{ marginTop: 6, marginLeft: 12, fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
                        >
                          Dismiss
                        </button>
                      </div>
                    )}

                    {/* Create key form */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'flex-end' }}>
                      <div className="form-group" style={{ margin: 0, flex: 1 }}>
                        <label style={{ fontSize: 12 }}>Key name</label>
                        <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                          placeholder="e.g. Production" style={{ fontSize: 13 }} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: 12 }}>Environment</label>
                        <select value={newKeyEnv} onChange={e => setNewKeyEnv(e.target.value)}
                          style={{ fontSize: 13, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6 }}>
                          <option value="live">Live</option>
                          <option value="test">Test</option>
                        </select>
                      </div>
                      <button
                        className="btn btn-primary"
                        onClick={() => createKey(project.id)}
                        disabled={creatingKey || !newKeyName.trim()}
                        style={{ fontSize: 13, whiteSpace: 'nowrap' }}
                      >
                        {creatingKey ? 'Creating...' : '+ Create Key'}
                      </button>
                    </div>

                    {/* Keys list */}
                    {(projectKeys[project.id] || []).length === 0 ? (
                      <p style={{ fontSize: 13, color: 'var(--muted)' }}>No API keys yet.</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            {['Name', 'Key', 'Env', 'Calls (month)', 'Last used', 'Status', ''].map(h => (
                              <th key={h} style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--muted)', fontWeight: 500, fontSize: 12 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(projectKeys[project.id] || []).map(k => (
                            <tr key={k.id} style={{ borderBottom: '1px solid var(--border)', opacity: k.revoked_at ? 0.5 : 1 }}>
                              <td style={{ padding: '8px' }}>{k.name}</td>
                              <td style={{ padding: '8px' }}>
                                <code style={{ fontSize: 11, background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>
                                  {k.key_prefix || k.key_preview}
                                </code>
                              </td>
                              <td style={{ padding: '8px' }}>
                                <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4,
                                  background: k.env === 'live' ? '#fef3c7' : '#e0e7ff',
                                  color: k.env === 'live' ? '#92400e' : '#3730a3' }}>
                                  {k.env}
                                </span>
                              </td>
                              <td style={{ padding: '8px' }}>{k.calls_this_month.toLocaleString()}</td>
                              <td style={{ padding: '8px', color: 'var(--muted)' }}>
                                {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                              </td>
                              <td style={{ padding: '8px' }}>
                                <span style={{ fontSize: 11, color: k.revoked_at ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                                  {k.revoked_at ? 'Revoked' : 'Active'}
                                </span>
                              </td>
                              <td style={{ padding: '8px' }}>
                                {!k.revoked_at && (
                                  <button onClick={() => revokeKey(k.id, project.id)}
                                    style={{ fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                                    Revoke
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {/* Webhook config */}
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Webhook</span>
                        {project.webhook_url && (
                          <button onClick={() => testWebhook(project.id)}
                            style={{ fontSize: 12, background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}>
                            Test
                          </button>
                        )}
                      </div>
                      {project.webhook_url ? (
                        <code style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginTop: 4 }}>{project.webhook_url}</code>
                      ) : (
                        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>No webhook configured</p>
                      )}
                    </div>

                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── LOGS TAB ── */}
      {tab === 'logs' && (
        <div>
          {/* Stats */}
          {logStats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total Calls', value: logStats.total_calls?.toLocaleString() },
                { label: 'Allowed',     value: logStats.allowed?.toLocaleString(), color: '#10b981' },
                { label: 'Warned',      value: logStats.warned?.toLocaleString(),  color: '#f59e0b' },
                { label: 'Blocked',     value: logStats.blocked?.toLocaleString(), color: '#ef4444' },
                { label: 'Block Rate',  value: logStats.block_rate },
                { label: 'Avg Latency', value: logStats.avg_latency_ms ? `${logStats.avg_latency_ms}ms` : '—' },
              ].map(s => (
                <div key={s.label} className="card" style={{ textAlign: 'center', padding: 12 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color || 'inherit' }}>{s.value ?? '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <select value={logProject} onChange={e => setLogProject(e.target.value)}
              style={{ fontSize: 13, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, background: '#fff' }}>
              <option value="">All projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={logAction} onChange={e => setLogAction(e.target.value)}
              style={{ fontSize: 13, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, background: '#fff' }}>
              <option value="">All actions</option>
              <option value="ALLOW">Allow</option>
              <option value="WARN">Warn</option>
              <option value="BLOCK">Block</option>
            </select>
            <button className="btn" onClick={loadLogs} style={{ fontSize: 13 }}>Refresh</button>
          </div>

          {logs.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
              <p style={{ fontSize: 24, marginBottom: 8 }}>📋</p>
              <p>No logs yet. Make your first API call to see data here.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                    {['Time', 'Project', 'Provider', 'Model', 'Action', 'Detected Types', 'Tokens', 'Latency'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--muted)', fontWeight: 500, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                        <br />
                        <span style={{ fontSize: 11 }}>{new Date(log.timestamp).toLocaleDateString()}</span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>{log.project_name}</td>
                      <td style={{ padding: '8px 12px', textTransform: 'capitalize' }}>{log.provider}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--muted)', fontSize: 12 }}>{log.model || '—'}</td>
                      <td style={{ padding: '8px 12px' }}>{actionBadge(log.action)}</td>
                      <td style={{ padding: '8px 12px' }}>
                        {log.detected_types.length > 0
                          ? log.detected_types.map(t => (
                            <span key={t} style={{ fontSize: 11, background: 'var(--bg)', border: '1px solid var(--border)',
                              borderRadius: 4, padding: '1px 5px', marginRight: 3 }}>{t}</span>
                          ))
                          : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                        }
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--muted)', fontSize: 12 }}>
                        {log.prompt_tokens ? log.prompt_tokens.toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--muted)', fontSize: 12 }}>
                        {log.latency_ms ? `${log.latency_ms}ms` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
    </div>
  );
}
