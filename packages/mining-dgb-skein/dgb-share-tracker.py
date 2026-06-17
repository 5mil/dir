#!/usr/bin/env python3
"""
DigiByte Skein Share Tracker
Tracks accepted/rejected shares, hashrate, uptime.
Writes to /var/lib/dgb-skein/stats.json for dir reward sync.
"""

import json, os, time, re
from pathlib import Path
from datetime import datetime, timezone

STATS_DIR  = Path('/var/lib/dgb-skein')
STATS_FILE = STATS_DIR / 'stats.json'
LOG_FILE   = Path('/var/log/dgb-skein-miner.log')

ACCEPTED_RE = re.compile(r'Share (found|accepted)', re.I)
REJECTED_RE = re.compile(r'Share (rejected|stale|invalid)', re.I)
HASHRATE_RE = re.compile(r'Hashrate: ([\d.]+)\s*(K?H)/s', re.I)

HR_MULT = {'H': 1, 'KH': 1_000, 'MH': 1_000_000}


def parse_log(offset=0):
    stats = {'accepted': 0, 'rejected': 0, 'hashrate_h': 0.0}
    try:
        with open(LOG_FILE, 'rb') as f:
            f.seek(offset)
            for line in f:
                txt = line.decode(errors='ignore')
                if ACCEPTED_RE.search(txt): stats['accepted'] += 1
                elif REJECTED_RE.search(txt): stats['rejected'] += 1
                m = HASHRATE_RE.search(txt)
                if m:
                    v, u = float(m.group(1)), m.group(2).upper()
                    stats['hashrate_h'] = v * HR_MULT.get(u, 1)
    except FileNotFoundError:
        pass
    return stats


def run(interval=30):
    STATS_DIR.mkdir(parents=True, exist_ok=True)
    state = {'worker': os.uname().nodename, 'accepted': 0, 'rejected': 0,
             'hashrate_h': 0.0, 'uptime_s': 0, 'log_offset': 0,
             'start_time': datetime.now(timezone.utc).isoformat(), 'last_updated': None,
             'coin': 'DGB-SKEIN'}
    if STATS_FILE.exists():
        state = json.loads(STATS_FILE.read_text())

    start = time.time()
    print(f'DGB Skein Share Tracker — polling every {interval}s')
    while True:
        delta = parse_log(state.get('log_offset', 0))
        try: state['log_offset'] = os.path.getsize(LOG_FILE)
        except: pass
        state['accepted']    += delta['accepted']
        state['rejected']    += delta['rejected']
        if delta['hashrate_h']: state['hashrate_h'] = delta['hashrate_h']
        state['uptime_s']     = int(time.time() - start)
        state['last_updated'] = datetime.now(timezone.utc).isoformat()
        STATS_FILE.write_text(json.dumps(state, indent=2))
        print(f"[{state['last_updated']}] DGB accepted={state['accepted']} "
              f"rejected={state['rejected']} hashrate={state['hashrate_h']:.0f} H/s")
        time.sleep(interval)


if __name__ == '__main__':
    run()
