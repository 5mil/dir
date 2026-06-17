#!/usr/bin/env python3
"""
DGB Skein Share Tracker
Parses cpuminer-multi/cgminer logs for DGB Skein.
Writes stats to /var/lib/dgb-skein/stats.json

Used by:
  - dir-reward-sync.sh: posts stats to dir instance
  - dgb-dashboard.sh:   live terminal display
"""

import json
import os
import re
import time
from pathlib import Path
from datetime import datetime, timezone

STATS_DIR  = Path('/var/lib/dgb-skein')
STATS_FILE = STATS_DIR / 'stats.json'
LOG_FILE   = Path('/var/log/dgb-skein-miner.log')

# cpuminer-multi log patterns
ACCEPTED_RE = re.compile(r'accepted|Accepted|yay!!!')
REJECTED_RE = re.compile(r'rejected|Rejected|booooo')
HASHRATE_RE = re.compile(r'([\d.]+)\s*(kH|MH|GH|H)/s')

MULTIPLIER = {'H': 1, 'kH': 1_000, 'MH': 1_000_000, 'GH': 1_000_000_000}


def parse_log(since_bytes=0) -> dict:
    stats = {'accepted': 0, 'rejected': 0, 'hashrate_h': 0.0}
    try:
        with open(LOG_FILE, 'rb') as f:
            f.seek(since_bytes)
            for line in f:
                txt = line.decode(errors='ignore')
                if ACCEPTED_RE.search(txt):
                    stats['accepted'] += 1
                elif REJECTED_RE.search(txt):
                    stats['rejected'] += 1
                m = HASHRATE_RE.search(txt)
                if m:
                    val, unit = float(m.group(1)), m.group(2)
                    stats['hashrate_h'] = val * MULTIPLIER.get(unit, 1)
    except FileNotFoundError:
        pass
    return stats


def load_state() -> dict:
    if STATS_FILE.exists():
        with open(STATS_FILE) as f:
            return json.load(f)
    return {
        'worker':       os.uname().nodename,
        'coin':         'DGB',
        'algorithm':    'skein',
        'accepted':     0,
        'rejected':     0,
        'hashrate_h':   0.0,
        'uptime_s':     0,
        'start_time':   datetime.now(timezone.utc).isoformat(),
        'last_updated': None,
        'log_offset':   0,
        'wallet':       _read_wallet(),
    }


def _read_wallet() -> str:
    try:
        with open('/etc/dgb-skein/wallet.json') as f:
            return json.load(f).get('address', 'UNKNOWN')
    except Exception:
        return 'UNKNOWN'


def save_state(s):
    STATS_DIR.mkdir(parents=True, exist_ok=True)
    with open(STATS_FILE, 'w') as f:
        json.dump(s, f, indent=2)


def run(interval=30):
    print(f'DGB Skein Share Tracker started — polling every {interval}s')
    state = load_state()
    start = time.time()

    while True:
        delta = parse_log(state.get('log_offset', 0))
        try:
            state['log_offset'] = os.path.getsize(LOG_FILE)
        except FileNotFoundError:
            pass

        state['accepted']    += delta['accepted']
        state['rejected']    += delta['rejected']
        if delta['hashrate_h']:
            state['hashrate_h'] = delta['hashrate_h']
        state['uptime_s']     = int(time.time() - start)
        state['last_updated'] = datetime.now(timezone.utc).isoformat()

        save_state(state)
        print(
            f"[{state['last_updated']}] "
            f"DGB accepted={state['accepted']} "
            f"rejected={state['rejected']} "
            f"hashrate={state['hashrate_h']:.0f} H/s"
        )
        time.sleep(interval)


if __name__ == '__main__':
    run()
