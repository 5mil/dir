/**
 * payout-restart-hook.js
 * ======================
 * Watches /etc/dir/payout-config.json and /etc/dir/active-pool.json for changes.
 * On change: rewrites miner config and restarts the cpuminer-multi / dgb-skein daemon
 * via systemd (preferred) or direct kill+relaunch.
 *
 * Usage:
 *   const hook = require('./payout-restart-hook');
 *   hook.start();   // begin watching
 *   hook.stop();    // stop watching
 */

const fs       = require('fs');
const path     = require('path');
const { execSync, spawn } = require('child_process');
const { getActivePool } = require('./pool-config');
const solPayout = require('./solana-payout');

const PAYOUT_CONFIG  = process.env.PAYOUT_CONFIG  || '/etc/dir/payout-config.json';
const ACTIVE_POOL    = process.env.DGB_POOL_CONFIG || '/etc/dir/active-pool.json';
const CGMINER_CONF   = process.env.CGMINER_CONF    || '/etc/cgminer.conf';
const CPUMINER_CONF  = process.env.CPUMINER_CONF   || '/etc/dir/cpuminer.conf';

const SYSTEMD_SERVICES = [
  'dir-dgb-skein',
  'dir-dgb-skein-gpu',
  'dir-fennac',
];

let watchers = [];
let debounceTimers = {};

function log(msg) {
  const ts = new Date().toISOString();
  process.stdout.write(`[payout-restart-hook] ${ts}  ${msg}\n`);
}

function hasSystemd() {
  try { execSync('systemctl --version', { stdio: 'ignore' }); return true; }
  catch { return false; }
}

function serviceExists(name) {
  try {
    execSync(`systemctl list-unit-files ${name}.service --no-legend`, { stdio: 'ignore' });
    return true;
  } catch { return false; }
}

function restartService(name) {
  try {
    execSync(`systemctl restart ${name}.service`, { stdio: 'inherit' });
    log(`Restarted systemd service: ${name}`);
    return true;
  } catch (e) {
    log(`Failed to restart ${name}: ${e.message}`);
    return false;
  }
}

function killByPattern(pattern) {
  try {
    execSync(`pkill -f "${pattern}"`, { stdio: 'ignore' });
    log(`Killed processes matching: ${pattern}`);
  } catch { /* already dead */ }
}

function writeCpuminerConf(poolUrl, worker, password, address) {
  const conf = [
    `url = ${poolUrl}`,
    `user = ${worker}.${address || 'x'}`,
    `pass = ${password || 'x'}`,
    `algo = skein`,
    `threads = 0`,
  ].join('\n');
  fs.mkdirSync(path.dirname(CPUMINER_CONF), { recursive: true });
  fs.writeFileSync(CPUMINER_CONF, conf, { mode: 0o640 });
  log(`Wrote cpuminer config: ${CPUMINER_CONF}`);
}

function writeCgminerConf(poolUrl, worker, password) {
  const conf = JSON.stringify({
    pools: [{ url: poolUrl, user: worker, pass: password || 'x' }],
    api_listen: true,
    api_port: 4028,
  }, null, 2);
  fs.mkdirSync(path.dirname(CGMINER_CONF), { recursive: true });
  fs.writeFileSync(CGMINER_CONF, conf, { mode: 0o640 });
  log(`Wrote cgminer config: ${CGMINER_CONF}`);
}

function applyConfigAndRestart() {
  log('Config change detected — applying and restarting miners...');
  const pool   = getActivePool();
  const payout = solPayout.getPayoutAddress();

  writeCpuminerConf(pool.url, pool.worker, pool.password, payout?.address);
  writeCgminerConf(pool.url, pool.worker, pool.password);

  let restarted = false;
  if (hasSystemd()) {
    for (const svc of SYSTEMD_SERVICES) {
      if (serviceExists(svc)) {
        restartService(svc);
        restarted = true;
      }
    }
  }

  if (!restarted) {
    log('No systemd services found — attempting direct process restart...');
    killByPattern('cpuminer-multi');
    killByPattern('skein-miner.py');
    log('Miners stopped. Expecting daemon watchdog to relaunch.');
  }

  log('Restart sequence complete.');
}

function watchFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, '{}', { mode: 0o600 });
  }
  const w = fs.watch(filePath, (event) => {
    if (event !== 'change') return;
    clearTimeout(debounceTimers[filePath]);
    debounceTimers[filePath] = setTimeout(() => {
      log(`Change detected: ${filePath}`);
      applyConfigAndRestart();
    }, 1500); // 1.5s debounce — avoid double-fire on atomic writes
  });
  log(`Watching: ${filePath}`);
  return w;
}

function start() {
  if (watchers.length) return;
  watchers.push(watchFile(PAYOUT_CONFIG));
  watchers.push(watchFile(ACTIVE_POOL));
  log('Payout restart hook started.');
}

function stop() {
  for (const w of watchers) w.close();
  watchers = [];
  log('Payout restart hook stopped.');
}

module.exports = { start, stop, applyConfigAndRestart };
