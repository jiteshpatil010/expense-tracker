# Expense Tracker — AI handoff file

**How to use:** give an AI assistant (Claude, etc.) this file plus `index.html` (and `sw.js`, `manifest.webmanifest` if the change touches them), then describe the change you want. Suggested prompt:

> Read HANDOFF.md and index.html. This is my existing expense tracker. Follow the rules in HANDOFF.md. Make this change: ______. Return the complete updated files, list what you changed, and tell me which version number to bump in sw.js.

---

## 1. What this is
A private, single-page expense tracker for one person on an iPhone. It is a PWA hosted on GitHub Pages. **All data stays in the phone's browser storage (localStorage). No server, no accounts, no analytics, no third-party services.** The owner is a beginner, uses Windows 11 (no Mac), and edits by asking an AI to change the code, then uploading files to GitHub.

## 2. Hard rules for any change
1. Keep it a **single `index.html`** with plain HTML/CSS/JavaScript. No framework, no build step, no npm.
2. **Never send data anywhere.** No network calls except the Excel library script (cdnjs, pinned version).
3. **Never break existing user data.** Storage key `expense_tracker_v1` and the data shape in section 4 must stay backward compatible. If the shape must change, add a migration on load and keep old backups restorable.
4. Backup file format (`v:1`, checksum `sum` = FNV-1a of `JSON.stringify(data)`) must stay restorable. If changed, bump `v` and keep reading v1.
5. Escape all user text with `esc()` before putting it in `innerHTML`.
6. Keep it **minimalist and mobile-first** (iPhone, one hand). Light, dark and auto themes must all work.
7. Keep the iOS touch fixes: `touch-action:manipulation`, hover styles only inside `@media(hover:hover)`, and `[hidden]` must really hide (e.g. `.mg[hidden]{display:none}`).
8. After any change to `index.html`, bump `CACHE` in `sw.js` (`expense-tracker-v1` → `v2` …) so phones fetch the new files.
9. Do not add notifications/push (decided against: needs a server and a third party). Reminders are in-app banners only.
10. Test before delivering: add/edit/delete entry, recycle bin, all month reports, trend chart chips, backup save + restore, Excel download, light/dark, 320 px and 430 px widths, empty-data state.

## 3. Files
| File | Purpose |
|---|---|
| `index.html` | Entire app (HTML + CSS + JS, ~36 KB) |
| `manifest.webmanifest` | PWA name, icons, standalone display |
| `sw.js` | Service worker: offline cache. Own files network-first; cdnjs Excel library cached after first use |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | App icons (indigo with three white bars) |
| `HANDOFF.md` | This file |

Hosting: GitHub Pages, project site, so all paths are **relative** (`sw.js`, not `/sw.js`).
External script: SheetJS `xlsx@0.18.5` from `cdnjs.cloudflare.com` (used only for the Excel download).

## 4. Data model (localStorage key `expense_tracker_v1`, JSON)
```
D = {
  income:  { "2026-10": 90000, ... },          // per month, key = YYYY-MM
  entries: [ { id, ts, amt, type, pay, note, comment } ],
  bin:     [ { ...entry, del } ],              // recycle bin, del = deleted-at ms; purged after 30 days
  lim:     { inv, hh, need, wantO, wantR }     // optional targets, % of income
}
```
- `id` = creation time in ms (unique). `ts` = entry date-time in ms (local time is used for month grouping).
- `type` ids: rent, food, travel, grocery, online, health, sport, ent, trip, mobile, petrol, emi, others, invest, home, bill, salon.
- `pay` values: UPI, Credit card, Cash, Bank, Cheque.
- `note` is stored only for types others / invest / bill. `comment` is optional for all.
- Other localStorage keys: `expense_tracker_v1_theme` (auto|light|dark), `_sel` (selected trend lines), `_bk` (last backup time), `_xl` (month last exported), `_dm` (banner dismissed date).

## 5. Business rules (owner's definitions — do not change silently)
- **Total expenses** = all types except `invest` (includes bill and salon).
- **Savings** = income − total expenses − investment.
- **Household** = rent + food + mobile + grocery + bill + salon + travel.
- **Needs** = food + travel + rent + grocery + health + salon + mobile + emi + invest + home.
- **Wants** = online + sport + ent + trip + petrol + others.
- Card colours (only when that month's income is set): Investment red if below `inv`% (default 25), else green. Household red if above `hh`% (default 35), else green. Wants orange above `wantO`% (default 15), red above `wantR`% (default 20), else green. Needs has **no default limit** (optional; colour only if set).
- Total expenses and Savings cards are the "hero" cards (rose and green, with a progress bar of % of income) and are not status-coloured. Savings turns rose if negative.
- Report cards show only "N% of income", never the limit text.

## 6. Features (current)
- **Quick entry popup** (`#add` link, or + button): Amount (decimal, comma ok, max 1 crore), Type (default Food), Payment method, Note (conditional), Comment, **Record**, **Edit previous** (loads the most recently recorded entry). Edit mode adds **Delete entry** (two taps) → recycle bin.
- **Income prompt** on first open of each month (editable any time from the month report). With `#add` and no income yet, income is asked first, then the expense popup opens.
- **Main page**: current month entries grouped by day (Today / Yesterday labels, daily totals), newest first; tap a row to edit.
- **Menu (≡, top right)**: Entries, Current month, Previous month, Select recording (month grid), Recycle bin, Settings & targets, Backup & restore.
- **Month report**: Total expenses + Savings hero cards, Investment/Household/Wants/Needs cards, **View all entries**, **Download Excel**, spend-by-category bars, **Monthly trend** line chart (Y axis with nice ticks; chips to toggle Expenses/Savings/Investment/Needs/Wants/Household and every category; default Expenses + Investment + Savings; choice remembered), **Payment methods** bars (amount and % share).
- **Excel** (SheetJS): sheets Summary (incl. payment methods), Entries, By date, Trend.
- **Backup & restore**: saves a `.json` file via the iOS share sheet ("Save to Files"); restore picks a file, validates checksum and every entry, shows a summary, replaces data only after confirmation.
- **Recycle bin**: 30-day retention, restore or delete forever, empty bin.
- **Banners** on the main page: last 3 days of month → download report; no backup in 30 days → back up. "Remind me tomorrow" hides both for the day.
- **Settings**: theme (Auto/Light/Dark) and targets. (There is deliberately **no** test-data feature: it could overwrite real data by mistake. For testing, an AI should generate sample data in its own test script, never in the shipped app.)

## 7. Code map (inside `index.html`)
CSS variables at top (`--bg --card --ink --mut --line --acc --g --r --o --sv --ex`, dark overrides) → HTML shell (`#app`, `#fab`, `#ov/#bx` sheet, `#toast`) → JS: constants (`T` types, `PAY`, groups `HH/NEED/WANT`), storage (`D`, `save`), `stat(ym)` (all monthly maths), screens (`render`, `list`, `report`, `card`, `chart`, `payBlock`), sheets (`open`, `close`, `menu`, `form`, `incomeSheet`, `settings`, `binSheet`, `backup`, `confirmRestore`), `xl()` Excel, `saveFile()` (share sheet with download fallback), `saveBackup/readBackup`, one delegated click handler (`data-*` attributes), start-up block at the bottom (service worker registration, `#add` handling).

## 8. Platform facts that shaped the design (iPhone, no Mac)
- Back Tap → Shortcuts → **Open URL** `https://USERNAME.github.io/REPO/#add` opens the app in **Safari**.
- On iOS, an app installed with "Open as Web App" has **separate storage** from Safari. To keep one data store, the owner uses the home-screen icon **with "Open as Web App" switched OFF** (opens in Safari). Do not suggest mixing both.
- iOS can clear website data for sites not used for ~7 days, or if the owner clears Safari data → hence monthly backup files and the backup banner.
- Real push notifications are not used (need a server).

## 9. Test status
Verified in automated browser tests (Playwright, iPhone-size viewport): entry validation, XSS escaping, edit/delete/recycle bin, all reports, trend chart with all 23 lines, backup save/restore incl. tampered and junk files, 20,000-entry performance (list ≈ 20 ms, report ≈ 60 ms), blocked storage, offline load, `#add` deep link. **Not tested on a physical iPhone:** share-sheet "Save to Files", Excel download, file picker restore, Back Tap. If one of these fails on the phone, fix `saveFile()` or the file input first.

## 10. Change log
- v2: removed the test-data buttons from Settings (risk of mixing fake data with real data). Service worker cache is now `expense-tracker-v2`.
- v1: initial build — quick entry, month reports, trend chart with Y axis, targets, themes, payment-method share, Excel export, file backup/restore, recycle bin, date-grouped list, in-app reminders, iOS tap fixes, PWA packaging (manifest, service worker, icons).

## 11. Ideas not built yet
Search/filter on the entries list; recurring entries (rent/EMI auto-add); per-category monthly budgets; yearly summary; CSV import; Face ID lock; auto-reminder via Shortcuts automation (outside the app).
