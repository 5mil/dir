#!/usr/bin/env bash
# DGB Skein Live Dashboard — refreshes every 5s
STATS="/var/lib/dgb-skein/stats.json"
WALLET="/etc/dgb-skein/wallet.json"

if [[ ! -f "$STATS" ]]; then
  echo "No stats yet. Is share-tracker.py running?"
  exit 1
fi

watch -n 5 python3 -c "
import json, datetime
with open('$STATS') as f:
    d = json.load(f)
try:
    with open('$WALLET') as f:
        w = json.load(f)
    addr = w.get('address','?')[:20] + '...'
    pool = w.get('pool','?')
except: addr, pool = '?', '?'

hr = d.get('hashrate_h', 0)
if hr >= 1_000_000: hr_str = f\"{hr/1_000_000:.2f} MH/s\"
elif hr >= 1_000:   hr_str = f\"{hr/1_000:.2f} kH/s\"
else:               hr_str = f\"{hr:.0f} H/s\"

acc = d.get('accepted',0)
rej = d.get('rejected',0)
rate = f\"{100*acc/(acc+rej):.1f}%\" if acc+rej > 0 else 'N/A'

print('╔══════════════════════════════════════╗')
print('║   DIGIBYTE SKEIN MINING DASHBOARD    ║')
print('╠══════════════════════════════════════╣')
print(f\"║  Worker:   {d['worker']:<27}║\")
print(f\"║  Coin:     DGB ✔ Algo: Skein          ║\")
print(f\"║  Wallet:   {addr:<27}║\")
print(f\"║  Pool:     {str(pool)[:27]:<27}║\")
print('╠══════════════════════════════════════╣')
print(f\"║  Accepted: {str(acc):<27}║\")
print(f\"║  Rejected: {str(rej):<27}║\")
print(f\"║  Accept %: {rate:<27}║\")
print(f\"║  Hashrate: {hr_str:<27}║\")
print(f\"║  Uptime:   {str(datetime.timedelta(seconds=d.get('uptime_s',0))):<27}║\")
print('╚══════════════════════════════════════╝')
"
