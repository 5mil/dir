#!/usr/bin/env bash
# =============================================================
# Fennac Mining Dashboard — Step 49
# Displays live stats from /var/lib/fennac/stats.json
# Refreshes every 5 seconds (watch-style)
# =============================================================

STATS_FILE="/var/lib/fennac/stats.json"

if [[ ! -f "$STATS_FILE" ]]; then
  echo "No stats yet. Is share-tracker.py running?"
  exit 1
fi

watch -n 5 python3 -c "
import json, datetime
with open('$STATS_FILE') as f:
    d = json.load(f)

hr = d.get('hashrate_h', 0)
if hr >= 1_000_000:
    hr_str = f\"{hr/1_000_000:.2f} MH/s\"
elif hr >= 1_000:
    hr_str = f\"{hr/1_000:.2f} KH/s\"
else:
    hr_str = f\"{hr:.0f} H/s\"

print('╔══════════════════════════════════════╗')
print('║     FENNAC POOL MINER DASHBOARD      ║')
print('╠══════════════════════════════════════╣')
print(f\"║  Worker:   {d['worker']:<27}║\")
print(f\"║  Accepted: {d['accepted']:<27}║\")
print(f\"║  Rejected: {d['rejected']:<27}║\")
print(f\"║  Hashrate: {hr_str:<27}║\")
print(f\"║  Uptime:   {str(datetime.timedelta(seconds=d['uptime_s'])):<27}║\")
print(f\"║  Updated:  {str(d.get('last_updated',''))[:27]:<27}║\")
print('╚══════════════════════════════════════╝')
"
