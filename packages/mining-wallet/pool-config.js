'use strict';
/**
 * pool-config.js
 * Pool registry: Fennac primary + 6 DGB backup pools + custom
 * Active pool: /etc/dir/active-pool.json (mode 600)
 */
const fs   = require('fs');
const path = require('path');

const ACTIVE_POOL_FILE = process.env.ACTIVE_POOL_FILE || '/etc/dir/active-pool.json';

const POOLS = [
  {
    id: 'fennac-skein',
    name: 'Fennac',
    description: 'dir native Fennac pool — Skein algorithm',
    algo: 'skein',
    primary: true,
    tls: true,
    fee: '1%',
    stratumUrls: [
      'stratum+ssl://pool.fennac.io:4443',
      'stratum+ssl://pool2.fennac.io:4443',
    ],
    defaultWorker: 'dir-worker',
  },
  {
    id: 'dgb-skein-zergpool',
    name: 'Zergpool — DGB Skein',
    algo: 'skein',
    tls: true,
    fee: '0.5%',
    stratumUrls: ['stratum+ssl://skein.mine.zergpool.com:3369'],
    defaultWorker: 'dir-dgb',
  },
  {
    id: 'dgb-skein-unmineable',
    name: 'unMineable — DGB Skein',
    algo: 'skein',
    tls: false,
    fee: '1%',
    stratumUrls: [
      'stratum+tcp://rx.unmineable.com:3333',
      'stratum+tcp://asia.unmineable.com:3333',
      'stratum+tcp://eu.unmineable.com:3333',
    ],
    defaultWorker: 'dir-dgb',
  },
  {
    id: 'dgb-skein-aikapool',
    name: 'Aikapool — DGB Skein',
    algo: 'skein',
    tls: false,
    fee: '1%',
    stratumUrls: ['stratum+tcp://aikapool.com:7915'],
    defaultWorker: 'dir-dgb',
  },
  {
    id: 'dgb-skein-miningpoolhub',
    name: 'MiningPoolHub — DGB Skein',
    algo: 'skein',
    tls: false,
    fee: '0.9%',
    stratumUrls: ['stratum+tcp://digibyte-skein.usa.mine.zpool.ca:3369'],
    defaultWorker: 'dir-dgb',
  },
  {
    id: 'dgb-odo-digipool',
    name: 'DigiPool — DGB Odocrypt',
    algo: 'odocrypt',
    tls: false,
    fee: '1%',
    stratumUrls: ['stratum+tcp://digipool.org:3032'],
    defaultWorker: 'dir-dgb',
  },
  {
    id: 'custom',
    name: 'Custom Pool',
    algo: 'custom',
    tls: false,
    fee: '—',
    stratumUrls: [],
    defaultWorker: 'dir-worker',
    custom: true,
  },
];

function listPools() { return POOLS; }

function getPool(id) {
  const pool = POOLS.find(p => p.id === id);
  if (!pool) throw new Error(`Unknown pool: ${id}`);
  return pool;
}

function getActivePool() {
  try { return JSON.parse(fs.readFileSync(ACTIVE_POOL_FILE, 'utf8')); } catch { return null; }
}

function setActivePool(poolId, opts = {}) {
  const pool = getPool(poolId);
  const stratumUrl = poolId === 'custom'
    ? (opts.customUrl || '')
    : (opts.stratumUrl || pool.stratumUrls[0]);
  if (poolId === 'custom' && !stratumUrl) throw new Error('customUrl required for custom pool.');
  const record = {
    id: pool.id,
    name: pool.name,
    algo: pool.algo,
    stratumUrl,
    worker: opts.worker || pool.defaultWorker,
    tls: pool.tls,
    selected_at: new Date().toISOString(),
  };
  const dir = path.dirname(ACTIVE_POOL_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(ACTIVE_POOL_FILE, JSON.stringify(record, null, 2), { mode: 0o600 });
  return record;
}

module.exports = { listPools, getPool, getActivePool, setActivePool };
