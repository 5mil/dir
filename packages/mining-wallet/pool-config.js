/**
 * pool-config.js
 * ==============
 * Pre-configured pool registry for the dir Mining Tab pool selector.
 * Covers Fennac (primary) + known public DGB Skein + DGB Odocrypt pools.
 *
 * Pool object schema:
 * {
 *   id:        string   — unique slug
 *   name:      string   — display name
 *   algo:      string   — skein | odocrypt | sha256d | scrypt
 *   coin:      string   — DGB | BTC | etc
 *   primary:   boolean  — show as recommended
 *   urls: [
 *     { url: string, region: string, tls: boolean }
 *   ]
 *   fee:       string   — e.g. '1%'
 *   pplns:     boolean
 *   minPayout: string   — e.g. '1 DGB'
 *   notes:     string
 * }
 */

const POOLS = [
  {
    id: 'fennac-skein',
    name: 'Fennac (dir native)',
    algo: 'skein',
    coin: 'DGB',
    primary: true,
    urls: [
      { url: 'stratum+tcp://pool.fennac.com:3333',  region: 'Global',     tls: false },
      { url: 'stratum+ssl://pool.fennac.com:3443',  region: 'Global TLS', tls: true  },
    ],
    fee: '1%',
    pplns: true,
    minPayout: '1 DGB',
    notes: 'Native dir integration. Rewards sync to NocoBase DB via dgb-reward-sync.',
  },
  {
    id: 'dgb-skein-zergpool',
    name: 'Zergpool — DGB Skein',
    algo: 'skein',
    coin: 'DGB',
    primary: false,
    urls: [
      { url: 'stratum+tcp://skein.mine.zergpool.com:4533', region: 'US',  tls: false },
      { url: 'stratum+ssl://skein.mine.zergpool.com:4534', region: 'US TLS', tls: true },
    ],
    fee: '0.5%',
    pplns: true,
    minPayout: '0.5 DGB',
    notes: 'Auto-exchange payout support. High stability backup.',
  },
  {
    id: 'dgb-skein-unmineable',
    name: 'unMineable — DGB Skein',
    algo: 'skein',
    coin: 'DGB',
    primary: false,
    urls: [
      { url: 'stratum+tcp://asia.unmineable.com:3333',    region: 'Asia',   tls: false },
      { url: 'stratum+tcp://us-east.unmineable.com:3333', region: 'US East', tls: false },
      { url: 'stratum+tcp://eu-west.unmineable.com:3333', region: 'EU West', tls: false },
    ],
    fee: '1%',
    pplns: false,
    minPayout: '1 DGB',
    notes: 'Supports cross-coin payouts (mine DGB, receive SOL/ETH/etc).',
  },
  {
    id: 'dgb-skein-aikapool',
    name: 'Aikapool — DGB Skein',
    algo: 'skein',
    coin: 'DGB',
    primary: false,
    urls: [
      { url: 'stratum+tcp://pool.aikapool.com:7923', region: 'EU', tls: false },
    ],
    fee: '1%',
    pplns: true,
    minPayout: '5 DGB',
    notes: 'Long-standing DGB pool. Good uptime record.',
  },
  {
    id: 'dgb-skein-miningpoolhub',
    name: 'MiningPoolHub — DGB Skein',
    algo: 'skein',
    coin: 'DGB',
    primary: false,
    urls: [
      { url: 'stratum+tcp://hub.miningpoolhub.com:20036', region: 'Global', tls: false },
    ],
    fee: '0.9%',
    pplns: true,
    minPayout: '1 DGB',
    notes: 'Multi-algo hub. Auto-exchange capable.',
  },
  {
    id: 'dgb-odo-digipool',
    name: 'DigiPool — DGB Odocrypt',
    algo: 'odocrypt',
    coin: 'DGB',
    primary: false,
    urls: [
      { url: 'stratum+tcp://dgb-odo.digipool.online:9999', region: 'Global', tls: false },
    ],
    fee: '1%',
    pplns: true,
    minPayout: '5 DGB',
    notes: 'Odocrypt-only DGB pool. GPU recommended.',
  },
  {
    id: 'custom',
    name: 'Custom Pool',
    algo: 'custom',
    coin: 'custom',
    primary: false,
    urls: [],
    fee: 'varies',
    pplns: null,
    minPayout: 'varies',
    notes: 'Enter any custom stratum URL manually.',
  },
];

function getPools() { return POOLS; }
function getPoolById(id) { return POOLS.find(p => p.id === id) || null; }
function getPrimaryPool() { return POOLS.find(p => p.primary) || POOLS[0]; }
function getSkeinPools() { return POOLS.filter(p => p.algo === 'skein'); }
function getDefaultUrl(pool) {
  if (!pool.urls.length) return null;
  const tls = pool.urls.find(u => u.tls);
  return tls || pool.urls[0];
}

const ACTIVE_POOL_PATH = process.env.DGB_POOL_CONFIG || '/etc/dir/active-pool.json';
const fs = require('fs');

function getActivePool() {
  try { return JSON.parse(fs.readFileSync(ACTIVE_POOL_PATH, 'utf8')); }
  catch { return { pool_id: 'fennac-skein', url: POOLS[0].urls[0].url, worker: 'dir_worker', password: 'x' }; }
}

function setActivePool(pool_id, url, worker = 'dir_worker', password = 'x') {
  const pool = getPoolById(pool_id);
  if (!pool && pool_id !== 'custom') throw new Error(`Unknown pool: ${pool_id}`);
  const cfg = { pool_id, url, worker, password, updated: new Date().toISOString() };
  fs.mkdirSync(require('path').dirname(ACTIVE_POOL_PATH), { recursive: true });
  fs.writeFileSync(ACTIVE_POOL_PATH, JSON.stringify(cfg, null, 2), { mode: 0o600 });
  return cfg;
}

module.exports = { getPools, getPoolById, getPrimaryPool, getSkeinPools, getDefaultUrl, getActivePool, setActivePool, ACTIVE_POOL_PATH };
