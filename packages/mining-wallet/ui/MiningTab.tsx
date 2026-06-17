import React, { useEffect, useState, useCallback } from 'react';

interface MinerStats { accepted: number; rejected: number; hashrate_h: number; uptime_s: number; }
interface PayoutConfig { mode: 'dgb_integrated'|'dgb_external'|'solana'|'custom'; dgb_address: string|null; solana_address: string|null; custom_address: string|null; custom_coin: string|null; }
interface ASICDevice { name: string; algo: string; hashrate?: number; accepted?: number; rejected?: number; source: string; device?: string; }
interface PoolUrl { url: string; region: string; tls: boolean; }
interface Pool { id: string; name: string; algo: string; coin: string; primary: boolean; urls: PoolUrl[]; fee: string; pplns: boolean|null; minPayout: string; notes: string; }
interface ActivePool { pool_id: string; url: string; worker: string; password: string; updated: string; }
interface MiningStatus {
  miners: { fennac: MinerStats|null; dgb_skein: MinerStats|null };
  payout: { coin: string; address: string; source: string }|null;
  asics: number;
  wallet: string|null;
  pool: { id: string; url: string }|null;
}
interface UnlockedWallet { address: string; publicKey: string; privateKeyMasked: string; derivation: string; created: string; unlocked: boolean; }

function formatHashrate(h: number): string {
  if (h >= 1_000_000) return `${(h/1_000_000).toFixed(2)} MH/s`;
  if (h >= 1_000)     return `${(h/1_000).toFixed(2)} KH/s`;
  return `${h.toFixed(0)} H/s`;
}
function formatUptime(s: number): string {
  return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
}

const API = '/api/mining';
async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return r.json();
}

function MinerCard({ label, stats }: { label: string; stats: MinerStats|null }) {
  if (!stats) return <div className="miner-card miner-card--offline"><h3>{label}</h3><span className="badge badge--offline">OFFLINE</span></div>;
  return (
    <div className="miner-card miner-card--online">
      <h3>{label} <span className="badge badge--online">ONLINE</span></h3>
      <div className="stat-grid">
        <div><label>Hashrate</label><value>{formatHashrate(stats.hashrate_h)}</value></div>
        <div><label>Accepted</label><value>{stats.accepted}</value></div>
        <div><label>Rejected</label><value>{stats.rejected}</value></div>
        <div><label>Uptime</label><value>{formatUptime(stats.uptime_s)}</value></div>
      </div>
    </div>
  );
}

function UnlockWalletModal({ open, onClose, onUnlocked }: { open: boolean; onClose: () => void; onUnlocked: (w: UnlockedWallet) => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  if (!open) return null;
  const unlock = async () => {
    setLoading(true); setError(null);
    const data = await apiFetch('/wallet/unlock', { method: 'POST', body: JSON.stringify({ pin }) });
    setLoading(false);
    if (data.error) return setError(data.error);
    onUnlocked(data); setPin(''); onClose();
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>🔐 Unlock DGB Wallet</h3>
        <p>Enter your PIN to view wallet metadata.</p>
        <input type="password" className="input" placeholder="Wallet PIN" value={pin}
          onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && unlock()} />
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button className="btn btn--sm" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={unlock} disabled={loading}>{loading ? 'Unlocking…' : 'Unlock'}</button>
        </div>
      </div>
    </div>
  );
}

function WalletPanel() {
  const [wallet, setWallet] = useState<{ exists: boolean; address?: string; balance_dgb?: number|null }|null>(null);
  const [pin, setPin] = useState(''); const [mnemonic, setMnemonic] = useState<string|null>(null);
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string|null>(null);
  const [unlockOpen, setUnlockOpen] = useState(false); const [unlockedWallet, setUnlockedWallet] = useState<UnlockedWallet|null>(null);
  const loadWallet = useCallback(async () => setWallet(await apiFetch('/wallet')), []);
  useEffect(() => { loadWallet(); }, [loadWallet]);
  const createWallet = async () => {
    if (pin.length < 6) return setError('PIN must be 6+ characters');
    setLoading(true); setError(null);
    const data = await apiFetch('/wallet/create', { method: 'POST', body: JSON.stringify({ pin }) });
    setLoading(false);
    if (data.error) return setError(data.error);
    setMnemonic(data.mnemonic); setPin(''); loadWallet();
  };
  return (
    <div className="panel panel--wallet">
      <h2>💳 Integrated DGB Wallet</h2>
      {wallet?.exists ? (
        <div>
          <div className="wallet-address"><label>DGB Address</label><code>{wallet.address}</code></div>
          {wallet.balance_dgb != null && <div className="wallet-balance"><label>Balance</label><value>{wallet.balance_dgb?.toFixed(8)} DGB</value></div>}
          <div className="wallet-actions">
            <button onClick={loadWallet} className="btn btn--sm">Refresh Balance</button>
            <button onClick={() => setUnlockOpen(true)} className="btn btn--primary btn--sm">🔐 Unlock Wallet</button>
            {unlockedWallet && <button onClick={() => setUnlockedWallet(null)} className="btn btn--sm btn--danger">Lock</button>}
          </div>
          {unlockedWallet && (
            <div className="wallet-unlocked">
              <h4>Unlocked Wallet Metadata</h4>
              <div><label>Public Key</label><code>{unlockedWallet.publicKey}</code></div>
              <div><label>Private Key (masked)</label><code>{unlockedWallet.privateKeyMasked}</code></div>
              <div><label>Derivation</label><code>{unlockedWallet.derivation}</code></div>
              <div><label>Created</label><code>{new Date(unlockedWallet.created).toLocaleString()}</code></div>
            </div>
          )}
        </div>
      ) : (
        <div className="wallet-create">
          <p>No wallet found. Create an integrated DGB wallet to receive mining payouts.</p>
          <input type="password" placeholder="Set wallet PIN (6+ chars)" value={pin} onChange={e => setPin(e.target.value)} className="input" />
          <button onClick={createWallet} disabled={loading} className="btn btn--primary">{loading ? 'Creating…' : 'Create Wallet'}</button>
          {error && <div className="error">{error}</div>}
        </div>
      )}
      {mnemonic && (
        <div className="mnemonic-warning">
          <h4>⚠️ Save Your Recovery Phrase — Shown Once</h4>
          <code className="mnemonic">{mnemonic}</code>
          <button onClick={() => setMnemonic(null)} className="btn btn--sm btn--danger">I've saved it — hide</button>
        </div>
      )}
      <UnlockWalletModal open={unlockOpen} onClose={() => setUnlockOpen(false)} onUnlocked={setUnlockedWallet} />
    </div>
  );
}

function PayoutPanel({ onUpdate }: { onUpdate: () => void }) {
  const [config, setConfig] = useState<PayoutConfig|null>(null);
  const [mode, setMode] = useState('dgb_integrated');
  const [address, setAddress] = useState(''); const [coin, setCoin] = useState('DGB');
  const [status, setStatus] = useState<string|null>(null);
  useEffect(() => { apiFetch('/payout').then(d => { setConfig(d); setMode(d.mode || 'dgb_integrated'); }); }, []);
  const save = async () => {
    const data = await apiFetch('/payout', { method: 'POST', body: JSON.stringify({ mode, address, coin }) });
    if (data.error) return setStatus(`❌ ${data.error}`);
    setStatus('✅ Payout address saved — miners will restart automatically');
    setConfig(data.config); onUpdate();
  };
  return (
    <div className="panel panel--payout">
      <h2>💸 Payout Address</h2>
      <div className="form-row">
        <label>Payout Mode</label>
        <select className="select" value={mode} onChange={e => setMode(e.target.value)}>
          <option value="dgb_integrated">DGB — Integrated Wallet</option>
          <option value="dgb_external">DGB — External Address</option>
          <option value="solana">Solana (SOL)</option>
          <option value="custom">Custom Coin</option>
        </select>
      </div>
      {mode !== 'dgb_integrated' && (
        <div className="form-row">
          <label>{mode === 'solana' ? 'SOL Address' : mode === 'custom' ? 'Address' : 'DGB Address'}</label>
          <input className="input" value={address} onChange={e => setAddress(e.target.value)} placeholder={mode === 'solana' ? 'Base58 SOL address' : 'D… DGB address'} />
        </div>
      )}
      {mode === 'custom' && (
        <div className="form-row"><label>Coin Ticker</label><input className="input input--sm" value={coin} onChange={e => setCoin(e.target.value)} placeholder="ETH" /></div>
      )}
      {config && <div className="payout-current"><label>Current</label><code>{config.mode} → {config.dgb_address || config.solana_address || config.custom_address || '(integrated)'}</code></div>}
      <button className="btn btn--primary" onClick={save}>Save Payout</button>
      {status && <div className={status.startsWith('✅') ? 'success' : 'error'}>{status}</div>}
    </div>
  );
}

function PoolSelectorPanel({ onPoolChanged }: { onPoolChanged: () => void }) {
  const [pools, setPools] = useState<Pool[]>([]);
  const [active, setActive] = useState<ActivePool|null>(null);
  const [selectedId, setSelectedId] = useState('fennac-skein');
  const [selectedUrl, setSelectedUrl] = useState('');
  const [worker, setWorker] = useState('dir_worker');
  const [customUrl, setCustomUrl] = useState('');
  const [status, setStatus] = useState<string|null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch('/pools').then(d => {
      setPools(d.pools || []);
      setActive(d.active || null);
      if (d.active) { setSelectedId(d.active.pool_id); setWorker(d.active.worker); setSelectedUrl(d.active.url); }
    });
  }, []);

  const selectedPool = pools.find(p => p.id === selectedId);

  const handlePoolChange = (id: string) => {
    setSelectedId(id);
    const p = pools.find(pp => pp.id === id);
    if (p && p.urls.length) setSelectedUrl(p.urls[0].url);
    else setSelectedUrl('');
    setStatus(null);
  };

  const save = async () => {
    setSaving(true); setStatus(null);
    const url = selectedId === 'custom' ? customUrl : selectedUrl;
    const data = await apiFetch('/pools/select', { method: 'POST', body: JSON.stringify({ pool_id: selectedId, url, worker }) });
    setSaving(false);
    if (data.error) return setStatus(`❌ ${data.error}`);
    setActive(data.config);
    setStatus('✅ Pool saved — miners restarting…');
    onPoolChanged();
  };

  return (
    <div className="panel panel--pool">
      <h2>🌐 Pool Selector</h2>

      {active && (
        <div className="pool-active">
          <span className="badge badge--online">ACTIVE</span>
          <code>{active.url}</code>
          <span className="pool-meta">worker: {active.worker}</span>
        </div>
      )}

      <div className="pool-grid">
        {pools.map(pool => (
          <div
            key={pool.id}
            className={`pool-card ${selectedId === pool.id ? 'pool-card--selected' : ''} ${pool.primary ? 'pool-card--primary' : ''}`}
            onClick={() => handlePoolChange(pool.id)}
          >
            <div className="pool-card__header">
              <span className="pool-card__name">{pool.name}</span>
              {pool.primary && <span className="badge badge--primary">⭐ Recommended</span>}
              <span className={`badge badge--algo badge--algo-${pool.algo}`}>{pool.algo.toUpperCase()}</span>
            </div>
            <div className="pool-card__meta">
              <span>Fee: {pool.fee}</span>
              <span>Min: {pool.minPayout}</span>
              {pool.pplns && <span className="badge badge--pplns">PPLNS</span>}
            </div>
            <div className="pool-card__notes">{pool.notes}</div>
          </div>
        ))}
      </div>

      {selectedPool && selectedPool.urls.length > 0 && (
        <div className="form-row">
          <label>Stratum URL</label>
          <select className="select" value={selectedUrl} onChange={e => setSelectedUrl(e.target.value)}>
            {selectedPool.urls.map(u => (
              <option key={u.url} value={u.url}>{u.region} — {u.url}{u.tls ? ' 🔒' : ''}</option>
            ))}
          </select>
        </div>
      )}

      {selectedId === 'custom' && (
        <div className="form-row">
          <label>Custom Stratum URL</label>
          <input className="input" value={customUrl} onChange={e => setCustomUrl(e.target.value)} placeholder="stratum+tcp://pool.example.com:3333" />
        </div>
      )}

      <div className="form-row">
        <label>Worker Name</label>
        <input className="input" value={worker} onChange={e => setWorker(e.target.value)} placeholder="dir_worker" />
      </div>

      <button className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Apply Pool'}</button>
      {status && <div className={status.startsWith('✅') ? 'success' : 'error'}>{status}</div>}
    </div>
  );
}

function ASICPanel() {
  const [asics, setAsics] = useState<ASICDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const scan = useCallback(async () => { setLoading(true); const d = await apiFetch('/asics'); setAsics(d.devices || []); setLoading(false); }, []);
  useEffect(() => { scan(); }, [scan]);
  return (
    <div className="panel panel--asic">
      <h2>🔌 USB ASIC Devices</h2>
      <button onClick={scan} disabled={loading} className="btn btn--sm">{loading ? 'Scanning…' : 'Re-scan'}</button>
      {asics.length === 0 ? <p className="muted">No ASIC devices detected.</p> : (
        <ul className="asic-list">
          {asics.map((a, i) => (
            <li key={i} className="asic-item">
              <span className="asic-name">{a.name}</span>
              <span className={`badge badge--algo badge--algo-${a.algo}`}>{a.algo}</span>
              <span className="badge">{a.source}</span>
              {a.hashrate != null && <span>{formatHashrate(a.hashrate)}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MiningTab() {
  const [status, setStatus] = useState<MiningStatus|null>(null);
  const [tab, setTab] = useState<'overview'|'wallet'|'payout'|'pools'|'asic'>('overview');
  const loadStatus = useCallback(async () => setStatus(await apiFetch('/status')), []);
  useEffect(() => { loadStatus(); const t = setInterval(loadStatus, 30000); return () => clearInterval(t); }, [loadStatus]);
  return (
    <div className="mining-tab">
      <div className="mining-tab__header">
        <h1>⛏️ Mining</h1>
        {status && (
          <div className="mining-tab__summary">
            <span className="badge badge--asic">🔌 {status.asics} ASIC(s)</span>
            {status.pool && <span className="badge badge--pool">🌐 {status.pool.id}</span>}
          </div>
        )}
      </div>
      <nav className="mining-tab__nav">
        {(['overview','wallet','payout','pools','asic'] as const).map(t => (
          <button key={t} className={`nav-btn ${tab === t ? 'nav-btn--active' : ''}`} onClick={() => setTab(t)}>
            {{'overview':'📊 Overview','wallet':'💳 Wallet','payout':'💸 Payout','pools':'🌐 Pools','asic':'🔌 ASICs'}[t]}
          </button>
        ))}
      </nav>
      <div className="mining-tab__content">
        {tab === 'overview' && <div className="overview-grid"><MinerCard label="Fennac" stats={status?.miners.fennac ?? null}/><MinerCard label="DGB Skein" stats={status?.miners.dgb_skein ?? null}/></div>}
        {tab === 'wallet'   && <WalletPanel />}
        {tab === 'payout'   && <PayoutPanel onUpdate={loadStatus} />}
        {tab === 'pools'    && <PoolSelectorPanel onPoolChanged={loadStatus} />}
        {tab === 'asic'     && <ASICPanel />}
      </div>
    </div>
  );
}
