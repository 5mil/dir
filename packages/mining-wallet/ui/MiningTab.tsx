import React, { useEffect, useState, useCallback } from 'react';
import PoolSelector from './PoolSelector';

interface MinerStats {
  accepted: number;
  rejected: number;
  hashrate_h: number;
  uptime_s: number;
}

interface PayoutConfig {
  mode: 'dgb_integrated' | 'dgb_external' | 'solana' | 'custom';
  dgb_address: string | null;
  solana_address: string | null;
  custom_address: string | null;
  custom_coin: string | null;
}

interface ASICDevice {
  name: string;
  algo: string;
  hashrate?: number;
  accepted?: number;
  rejected?: number;
  source: string;
  device?: string;
}

interface MiningStatus {
  miners: { fennac: MinerStats | null; dgb_skein: MinerStats | null };
  payout: { coin: string; address: string; source: string } | null;
  asics: number;
  wallet: string | null;
}

interface UnlockedWallet {
  address: string;
  publicKey: string;
  privateKeyMasked: string;
  derivation: string;
  created: string;
  unlocked: boolean;
}

function formatHashrate(h: number): string {
  if (h >= 1_000_000) return `${(h / 1_000_000).toFixed(2)} MH/s`;
  if (h >= 1_000) return `${(h / 1_000).toFixed(2)} KH/s`;
  return `${h.toFixed(0)} H/s`;
}

function formatUptime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

const API = '/api/mining';
async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return r.json();
}

function MinerCard({ label, stats }: { label: string; stats: MinerStats | null }) {
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
  const [error, setError] = useState<string | null>(null);
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
        <p>Enter your PIN to unlock wallet metadata and sensitive actions.</p>
        <input type="password" className="input" placeholder="Wallet PIN" value={pin} onChange={e => setPin(e.target.value)} />
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button className="btn btn--sm" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={unlock} disabled={loading}>{loading ? 'Unlocking...' : 'Unlock'}</button>
        </div>
      </div>
    </div>
  );
}

function WalletPanel() {
  const [wallet, setWallet] = useState<{ exists: boolean; address?: string; balance_dgb?: number | null } | null>(null);
  const [pin, setPin] = useState('');
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockedWallet, setUnlockedWallet] = useState<UnlockedWallet | null>(null);

  const loadWallet = useCallback(async () => { const data = await apiFetch('/wallet'); setWallet(data); }, []);
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
            <button onClick={() => setUnlockOpen(true)} className="btn btn--primary btn--sm">Unlock Wallet</button>
          </div>
          {unlockedWallet && (
            <div className="wallet-unlocked">
              <h4>Unlocked Wallet Metadata</h4>
              <div><label>Public Key</label><code>{unlockedWallet.publicKey}</code></div>
              <div><label>Private Key</label><code>{unlockedWallet.privateKeyMasked}</code></div>
              <div><label>Derivation</label><code>{unlockedWallet.derivation}</code></div>
              <div><label>Created</label><code>{new Date(unlockedWallet.created).toLocaleString()}</code></div>
            </div>
          )}
        </div>
      ) : (
        <div className="wallet-create">
          <p>No wallet found. Create an integrated DGB wallet to receive mining payouts.</p>
          <input type="password" placeholder="Set wallet PIN (6+ chars)" value={pin} onChange={e => setPin(e.target.value)} className="input" />
          <button onClick={createWallet} disabled={loading} className="btn btn--primary">{loading ? 'Creating...' : 'Create Wallet'}</button>
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
  const [config, setConfig] = useState<PayoutConfig | null>(null);
  const [mode, setMode] = useState<string>('dgb_integrated');
  const [address, setAddress] = useState('');
  const [coin, setCoin] = useState('DGB');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/payout').then(d => { setConfig(d); setMode(d.mode || 'dgb_integrated'); });
  }, []);

  const save = async () => {
    const data = await apiFetch('/payout', { method: 'POST', body: JSON.stringify({ mode, address, coin }) });
    if (data.error) return setStatus(`❌ ${data.error}`);
    setStatus('✅ Payout address saved');
    setConfig(data.config);
    onUpdate();
  };

  return (
    <div className="panel panel--payout">
      <h2>💸 Payout Address</h2>
      <div className="payout-mode">
        <label>Payout Mode</label>
        <select className="input" value={mode} onChange={e => setMode(e.target.value)}>
          <option value="dgb_integrated">DGB — Integrated Wallet</option>
          <option value="dgb_external">DGB — External Address</option>
          <option value="solana">Solana (SOL)</option>
          <option value="custom">Custom Coin</option>
        </select>
      </div>
      {mode !== 'dgb_integrated' && (
        <div>
          <label>Payout Address</label>
          <input className="input" placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} />
        </div>
      )}
      {mode === 'custom' && (
        <div>
          <label>Coin Ticker</label>
          <input className="input" placeholder="e.g. ETH" value={coin} onChange={e => setCoin(e.target.value)} />
        </div>
      )}
      <button className="btn btn--primary" onClick={save} style={{ marginTop: 12 }}>Save Payout Config</button>
      {status && <div className="pool-status" style={{ marginTop: 8 }}>{status}</div>}
      {config && (
        <div className="payout-current">
          <label>Current Config</label>
          <code>{JSON.stringify(config, null, 2)}</code>
        </div>
      )}
    </div>
  );
}

function ASICPanel() {
  const [asics, setAsics] = useState<ASICDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [poolUrl, setPoolUrl] = useState('');
  const [worker, setWorker] = useState('');
  const [cfgStatus, setCfgStatus] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    const data = await apiFetch('/asics');
    setAsics(data.devices || []);
    setLoading(false);
  }, []);

  useEffect(() => { scan(); }, [scan]);

  const configure = async () => {
    if (!poolUrl || !worker) return setCfgStatus('❌ Pool URL and worker required');
    const data = await apiFetch('/asics/configure', { method: 'POST', body: JSON.stringify({ pool_url: poolUrl, worker }) });
    setCfgStatus(data.ok ? '✅ cgminer configured' : `❌ ${data.error}`);
  };

  return (
    <div className="panel panel--asic">
      <h2>🔌 USB ASIC Devices</h2>
      <div className="asic-toolbar">
        <button className="btn btn--sm" onClick={scan} disabled={loading}>{loading ? 'Scanning...' : '⟳ Rescan'}</button>
      </div>
      {asics.length === 0 ? (
        <p className="asic-empty">No USB ASIC devices detected. Plug in and rescan.</p>
      ) : (
        <div className="asic-list">
          {asics.map((d, i) => (
            <div key={i} className="asic-card">
              <strong>{d.name}</strong>
              <span className="badge badge--algo">{d.algo}</span>
              <span className="badge badge--source">{d.source}</span>
              {d.hashrate != null && <span>{formatHashrate(d.hashrate)}</span>}
              {d.device && <code>{d.device}</code>}
            </div>
          ))}
        </div>
      )}
      <div className="asic-configure">
        <h4>Configure cgminer</h4>
        <input className="input" placeholder="Pool URL (stratum+tcp://...)" value={poolUrl} onChange={e => setPoolUrl(e.target.value)} />
        <input className="input" placeholder="Worker name" value={worker} onChange={e => setWorker(e.target.value)} />
        <button className="btn btn--primary btn--sm" onClick={configure}>Write cgminer.conf</button>
        {cfgStatus && <div className="pool-status">{cfgStatus}</div>}
      </div>
    </div>
  );
}

export default function MiningTab() {
  const [status, setStatus] = useState<MiningStatus | null>(null);
  const [tab, setTab] = useState<'overview' | 'wallet' | 'payout' | 'pools' | 'asic'>('overview');

  const loadStatus = useCallback(async () => {
    const data = await apiFetch('/status');
    setStatus(data);
  }, []);

  useEffect(() => {
    loadStatus();
    const t = setInterval(loadStatus, 30000);
    return () => clearInterval(t);
  }, [loadStatus]);

  return (
    <div className="mining-tab">
      <div className="mining-tab__header">
        <h1>⛏ Mining</h1>
        {status && <div className="mining-tab__summary"><span className="badge badge--asic">🔌 {status.asics} ASIC(s)</span></div>}
      </div>
      <nav className="mining-tab__nav">
        {(['overview', 'wallet', 'payout', 'pools', 'asic'] as const).map(t => (
          <button key={t} className={`nav-btn ${tab === t ? 'nav-btn--active' : ''}`} onClick={() => setTab(t)}>
            {{ overview: '📊 Overview', wallet: '💳 Wallet', payout: '💸 Payout', pools: '⛏ Pools', asic: '🔌 ASICs' }[t]}
          </button>
        ))}
      </nav>
      <div className="mining-tab__content">
        {tab === 'overview' && <div className="overview-grid"><MinerCard label="Fennac" stats={status?.miners.fennac ?? null} /><MinerCard label="DGB Skein" stats={status?.miners.dgb_skein ?? null} /></div>}
        {tab === 'wallet'   && <WalletPanel />}
        {tab === 'payout'   && <PayoutPanel onUpdate={loadStatus} />}
        {tab === 'pools'    && <PoolSelector />}
        {tab === 'asic'     && <ASICPanel />}
      </div>
    </div>
  );
}
