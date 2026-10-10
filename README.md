# Expense Tracker

A private expense tracker that runs in your browser. All data is stored **on your device only** (IndexedDB). There is no server, no account, no analytics, and no network calls.

## Features
- Dark, mobile-first design: Home dashboard, Stats, Budget and Profile tabs, plus All Transactions with search and filters
- Stats: weekly / monthly / yearly bar charts, insights vs. the previous period, payment-mode split, top categories
- Budget: overall ring, per-category progress cards with over-budget alerts
- Plan: savings goals (e.g. Emergency Fund, Goa Trip) with target amount and date, add/withdraw money, schedule tracking ("You're 30% behind schedule — save ₹X/month") and progress rings
- Income, refunds and cash flow: log salary and other income, see savings and savings rate, and move savings into a goal; refunds subtract from spending
- Recurring entries: rent, EMI, subscriptions, maid salary, SIP or salary are added automatically on their day each month (catches up if the app wasn't opened); subscriptions show a yearly total; upcoming bills on the dashboard
- Budget cycle from salary day (e.g. 25th → 25 Oct – 24 Nov) for the dashboard, budgets and stats
- Month-end forecast: daily average and projected total vs budget, including upcoming bills
- Quick-add buttons (Chai ₹20, Metro ₹40…) for one-tap logging with Undo
- Paste a bank / UPI SMS to fill in amount, merchant, date, payment mode and category — parsed on the phone only
- Calendar heatmap with tap-a-day details, and a shareable monthly report card image
- Lent & borrowed tracker with due dates, overdue reminders on the dashboard, one-tap settle and a WhatsApp reminder link
- Split a bill: only your share counts as your expense, and what others owe is tracked automatically
- Light, dark, or match-system appearance (Profile → Appearance, or the sun/moon button on the dashboard)
- Built for India: amounts in ₹ with lakh/crore grouping (₹1,25,000), short forms like ₹1.25L / ₹2.1Cr, Indian date format
- Add, edit, and delete expenses (amount, category, date, note), with one-tap amount buttons (+₹50 … +₹2,000)
- Track how you paid: UPI, Cash, Card, or Net Banking, with a monthly total for each
- Indian default categories: Groceries & Kirana, Food & Chai, Food Delivery, Rent, Petrol, Auto/Cab/Metro, Electricity & Gas, Mobile & Internet, House Help, EMI & Loans, Festivals & Gifts, and more
- Categories with line icons and colours (add, rename, or delete your own)
- Monthly targets per category that carry over to later months automatically
- Overview: spent vs. target, donut chart, per-category progress (green → amber at 75% → red when over)
- Browse any month, filter expenses by category
- Backup/restore (.json) and CSV export
- Installable PWA: an in-app banner offers to install (one-tap on Android/Chrome/Edge, step-by-step guide on iPhone), works offline, shows a "New version available" banner after updates, and has home-screen shortcuts (Add expense, Stats, Plan)

## Use it on your Mac
Double-click `index.html`. It opens in your browser and works right away.
(Offline mode and installing as an app need it to be served over http/https. See below.)

To test the full PWA locally:
```
cd expense-tracker
python3 -m http.server 8080
```
Then open http://localhost:8080

## Put it on your iPhone
iPhone needs the page served over HTTPS once. Any free static host works. The host only serves the app files; **your expense data never leaves your phone**.

Easiest: go to https://app.netlify.com/drop and drag the `expense-tracker` folder in. (GitHub Pages or Cloudflare Pages also work.)

Then on your iPhone:
1. Open the URL in **Safari**
2. Tap **Share → Add to Home Screen**
3. Open it from the Home Screen icon. It runs full-screen and offline.

## Important about on-device data
- Data lives in the browser on that device. Your iPhone and your Mac each keep their **own** separate data.
- Clearing Safari website data deletes it. Use **Settings → Export backup** now and then (save it to Files/iCloud Drive), and use **Restore backup** to bring it back or move it to another device.
- Installing to the Home Screen keeps iOS from removing the data automatically.

## Files
| File | Purpose |
|---|---|
| `index.html` | Page structure: dialogs, tab bar, and the script/style links |
| `css/app.css` | All styles, light/dark themes and animations |
| `js/core.js` | On-device storage (IndexedDB), icons, India defaults, state, helpers, budget cycle, theme |
| `js/views.js` | Screens: dashboard, stats, budget, profile, transactions, categories, lent & borrowed |
| `js/features.js` | Savings goals, recurring & subscriptions, quick-add, calendar heatmap, report card |
| `js/forms.js` | Add/edit sheet, SMS paste, categories, sheets, backup & CSV |
| `js/main.js` | Install banner, first-time setup, swipe actions, event handling, start-up |
| `sw.js` | Service worker that caches the app files for offline use |
| `manifest.webmanifest` | App name/icon for installing |
| `icon*.png`, `icon.svg` | App icons |

If you add a new file, also add it to `ASSETS` in `sw.js`. When you change anything, bump `CACHE` in `sw.js` (e.g. `v5` → `v6`) before deploying. Installed apps then show a "New version available — Reload" banner.

`_headers` tells Cloudflare Pages not to cache `sw.js`, so updates reach phones quickly.
