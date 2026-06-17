/**
 * Pool Registry
 * =============
 * Pre-configured Fennac (primary) + DGB Skein backup pools.
 * Config stored at /etc/dir/pool-config.json (mode 600).
 */

const fs   = require('fs');
const path = require('path');
const net  = require('net');

const POOL_CONFIG_PATH = process.env.POOL_CONFIG_PATH || '/etc/dir/pool-config.json';

// ──────────────────────────────────────────────────────────────
// Pre-configured pool registry
// ──────────────────────────────────────────────────────────────
const PRESET_POOLS = [
  {
    id: 'fennac-primary',
    name: 'Fennac (Primary)',
    url: 'stratum+tcp://pool.fennac.com:3333',
    algo: 'skein',
    coin: 'DGB',
    fee: '0%',
    region: 'Global',
    tls_port: 3443,
    tls_url: 'stratum+ssl://pool.fennac.com:3443',
    notes: 'Official Fennac pool — dir primary target',
    preset: true,
    priority: 0,
  },
  {
    id: 'fennac-backup',
    name: 'Fennac (Backup)',
    url: 'stratum+tcp://backup.fennac.com:3333',
    algo: 'skein',
    coin: 'DGB',
    fee: '0%',
    region: 'Global',
    tls_port: 3443,
    tls_url: 'stratum+ssl://backup.fennac.com:3443',
    notes: 'Fennac backup endpoint',
    preset: true,
    priority: 1,
  },
  {
    id: 'dgb-skein-dgbpool',
    name: 'DGBPool.com — Skein',
    url: 'stratum+tcp://skein.dgbpool.com:3056',
    algo: 'skein',
    coin: 'DGB',
    fee: '0.9%',
    region: 'Global',
    tls_url: null,
    notes: 'PPLNS — dgbpool.com',
    preset: true,
    priority: 2,
  },
  {
    id: 'dgb-skein-zpool',
    name: 'Zpool — Skein',
    url: 'stratum+tcp://skein.mine.zpool.ca:8533',
    algo: 'skein',
    coin: 'DGB',
    fee: '0.5%',
    region: 'US/EU',
    tls_url: null,
    notes: 'Auto-payout in BTC — zpool.ca',
    preset: true,
    priority: 3,
  },
  {
    id: 'dgb-skein-prohashing',
    name: 'ProHashing — Skein',
    url: 'stratum+tcp://prohashing.com:3333',
    algo: 'skein',
    coin: 'DGB',
    fee: '4.99%',
    region: 'US',
    tls_url: 'stratum+ssl://prohashing.com:3334',
    notes: 'Multi-algo profit switching — prohashing.com',
    preset: true,
    priority: 4,
  },
  {
    id: 'dgb-skein-unmineable',
    name: 'unMineable — DGB (Skein)',
    url: 'stratum+tcp://rx.unmineable.com:3333',
    algo: 'skein',
    coin: 'DGB',
    fee: '1%',
    region: 'Global',
    tls_url: 'stratum+ssl://rx.unmineable.com:443',
    notes: 'Mine any coin via DGB Skein — unmineable.com',
    preset: true,
    priority: 5,
  },
];

// ──────────────────────────────────────────────────────────────
// Config file helpers
// ──────────────────────────────────────────────────────────────
function defaultConfig() {
  return {
    active_pool_id: 'fennac-primary',
    failover_order: ['fennac-primary', 'fennac-backup', 'dgb-skein-dgbpool'],
    use_tls: false,
    custom_pools: [],
    updated: new Date().toISOString(),
  };
}

function loadConfig() {
  if (!fs.existsSync(POOL_CONFIG_PATH)) return defaultConfig();
  try { return JSON.parse(fs.readFileSync(POOL_CONFIG_PATH, 'utf8')); }
  catch { return defaultConfig(); }
}

function saveConfig(cfg) {
  fs.mkdirSync(path.dirname(POOL_CONFIG_PATH), { recursive: true });
  cfg.updated = new Date().toISOString();
  fs.writeFileSync(POOL_CONFIG_PATH, JSON.stringify(cfg, null, 2), { mode: 0o600 });
  return cfg;
}

// ──────────────────────────────────────────────────────────────
// Pool resolution
// ──────────────────────────────────────────────────────────────
function allPools() {
  const cfg = loadConfig();
  const customs = (cfg.custom_pools || []).map(p => ({ ...p, preset: false }));
  return [...PRESET_POOLS, ...customs];
}

function getPool(id) {
  return allPools().find(p => p.id === id) || null;
}

function getActivePool() {
  const cfg = loadConfig();
  return getPool(cfg.active_pool_id) || PRESET_POOLS[0];
}

function setActivePool(id) {
  const pool = getPool(id);
  if (!pool) throw new Error(`Unknown pool id: ${id}`);
  const cfg = loadConfig();
  cfg.active_pool_id = id;
  return saveConfig(cfg);
}

function setFailoverOrder(ids) {
  const cfg = loadConfig();
  ids.forEach(id => { if (!getPool(id)) throw new Error(`Unknown pool id: ${id}`); });
  cfg.failover_order = ids;
  return saveConfig(cfg);
}

function addCustomPool(pool) {
  const required = ['id', 'name', 'url', 'algo', 'coin'];
  required.forEach(k => { if (!pool[k]) throw new Error(`Missing field: ${k}`); });
  if (getPool(pool.id)) throw new Error(`Pool id already exists: ${pool.id}`);
  const cfg = loadConfig();
  cfg.custom_pools = cfg.custom_pools || [];
  cfg.custom_pools.push({ ...pool, preset: false });
  return saveConfig(cfg);
}

function removeCustomPool(id) {
  const cfg = loadConfig();
  const before = (cfg.custom_pools || []).length;
  cfg.custom_pools = (cfg.custom_pools || []).filter(p => p.id !== id);
  if (cfg.custom_pools.length === before) throw new Error(`Custom pool not found: ${id}`);
  if (cfg.active_pool_id === id) cfg.active_pool_id = 'fennac-primary';
  return saveConfig(cfg);
}

// ──────────────────────────────────────────────────────────────
// Pool reachability test (TCP connect)
// ──────────────────────────────────────────────────────────────
function testPoolReachability(url, timeoutMs = 5000) {
  return new Promise(resolve => {
    const match = url.match(/:(\d+)$/);
    if (!match) return resolve({ reachable: false, latency_ms: null, error: 'Cannot parse port' });
    const port = parseInt(match[1]);
    const host = url.replace(/^stratum\+[a-z]+:\/\//, '').replace(/:\d+$/, '');
    const t0 = Date.now();
    const sock = net.createConnection({ host, port, timeout: timeoutMs });
    sock.on('connect', () => {
      const ms = Date.now() - t0;
      sock.destroy();
      resolve({ reachable: true, latency_ms: ms, error: null });
    });
    sock.on('error', err => resolve({ reachable: false, latency_ms: null, error: err.message }));
    sock.on('timeout', () => { sock.destroy(); resolve({ reachable: false, latency_ms: null, error: 'timeout' }); });
  });
}

module.exports = {
  PRESET_POOLS,
  loadConfig,
  saveConfig,
  allPools,
  getPool,
  getActivePool,
  setActivePool,
  setFailoverOrder,
  addCustomPool,
  removeCustomPool,
  testPoolReachability,
};
