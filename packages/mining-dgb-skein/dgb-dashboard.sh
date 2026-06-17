#!/usr/bin/env bash
# Live DigiByte Skein mining dashboard
STATS_FILE="/var/lib/dgb-skein/stats.json"

[[ ! -f "$STATS_FILE" ]] && echo "No stats yet. Is dgb-share-tracker.py running?" && exit 1

watch -n 5 python3 -c "
import json, datetime
with open('$STATS_FILE') as f: d = json.load(f)
hr = d.get('hashrate_h', 0)
hr_str = f'{hr/1000:.2f} KH/s' if hr >= 1000 else f'{hr:.0f} H/s'
print('╔══════════════════════════════════════╗')
print('║  DIGIBYTE SKEIN DASHBOARD          ║')
print('╠══════════════════════════════════════╣')
print(f\"║  Coin:     {d.get('coin','DGB-SKEIN'):<27}║\")
print(f\"║  Worker:   {d['worker']:<27}║\")
print(f\"║  Accepted: {d['accepted']:<27}║\")
print(f\"║  Rejected: {d['rejected']:<27}║\")
print(f\"║  Hashrate: {hr_str:<27}║\")
print(f\"║  Uptime:   {str(datetime.timedelta(seconds=d['uptime_s'])):<27}║\")
print('╚══════════════════════════════════════╝')
"
