/**
 * Mining Tab — dir UI Component
 * ================================
 * Full mining dashboard tab for the dir NocoBase UI.
 * Renders:
 *   - Live miner stats (Fennac + DGB Skein)
 *   - Integrated DGB wallet (create / view / balance)
 *   - Payout address configurator (DGB integrated / external / Solana / custom)
 *   - USB ASIC panel (auto-detect, status, configure)
 *
 * Connects to /api/mining/* routes (mining-api.js)
 */

import React, { useEffect, useState, useCallback } from 'react';

// ---- Types ------------------------------------------------ //

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

// ---- Helpers ---------------------------------------------- //

function formatHashrate(h: number): string {
  if (h >= 1_000_000) return `${(h / 1_000_000).toFixed(2)} MH/s`;
  if (h >= 1_000)     return `${(h / 1_000).toFixed(2)} KH/s`;
  return `${h.toFixed(0)} H/s`;
}

function formatUptime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

const API = '/api/mining';

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  return r.json();
}

// ---- Sub-components --------------------------------------- //

function MinerCard({ label, stats }: { label: string; stats: MinerStats | null }) {
  if (!stats) return (
    <div className="miner-card miner-card--offline">
      <h3>{label}</h3>
      <span className="badge badge--offline">OFFLINE</span>
    </div>
  );
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

function WalletPanel() {
  const [wallet, setWallet] = useState<{ exists: boolean; address?: string; balance_dgb?: number | null } | null>(null);
  const [pin, setPin]       = useState('');
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const loadWallet = useCallback(async () => {
    const data = await apiFetch('/wallet');
    setWallet(data);
  }, []);

  useEffect(() => { loadWallet(); }, [loadWallet]);

  const createWallet = async () => {
    if (pin.length < 6) return setError('PIN must be 6+ characters');
    setLoading(true); setError(null);
    const data = await apiFetch('/wallet/create', {
      method: 'POST',
      body: JSON.stringify({ pin })
    });
    setLoading(false);
    if (data.error) return setError(data.error);
    setMnemonic(data.mnemonic);
    setPin('');
    loadWallet();
  };

  return (
    <div className="panel panel--wallet">
      <h2>💳 Integrated DGB Wallet</h2>
      {wallet?.exists ? (
        <div>
          <div className="wallet-address">
            <label>DGB Address</label>
            <code>{wallet.address}</code>
          </div>
          {wallet.balance_dgb !== null && wallet.balance_dgb !== undefined && (
            <div className="wallet-balance">
              <label>Balance</label>
              <value>{wallet.balance_dgb?.toFixed(8)} DGB</value>
            </div>
          )}
          <button onClick={loadWallet} className="btn btn--sm">Refresh Balance</button>
        </div>
      ) : (
        <div className="wallet-create">
          <p>No wallet found. Create an integrated DGB wallet to receive mining payouts.</p>
          <input
            type="password"
            placeholder="Set wallet PIN (6+ chars)"
            value={pin}
            onChange={e => setPin(e.target.value)}
            className="input"
          />
          <button onClick={createWallet} disabled={loading} className="btn btn--primary">
            {loading ? 'Creating...' : 'Create Wallet'}
          </button>
          {error && <div className="error">{error}</div>}
        </div>
      )}
      {mnemonic && (
        <div className="mnemonic-warning">
          <h4>⚠️ Save Your Recovery Phrase — Shown Once</h4>
          <code className="mnemonic">{mnemonic}</code>
          <button onClick={() => setMnemonic(null)} className="btn btn--sm btn--danger">
            I've saved it — hide
          </button>
        </div>
      )}
    </div>
  );
}

function PayoutPanel({ onUpdate }: { onUpdate: () => void }) {
  const [config, setConfig] = useState<PayoutConfig | null>(null);
  const [mode, setMode]     = useState<string>('dgb_integrated');
  const [address, setAddress] = useState('');
  const [coin, setCoin]     = useState('DGB');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/payout').then(d => {
      setConfig(d);
      setMode(d.mode || 'dgb_integrated');
    });
  }, []);

  const save = async () => {
    const data = await apiFetch('/payout', {
      method: 'POST',
      body: JSON.stringify({ mode, address, coin })
    });
    if (data.error) return setStatus(`❌ ${data.error}`);
    setStatus('✅ Payout address saved');
    setConfig(data.config);
    onUpdate();
  };

  return (
    <div className="panel panel--payout">
      <h2>💸 Payout Address</h2>
      {config && (
        <div className="payout-current">
          <label>Current</label>
          <span className="badge">{config.mode.replace('_', ' ').toUpperCase()}</span>
          <code>{config.dgb_address || config.solana_address || config.custom_address || 'not set'}</code>
        </div>
      )}
      <div className="payout-form">
        <label>Payout Mode</label>
        <select value={mode} onChange={e => setMode(e.target.value)} className="select">
          <option value="dgb_integrated">DGB — Integrated Wallet</option>
          <option value="dgb_external">DGB — External Address</option>
          <option value="solana">Solana (SOL) Address</option>
          <option value="custom">Custom Address</option>
        </select>

        {mode !== 'dgb_integrated' && (
          <input
            type="text"
            placeholder={
              mode === 'solana'  ? 'Solana wallet address (base58)' :
              mode === 'custom'  ? 'Payout address' :
              'DigiByte address (D...)'
            }
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="input input--address"
          />
        )}

        {mode === 'custom' && (
          <input
            type="text"
            placeholder="Coin ticker (e.g. ETH, BTC)"
            value={coin}
            onChange={e => setCoin(e.target.value)}
            className="input input--coin"
          />
        )}

        {mode === 'dgb_integrated' && (
          <p className="note">ℹ️ Uses your integrated DGB wallet address automatically.</p>
        )}

        <button onClick={save} className="btn btn--primary">Save Payout Address</button>
        {status && <div className="status-msg">{status}</div>}
      </div>
    </div>
  );
}

function ASICPanel() {
  const [asics, setAsics]   = useState<ASICDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [poolUrl, setPoolUrl] = useState('');
  const [worker, setWorker]   = useState('');
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
    const data = await apiFetch('/asics/configure', {
      method: 'POST',
      body: JSON.stringify({ pool_url: poolUrl, worker })
    });
    setCfgStatus(data.ok ? '✅ cgminer configured' : `❌ ${data.error}`);
  };

  return (
    <div className="panel panel--asic">
      <h2>🔌 USB ASIC Devices</h2>
      <div className="asic-header">
        <span>{loading ? 'Scanning...' : `${asics.length} device(s) detected`}</span>
        <button onClick={scan} disabled={loading} className="btn btn--sm">Rescan</button>
      </div>

      {asics.length === 0 && !loading && (
        <p className="empty-state">No USB ASICs detected. Connect via USB and rescan.</p>
      )}

      <div className="asic-list">
        {asics.map((dev, i) => (
          <div key={i} className="asic-device">
            <div className="asic-name">{dev.name}</div>
            <div className="asic-meta">
              <span className="tag">{dev.algo}</span>
              <span className="tag">{dev.source}</span>
              {dev.device && <span className="tag">{dev.device}</span>}
            </div>
            {dev.hashrate !== undefined && (
              <div className="asic-hashrate">{(dev.hashrate / 1000).toFixed(2)} KH/s</div>
            )}
          </div>
        ))}
      </div>

      {asics.length > 0 && (
        <div className="asic-configure">
          <h4>Auto-Configure for Pool</h4>
          <input type="text" placeholder="Pool URL (stratum+tcp://...)" value={poolUrl}
            onChange={e => setPoolUrl(e.target.value)} className="input" />
          <input type="text" placeholder="Worker (wallet.workerName)" value={worker}
            onChange={e => setWorker(e.target.value)} className="input" />
          <button onClick={configure} className="btn btn--primary">Configure ASICs</button>
          {cfgStatus && <div className="status-msg">{cfgStatus}</div>}
        </div>
      )}
    </div>
  );
}

// ---- Main MiningTab --------------------------------------- //

export default function MiningTab() {
  const [status, setStatus] = useState<MiningStatus | null>(null);
  const [tab, setTab]       = useState<'overview' | 'wallet' | 'payout' | 'asic'>('overview');

  const loadStatus = useCallback(async () => {
    const data = await apiFetch('/status');
    setStatus(data);
  }, []);

  useEffect(() => {
    loadStatus();
    const t = setInterval(loadStatus, 30_000);
    return () => clearInterval(t);
  }, [loadStatus]);

  return (
    <div className="mining-tab">
      <div className="mining-tab__header">
        <h1>⛏️ Mining</h1>
        {status && (
          <div className="mining-tab__summary">
            <span className="badge badge--asic">🔌 {status.asics} ASIC(s)</span>
            <span className="badge">
              {status.payout ? `💸 ${status.payout.coin}: ${status.payout.address?.slice(0,10)}...` : 'No payout set'}
            </span>
          </div>
        )}
      </div>

      <nav className="mining-tab__nav">
        {(['overview', 'wallet', 'payout', 'asic'] as const).map(t => (
          <button
            key={t}
            className={`nav-btn ${tab === t ? 'nav-btn--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {{ overview: '📊 Overview', wallet: '💳 Wallet', payout: '💸 Payout', asic: '🔌 ASICs' }[t]}
          </button>
        ))}
      </nav>

      <div className="mining-tab__content">
        {tab === 'overview' && (
          <div className="overview-grid">
            <MinerCard label="Fennac" stats={status?.miners.fennac ?? null} />
            <MinerCard label="DGB Skein" stats={status?.miners.dgb_skein ?? null} />
          </div>
        )}
        {tab === 'wallet' && <WalletPanel />}
        {tab === 'payout' && <PayoutPanel onUpdate={loadStatus} />}
        {tab === 'asic'   && <ASICPanel />}
      </div>
    </div>
  );
}
