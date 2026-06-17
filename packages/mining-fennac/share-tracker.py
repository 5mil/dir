#!/usr/bin/env python3
"""
Share Tracker — Step 49
Tracks accepted/rejected shares, hashrate, and uptime.
Writes stats to /var/lib/fennac/stats.json for reward sync.

Used by:
  - dir-reward-sync.sh (Step 50) to post stats to dir instance
  - fennac-dashboard.sh for local display
"""

import json
import os
import time
import re
from pathlib import Path
from datetime import datetime, timezone

STATS_DIR  = Path('/var/lib/fennac')
STATS_FILE = STATS_DIR / 'stats.json'
LOG_FILE   = Path('/var/log/fennac-miner.log')

# Regex patterns for Fennacminer log lines
ACCEPTED_RE = re.compile(r'Share (accepted|found)')
REJECTED_RE = re.compile(r'Share (rejected|stale)')
HASHRATE_RE = re.compile(r'Hashrate: ([\d.]+)\s*(H|KH|MH|GH)/s')

HASHRATE_MULTIPLIER = {'H': 1, 'KH': 1_000, 'MH': 1_000_000, 'GH': 1_000_000_000}


def parse_log(since_bytes: int = 0) -> dict:
    """Parse miner log from byte offset, return delta stats."""
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
                    stats['hashrate_h'] = val * HASHRATE_MULTIPLIER.get(unit, 1)
    except FileNotFoundError:
        pass
    return stats


def load_state() -> dict:
    if STATS_FILE.exists():
        with open(STATS_FILE) as f:
            return json.load(f)
    return {
        'worker':        os.uname().nodename,
        'accepted':      0,
        'rejected':      0,
        'hashrate_h':    0.0,
        'uptime_s':      0,
        'start_time':    datetime.now(timezone.utc).isoformat(),
        'last_updated':  None,
        'log_offset':    0,
    }


def save_state(state: dict):
    STATS_DIR.mkdir(parents=True, exist_ok=True)
    with open(STATS_FILE, 'w') as f:
        json.dump(state, f, indent=2)


def run(interval: int = 30):
    print(f'Share Tracker started — polling every {interval}s')
    print(f'Stats: {STATS_FILE}')
    state = load_state()
    start = time.time()

    while True:
        delta = parse_log(since_bytes=state.get('log_offset', 0))

        # Update log byte offset
        try:
            state['log_offset'] = os.path.getsize(LOG_FILE)
        except FileNotFoundError:
            pass

        state['accepted']     += delta['accepted']
        state['rejected']     += delta['rejected']
        if delta['hashrate_h']:
            state['hashrate_h'] = delta['hashrate_h']
        state['uptime_s']      = int(time.time() - start)
        state['last_updated']  = datetime.now(timezone.utc).isoformat()

        save_state(state)
        print(
            f"[{state['last_updated']}] "
            f"accepted={state['accepted']} "
            f"rejected={state['rejected']} "
            f"hashrate={state['hashrate_h']:.0f} H/s "
            f"uptime={state['uptime_s']}s"
        )
        time.sleep(interval)


if __name__ == '__main__':
    run()
