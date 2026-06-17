import React, { useEffect, useState, useCallback } from 'react';

interface Pool {
  id: string;
  name: string;
  url: string;
  algo: string;
  coin: string;
  fee: string;
  region: string;
  tls_url: string | null;
  notes: string;
  preset: boolean;
  priority: number;
  active: boolean;
  in_failover: boolean;
}

interface PoolState {
  active_pool_id: string;
  failover_order: string[];
  use_tls: boolean;
  pools: Pool[];
}

interface TestResult {
  reachable: boolean;
  latency_ms: number | null;
  error: string | null;
}

const API = '/api/mining/pools';

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  return r.json();
}

function LatencyBadge({ result }: { result: TestResult | null }) {
  if (!result) return <span className="badge badge--muted">—</span>;
  if (!result.reachable) return <span className="badge badge--offline" title={result.error || 'unreachable'}>✗ Unreachable</span>;
  return <span className="badge badge--online">✓ {result.latency_ms}ms</span>;
}

export default function PoolSelector() {
  const [state, setState] = useState<PoolState | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customForm, setCustomForm] = useState({ id: '', name: '', url: '', algo: 'skein', coin: 'DGB', fee: '', region: '', notes: '' });

  const load = useCallback(async () => {
    const data = await apiFetch('/');
    setState(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setActive = async (pool_id: string) => {
    const data = await apiFetch('/active', { method: 'POST', body: JSON.stringify({ pool_id }) });
    if (data.error) return setStatus(`❌ ${data.error}`);
    setStatus(`✅ Active pool set to: ${pool_id}`);
    load();
  };

  const testPool = async (pool: Pool) => {
    setTesting(t => ({ ...t, [pool.id]: true }));
    const data = await apiFetch('/test', { method: 'POST', body: JSON.stringify({ pool_id: pool.id }) });
    setTestResults(r => ({ ...r, [pool.id]: data }));
    setTesting(t => ({ ...t, [pool.id]: false }));
  };

  const testAll = async () => {
    if (!state) return;
    setStatus('Testing all pools...');
    await Promise.all(state.pools.map(p => testPool(p)));
    setStatus('All pools tested.');
  };

  const addCustom = async () => {
    const data = await apiFetch('/custom', { method: 'POST', body: JSON.stringify(customForm) });
    if (data.error) return setStatus(`❌ ${data.error}`);
    setStatus('✅ Custom pool added');
    setShowCustom(false);
    setCustomForm({ id: '', name: '', url: '', algo: 'skein', coin: 'DGB', fee: '', region: '', notes: '' });
    load();
  };

  const removeCustom = async (id: string) => {
    if (!confirm(`Remove custom pool "${id}"?`)) return;
    const data = await apiFetch(`/custom/${id}`, { method: 'DELETE' });
    if (data.error) return setStatus(`❌ ${data.error}`);
    setStatus('✅ Custom pool removed');
    load();
  };

  if (!state) return <div className="panel"><p>Loading pools...</p></div>;

  const preset  = state.pools.filter(p => p.preset);
  const customs = state.pools.filter(p => !p.preset);

  return (
    <div className="pool-selector">
      <div className="pool-selector__header">
        <h2>⛏ Pool Selector</h2>
        <div className="pool-selector__actions">
          <button className="btn btn--sm" onClick={testAll}>Test All Pools</button>
          <button className="btn btn--sm btn--primary" onClick={() => setShowCustom(s => !s)}>{showCustom ? 'Cancel' : '+ Add Custom Pool'}</button>
        </div>
      </div>

      {status && <div className="pool-status">{status}</div>}

      <div className="pool-active-banner">
        <label>Active Pool</label>
        <strong>{state.pools.find(p => p.id === state.active_pool_id)?.name ?? state.active_pool_id}</strong>
      </div>

      <h3 className="pool-section-label">Fennac + Pre-Configured DGB Skein Pools</h3>
      <div className="pool-table-wrap">
        <table className="pool-table">
          <thead>
            <tr>
              <th></th>
              <th>Pool</th>
              <th>URL</th>
              <th>Fee</th>
              <th>Region</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {preset.map(pool => (
              <tr key={pool.id} className={pool.active ? 'pool-row pool-row--active' : 'pool-row'}>
                <td>{pool.active ? <span className="badge badge--active">● Active</span> : null}</td>
                <td>
                  <strong>{pool.name}</strong>
                  {pool.tls_url && <span className="badge badge--tls">TLS</span>}
                  <div className="pool-notes">{pool.notes}</div>
                </td>
                <td><code className="pool-url">{pool.url}</code></td>
                <td>{pool.fee}</td>
                <td>{pool.region}</td>
                <td><LatencyBadge result={testResults[pool.id] ?? null} /></td>
                <td>
                  <div className="pool-actions">
                    <button className="btn btn--sm" onClick={() => testPool(pool)} disabled={!!testing[pool.id]}>{testing[pool.id] ? 'Testing...' : 'Test'}</button>
                    {!pool.active && <button className="btn btn--sm btn--primary" onClick={() => setActive(pool.id)}>Set Active</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {customs.length > 0 && (
        <>
          <h3 className="pool-section-label">Custom Pools</h3>
          <div className="pool-table-wrap">
            <table className="pool-table">
              <thead><tr><th></th><th>Pool</th><th>URL</th><th>Fee</th><th>Region</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {customs.map(pool => (
                  <tr key={pool.id} className={pool.active ? 'pool-row pool-row--active' : 'pool-row'}>
                    <td>{pool.active ? <span className="badge badge--active">● Active</span> : null}</td>
                    <td><strong>{pool.name}</strong><div className="pool-notes">{pool.notes}</div></td>
                    <td><code className="pool-url">{pool.url}</code></td>
                    <td>{pool.fee}</td>
                    <td>{pool.region}</td>
                    <td><LatencyBadge result={testResults[pool.id] ?? null} /></td>
                    <td>
                      <div className="pool-actions">
                        <button className="btn btn--sm" onClick={() => testPool(pool)} disabled={!!testing[pool.id]}>{testing[pool.id] ? 'Testing...' : 'Test'}</button>
                        {!pool.active && <button className="btn btn--sm btn--primary" onClick={() => setActive(pool.id)}>Set Active</button>}
                        <button className="btn btn--sm btn--danger" onClick={() => removeCustom(pool.id)}>Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showCustom && (
        <div className="panel pool-custom-form">
          <h3>Add Custom Pool</h3>
          <div className="form-grid">
            {['id','name','url','fee','region','notes'].map(field => (
              <div key={field}>
                <label>{field}</label>
                <input className="input" value={(customForm as any)[field]} onChange={e => setCustomForm(f => ({ ...f, [field]: e.target.value }))} placeholder={field} />
              </div>
            ))}
            <div>
              <label>algo</label>
              <select className="input" value={customForm.algo} onChange={e => setCustomForm(f => ({ ...f, algo: e.target.value }))}>
                <option value="skein">Skein</option>
                <option value="sha256d">SHA256d</option>
                <option value="scrypt">Scrypt</option>
                <option value="odocrypt">Odocrypt</option>
              </select>
            </div>
            <div>
              <label>coin</label>
              <input className="input" value={customForm.coin} onChange={e => setCustomForm(f => ({ ...f, coin: e.target.value }))} placeholder="DGB" />
            </div>
          </div>
          <div className="pool-actions" style={{ marginTop: 12 }}>
            <button className="btn btn--sm" onClick={() => setShowCustom(false)}>Cancel</button>
            <button className="btn btn--sm btn--primary" onClick={addCustom}>Add Pool</button>
          </div>
        </div>
      )}
    </div>
  );
}
