/**
 * USB ASIC Plug-and-Play Manager
 * ===============================
 * Detects USB-connected ASICs (Antminer, Goldshell, iBeLink, etc.)
 * and auto-configures them for pool mining.
 *
 * Supported connection types:
 *   - USB CDC-ACM (serial) — most compact ASICs (Antminer U3, GekkoScience)
 *   - USB HID — some older miners
 *   - USB → Ethernet bridge (cgminer API on 4028)
 *
 * Detection strategy:
 *   1. Scan USB devices for known VID:PID pairs
 *   2. Try cgminer API on 127.0.0.1:4028 (USB-bridged ASICs)
 *   3. Scan /dev/ttyUSB* and /dev/ttyACM* for serial miners
 *   4. Emit 'asic:detected' events for each found device
 */

const { EventEmitter } = require('events');
const net    = require('net');
const fs     = require('fs');
const { execSync } = require('child_process');

// Known USB ASIC VID:PID pairs
const KNOWN_ASICS = [
  { vid: 0x0483, pid: 0x5740, name: 'GekkoScience Compac', algo: 'sha256d' },
  { vid: 0x10C4, pid: 0xEA60, name: 'Antminer U1/U2/U3',  algo: 'sha256d' },
  { vid: 0x067B, pid: 0x2303, name: 'Block Erupter USB',   algo: 'sha256d' },
  { vid: 0x1FC9, pid: 0x0083, name: 'Goldshell Mini',      algo: 'scrypt'  },
  { vid: 0x0403, pid: 0x6001, name: 'FTDI Serial ASIC',    algo: 'unknown' },
  { vid: 0x0403, pid: 0x6015, name: 'FT230X Serial ASIC',  algo: 'unknown' },
  // DGB Skein-capable USB miners (rare, custom firmware)
  { vid: 0x1D50, pid: 0x6018, name: 'Custom Skein USB',    algo: 'skein'   },
];

class USBAsicManager extends EventEmitter {
  constructor() {
    super();
    this.devices = [];
    this._pollInterval = null;
  }

  // ---- USB device scan (via lsusb) ------------------------ //

  scanUSB() {
    const found = [];
    try {
      const output = execSync('lsusb 2>/dev/null', { encoding: 'utf8' });
      for (const line of output.split('\n')) {
        const m = line.match(/ID ([0-9a-f]{4}):([0-9a-f]{4})/i);
        if (!m) continue;
        const vid = parseInt(m[1], 16);
        const pid = parseInt(m[2], 16);
        const known = KNOWN_ASICS.find(a => a.vid === vid && a.pid === pid);
        if (known) {
          found.push({ ...known, vid: m[1], pid: m[2], raw: line.trim(), source: 'usb' });
        }
      }
    } catch {}
    return found;
  }

  // ---- Serial port scan ----------------------------------- //

  scanSerial() {
    const found = [];
    try {
      const devs = fs.readdirSync('/dev').filter(d => /^tty(USB|ACM)\d+$/.test(d));
      for (const dev of devs) {
        found.push({
          name:   `Serial ASIC (${dev})`,
          algo:   'unknown',
          device: `/dev/${dev}`,
          source: 'serial'
        });
      }
    } catch {}
    return found;
  }

  // ---- cgminer API probe (USB-to-Ethernet bridge) --------- //

  probeCgminer(host = '127.0.0.1', port = 4028) {
    return new Promise(resolve => {
      const sock = new net.Socket();
      sock.setTimeout(2000);
      sock.connect(port, host, () => {
        sock.write(JSON.stringify({ command: 'devs' }));
      });
      let data = '';
      sock.on('data', chunk => { data += chunk; });
      sock.on('end', () => {
        try {
          const parsed = JSON.parse(data.replace(/\0/g, ''));
          const devs = parsed.DEVS || [];
          resolve(devs.map(d => ({
            name:   d.Name || 'cgminer ASIC',
            algo:   'sha256d',
            status: d.Status,
            hashrate: d['MHS 5s'] || 0,
            accepted: d.Accepted || 0,
            rejected: d.Rejected || 0,
            source:   'cgminer'
          })));
        } catch { resolve([]); }
        sock.destroy();
      });
      sock.on('error', () => resolve([]));
      sock.on('timeout', () => { sock.destroy(); resolve([]); });
    });
  }

  // ---- Full scan ------------------------------------------ //

  async scan() {
    const usb    = this.scanUSB();
    const serial = this.scanSerial();
    const cgminer = await this.probeCgminer();

    const all = [...usb, ...serial, ...cgminer];

    // Emit events for newly detected devices
    for (const dev of all) {
      const key = `${dev.vid || ''}:${dev.pid || ''}:${dev.device || dev.name}`;
      if (!this.devices.find(d => d._key === key)) {
        dev._key = key;
        this.emit('asic:detected', dev);
      }
    }

    this.devices = all.map((d, i) => ({ ...d, _key: d._key || String(i) }));
    return this.devices;
  }

  // ---- Auto-configure for pool ---------------------------- //

  autoConfigureCgminer(poolUrl, worker, password = 'x') {
    const conf = {
      pools: [{ url: poolUrl, user: worker, pass: password }],
      api_listen:    true,
      api_allow:     'W:127.0.0.1',
      api_port:      4028,
      expiry:        120,
      queue:         1,
      scan_time:     60,
      log:           5
    };
    const confPath = '/etc/cgminer.conf';
    fs.writeFileSync(confPath, JSON.stringify(conf, null, 2));
    console.log(`[USB-ASIC] cgminer config written to ${confPath}`);
    return conf;
  }

  // ---- Polling daemon ------------------------------------- //

  startPolling(intervalMs = 5000) {
    console.log(`[USB-ASIC] Polling for ASICs every ${intervalMs}ms`);
    this._pollInterval = setInterval(() => this.scan(), intervalMs);
    this.scan(); // immediate first scan
  }

  stopPolling() {
    if (this._pollInterval) clearInterval(this._pollInterval);
  }
}

module.exports = { USBAsicManager, KNOWN_ASICS };
