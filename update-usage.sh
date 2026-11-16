#!/bin/bash
# update-usage.sh — refresh Muse numbers in usage.json and push to GitHub.
# Preserves the claude section exactly (manual values entered on the phone).
# Usage: bash ~/workspace/ai-usage-widget/update-usage.sh
set -euo pipefail
cd ~/workspace/ai-usage-widget

STATUS="$(subscription-status status)"
echo "$STATUS"

python3 - "$STATUS" <<'PY'
import json, re, sys
from datetime import datetime
from zoneinfo import ZoneInfo

status = sys.argv[1]
with open("usage.json") as f:
    data = json.load(f)

m = re.search(r"Usage:\s*(\d+)% of free weekly limit", status)
if not m:
    print("ERROR: could not parse usage % from subscription-status output", file=sys.stderr)
    sys.exit(1)
pct = int(m.group(1))

extra = re.search(r"Additional tokens:\s*(\d+)% used \((\S+) tokens left\)", status)
extra_pct = int(extra.group(1)) if extra else data["muse"].get("extra_used_pct", 0)
extra_tokens = extra.group(2) if extra else data["muse"].get("extra_tokens", "31B")

# "Weekly limit resets Nov 21 at 8:26 AM IST" -> "21 Nov, 8:26 AM IST"
rm = re.search(r"Weekly limit resets (\w{3}) (\d{1,2}) at (\d{1,2}:\d{2} [AP]M)", status)
resets_label = data["muse"].get("resets_label", "")
resets_at = data["muse"].get("resets_at", "")
if rm:
    mon, day, clock = rm.groups()
    resets_label = f"{int(day)} {mon}, {clock} IST"
    month_num = datetime.strptime(mon, "%b").month
    now = datetime.now(ZoneInfo("Asia/Kolkata"))
    year = now.year
    # if the reset date already passed this year, it must be next year
    try:
        dt = datetime(year, month_num, int(day), *map(int, re.match(r"(\d+):(\d+) ([AP]M)", clock).groups()[:2]), tzinfo=ZoneInfo("Asia/Kolkata"))
        # fix 12-hour clock
        hour = int(re.match(r"(\d+):(\d+) ([AP]M)", clock).group(1))
        minute = int(re.match(r"(\d+):(\d+) ([AP]M)", clock).group(2))
        ampm = re.match(r"(\d+):(\d+) ([AP]M)", clock).group(3)
        if ampm == "PM" and hour != 12:
            hour += 12
        if ampm == "AM" and hour == 12:
            hour = 0
        dt = datetime(year, month_num, int(day), hour, minute, tzinfo=ZoneInfo("Asia/Kolkata"))
        if dt < now:
            dt = datetime(year + 1, month_num, int(day), hour, minute, tzinfo=ZoneInfo("Asia/Kolkata"))
        resets_at = dt.isoformat()
    except Exception:
        pass

now = datetime.now(ZoneInfo("Asia/Kolkata"))
data["muse"].update({
    "pct_used": pct,
    "pct_left": 100 - pct,
    "resets_label": resets_label,
    "resets_at": resets_at,
    "extra_tokens": extra_tokens,
    "extra_used_pct": extra_pct,
})
data["updated_at"] = now.isoformat()
data["updated_at_ist"] = now.strftime("%d %b %Y, %-I:%M %p IST").replace(" 0", " ")

with open("usage.json", "w") as f:
    json.dump(data, f, indent=2, sort_keys=True)
    f.write("\n")
print(f"Muse: {pct}% used, resets {resets_label}, extra {extra_tokens} {extra_pct}% used")
PY

if git diff --quiet usage.json; then
  echo "No change — usage.json already current, nothing to push."
  exit 0
fi
git add usage.json
git -c user.name="rabbive" -c user.email="ashwanthkumaravel@gmail.com" commit -m "Refresh Muse usage: $(python3 -c "import json; print(json.load(open('usage.json'))['muse']['pct_used'])")% used" >/dev/null
git push origin main
echo "Pushed updated usage.json to rabbive/ai-usage-widget."
