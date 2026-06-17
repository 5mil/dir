'use strict';
/**
 * payout-restart-hook.js
 * fs.watch x2 on payout-config.json + active-pool.json
 * 1.5s debounce → writes cpuminer.conf + cgminer.conf → systemd/pkill restart
 */
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PAYOUT_CONFIG   = process.env.PAYOUT_CONFIG   || '/etc/dir/payout-config.json';
const ACTIVE_POOL     = process.env.ACTIVE_POOL_FILE || '/etc/dir/active-pool.json';
const CPUMINER_CONF   = '/etc/dir/cpuminer.conf';
const CGMINER_CONF    = '/etc/cgminer.conf';
const DEBOUNCE_MS     = 1500;
const SERVICES        = ['dir-dgb-skein', 'dir-dgb-skein-gpu', 'dir-fennac'];

let debounceTimer = null;
let watchers = [];

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}

function writeConfs() {
  const pool   = readJSON(ACTIVE_POOL);
  const payout = readJSON(PAYOUT_CONFIG);
  const url    = pool.stratumUrl || '';
  const user   = payout.address  || 'CONFIGURE_WALLET';
  const worker = pool.worker     || 'dir-worker';

  const cpuminer = JSON.stringify({ url, user: `${user}.${worker}`, pass: 'x', algo: pool.algo || 'skein' }, null, 2);
  const cgminer  = `pools = [{\n  url = "${url}",\n  user = "${user}.${worker}",\n  pass = "x"\n}]\nalgorithm = "${pool.algo || 'skein'}"\n`;

  const dir = path.dirname(CPUMINER_CONF);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CPUMINER_CONF, cpuminer, { mode: 0o600 });
  fs.writeFileSync(CGMINER_CONF,  cgminer,  { mode: 0o600 });
  console.log(`[restart-hook] Configs written: ${CPUMINER_CONF} + ${CGMINER_CONF}`);
}

function restartMiners() {
  writeConfs();
  let restarted = false;
  for (const svc of SERVICES) {
    try { execSync(`systemctl restart ${svc}`, { stdio: 'ignore' }); restarted = true; }
    catch { /* service not present */ }
  }
  if (!restarted) {
    try { execSync('pkill -f cpuminer-multi', { stdio: 'ignore' }); } catch { }
    try { execSync('pkill -f skein-miner.py', { stdio: 'ignore' }); } catch { }
    console.log('[restart-hook] pkill fallback executed');
  } else {
    console.log(`[restart-hook] systemd restart: ${SERVICES.join(', ')}`);
  }
}

function onFileChange() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { try { restartMiners(); } catch (e) { console.error('[restart-hook]', e.message); } }, DEBOUNCE_MS);
}

function start() {
  if (watchers.length) return;
  for (const f of [PAYOUT_CONFIG, ACTIVE_POOL]) {
    try {
      const dir = path.dirname(f);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      if (!fs.existsSync(f)) fs.writeFileSync(f, '{}', { mode: 0o600 });
      watchers.push(fs.watch(f, onFileChange));
      console.log(`[restart-hook] Watching: ${f}`);
    } catch (e) { console.warn(`[restart-hook] Could not watch ${f}: ${e.message}`); }
  }
}

function stop() { watchers.forEach(w => w.close()); watchers = []; }

module.exports = { start, stop };
