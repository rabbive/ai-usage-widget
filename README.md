# AI Usage Widget (Scriptable)

Scriptable widget tracking Muse + Claude usage on iOS.

- **Muse: live.** The widget fetches `usage.json` from this repo. Muse refreshes that file, so the widget stays current with no typing.
- **Claude: manual.** Anthropic has no public API for a personal Claude seat's usage %. Tap the widget, enter the % from claude.ai/settings/usage, and it remembers it.

## Setup

1. Install Scriptable from the App Store.
2. Copy `UsageWidget.js` into Scriptable (Files app > iCloud Drive > Scriptable). Name it exactly `UsageWidget`.
3. Long-press Home Screen > + > Scriptable > Medium widget, choose this script.
4. Tap the widget anytime to update Claude.

## Files

- `UsageWidget.js` — the widget script
- `usage.json` — live data the widget fetches (updated by Muse)
