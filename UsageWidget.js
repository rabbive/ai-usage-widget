// UsageWidget.js — Scriptable widget for tracking Muse + Claude usage
// ----------------------------------------------------------------------
// SETUP (2 min):
//  1. Install Scriptable from the App Store.
//  2. Copy this file into Scriptable (Files app > iCloud Drive > Scriptable,
//     or share this file to Scriptable). Name it exactly: UsageWidget
//  3. Long-press Home Screen > + > Scriptable > pick Medium widget,
//     choose this script. (Small shows Muse only, Medium/Large show both.)
//  4. Tap the widget anytime to update your Claude numbers — it opens
//     this script and asks for the % used. Muse updates itself.
//
// HOW IT WORKS:
//  - Muse: live. This script fetches usage.json from your GitHub repo
//    (rabbive/ai-usage-widget). Muse refreshes that file, so the widget
//    stays current without you typing anything.
//  - Claude: manual. Anthropic has no public API for a personal
//    Claude seat's usage % (the usage page needs your logged-in
//    session), so the widget asks you for the % from
//    claude.ai/settings/usage when you tap it, and remembers it.
//    If you never enter one, it shows "—" instead of a fake number.
//  - Offline: if the fetch fails, the widget shows the last saved
//    values and marks them "cached".

// ── Config ────────────────────────────────────────────────────────────
const DATA_URL = "https://raw.githubusercontent.com/rabbive/ai-usage-widget/main/usage.json";
const CACHE_FILE = "ai-usage-cache.json"; // stored in Scriptable's local docs
const CLAUDE_USAGE_URL = "https://claude.ai/settings/usage";

// ── Helpers ───────────────────────────────────────────────────────────
function bar(pct, len = 18) {
  if (pct === null || pct === undefined || isNaN(pct)) return "░".repeat(len);
  const filled = Math.max(0, Math.min(len, Math.round((pct / 100) * len)));
  return "█".repeat(filled) + "░".repeat(len - filled);
}

function istNow() {
  return new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric", month: "short",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function addRow(w, label, value, labelColor, valueColor, size = 13) {
  const stack = w.addStack();
  stack.layoutHorizontally();
  const l = stack.addText(label);
  l.font = Font.systemFont(size);
  l.textColor = new Color(labelColor);
  stack.addSpacer();
  const v = stack.addText(value);
  v.font = Font.boldSystemFont(size);
  v.textColor = new Color(valueColor);
  return stack;
}

function addSection(w, title, accent, pct, sub1, sub2) {
  const t = w.addText(title);
  t.font = Font.boldSystemFont(11);
  t.textColor = new Color(accent);
  w.addSpacer(3);

  const pctText = (pct === null || pct === undefined)
    ? "— % used"
    : pct + "% used · " + (100 - pct) + "% left";
  const p = w.addText(pctText);
  p.font = Font.boldSystemFont(15);
  p.textColor = new Color("#ffffff");
  w.addSpacer(2);

  const b = w.addText(bar(pct));
  b.font = Font.systemFont(11);
  b.textColor = new Color(accent);
  b.lineLimit = 1;
  w.addSpacer(2);

  if (sub1) {
    const s1 = w.addText(sub1);
    s1.font = Font.systemFont(11);
    s1.textColor = new Color("#9ca3af");
    s1.lineLimit = 1;
  }
  if (sub2) {
    const s2 = w.addText(sub2);
    s2.font = Font.systemFont(11);
    s2.textColor = new Color("#9ca3af");
    s2.lineLimit = 1;
  }
}

// ── Load data ─────────────────────────────────────────────────────────
const fm = FileManager.local();
const cachePath = fm.joinPath(fm.documentsDirectory(), CACHE_FILE);

let data = null;
let live = false;
try {
  const req = new Request(DATA_URL);
  req.timeoutInterval = 10;
  data = await req.loadJSON();
  live = true;
  fm.writeString(cachePath, JSON.stringify(data));
} catch (e) {
  try {
    if (fm.fileExists(cachePath)) data = JSON.parse(fm.readString(cachePath));
  } catch (_) { /* no cache yet */ }
}

if (!data) {
  // Nothing fetched and nothing cached — seed with last known values.
  data = {
    updated_at_ist: "16 Nov 2026, 2:47 PM IST",
    muse: { plan: "Free", pct_used: 27, resets_label: "21 Nov, 8:26 AM IST", extra_tokens: "31B", extra_used_pct: 0 },
    claude: { plan: "Upgraded seat", pct_used: null, window: "5-hour", resets_label: "check claude.ai/settings/usage" },
  };
}

// ── In-app run: update Claude numbers ────────────────────────────────
if (!config.runsInWidget) {
  const alert = new Alert();
  alert.title = "Update Claude usage";
  alert.message = "Muse is already live (" + (data.muse.pct_used ?? "—") + "% used). "
    + "Claude has no public usage API, so enter what claude.ai/settings/usage shows.";
  alert.addTextField("Claude % used (0-100)", data.claude.pct_used == null ? "" : String(data.claude.pct_used));
  alert.addTextField("Resets (e.g. 3h 20m, or 9 PM)", data.claude.resets_label || "");
  alert.addAction("Save");
  alert.addCancelAction("Keep as is");
  const idx = await alert.present();
  if (idx === 0) {
    const pctRaw = alert.textFieldValue(0).trim();
    const pct = pctRaw === "" ? null : Math.max(0, Math.min(100, parseInt(pctRaw, 10)));
    if (pct !== null && !isNaN(pct)) data.claude.pct_used = pct;
    const resetRaw = alert.textFieldValue(1).trim();
    if (resetRaw) data.claude.resets_label = resetRaw;
    data.updated_at_ist = istNow() + " IST";
    fm.writeString(cachePath, JSON.stringify(data));
  }
}

// ── Build widget ──────────────────────────────────────────────────────
const widget = new ListWidget();
widget.backgroundColor = new Color("#0f1115");
widget.setPadding(14, 16, 12, 16);
// Tap widget -> re-run this script in Scriptable to update Claude.
widget.url = "scriptable:///run/UsageWidget";

const header = widget.addStack();
header.layoutHorizontally();
header.centerAlignContent();
const title = header.addText("AI USAGE");
title.font = Font.boldSystemFont(12);
title.textColor = new Color("#ffffff");
header.addSpacer();
const status = header.addText(live ? "● live" : "● cached");
status.font = Font.systemFont(11);
status.textColor = new Color(live ? "#34d399" : "#fbbf24");
widget.addSpacer(8);

const family = config.widgetFamily || "medium";

if (family === "small") {
  // Small widget: Muse only, the one that updates itself.
  addSection(widget, "MUSE  ·  " + (data.muse.plan || "Free"), "#a78bfa",
    data.muse.pct_used,
    "Resets " + (data.muse.resets_label || "—"),
    "Extra " + (data.muse.extra_tokens || "31B") + " · " + (data.muse.extra_used_pct ?? 0) + "% used");
} else {
  addSection(widget, "MUSE  ·  " + (data.muse.plan || "Free"), "#a78bfa",
    data.muse.pct_used,
    "Resets " + (data.muse.resets_label || "—"),
    "Extra " + (data.muse.extra_tokens || "31B") + " · " + (data.muse.extra_used_pct ?? 0) + "% used");
  widget.addSpacer(10);
  addSection(widget, "CLAUDE  ·  " + (data.claude.plan || "Upgraded seat"), "#d97757",
    data.claude.pct_used,
    "Window: " + (data.claude.window || "5-hour"),
    "Resets " + (data.claude.resets_label || "—") + (data.claude.pct_used == null ? "  ·  tap to set %" : ""));
}

widget.addSpacer();
const foot = widget.addText("Updated " + (data.updated_at_ist || istNow() + " IST") + "  ·  tap to update Claude");
foot.font = Font.systemFont(10);
foot.textColor = new Color("#6b7280");
foot.lineLimit = 1;

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  if (family === "small") await widget.presentSmall();
  else if (family === "large") await widget.presentLarge();
  else await widget.presentMedium();
}
Script.complete();
