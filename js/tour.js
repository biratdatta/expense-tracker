/* Expense Tracker — Guided tour. Loaded in order: core → views → features → forms → tour → main.
   HOW TO KEEP THE TOUR UP TO DATE
   • Every step points at a stable `data-tour="…"` marker in the UI, never at styling classes.
   • When you add a feature: add a `data-tour` marker to it and a step below with `since: <next TOUR_VERSION>`,
     then bump TOUR_VERSION. People who already took the tour get a short “What's new” tour of just those steps.
   • tests/calc.test.js walks every step in Basic and Advanced mode and fails if a marker is missing,
     or if a `data-tour` marker exists in the UI without a step. */
'use strict';

const TOUR_VERSION = 1;

/* adv: Advanced mode only · sheet: inside the Add sheet · optional: only exists with some data (falls back to a centred tip) */
const TOUR_STEPS = [
  { id: 'intro', kind: 'intro', since: 1, title: 'Welcome to Expenses 👋', text: 'A quick tour of everything the app can do. It takes about a minute — you can skip anytime.' },
  // Home
  { id: 'home-hero', view: 'home', target: 'home-hero', since: 1, title: 'Your month at a glance', text: 'How much you’ve spent this month, your budget, what’s left, and how much you can spend per day to stay on track.' },
  { id: 'home-forecast', view: 'home', target: 'home-forecast', adv: true, optional: true, since: 1, title: 'Month-end forecast', text: 'Your daily average and where you’ll land by month-end at this pace — including bills that are still due.' },
  { id: 'home-cashflow', view: 'home', target: 'home-cashflow', adv: true, optional: true, since: 1, title: 'Cash flow & savings', text: 'Income vs spending, how much you saved and your savings rate. Move your savings into a goal in one tap.' },
  { id: 'home-quick', view: 'home', target: 'home-quick', adv: true, since: 1, title: 'Quick add', text: 'One-tap buttons for things you buy often, like chai or metro. Tap to log instantly — there’s an Undo if you slip.' },
  { id: 'home-period', view: 'home', target: 'home-period', since: 1, title: 'Where your money goes', text: 'Switch between Day, Week, Month and Year to see your spending split by category.' },
  { id: 'home-recent', view: 'home', target: 'home-recent', optional: true, since: 1, title: 'Recent transactions', text: 'Tap any entry to edit it. Swipe left on it for quick Edit and Delete buttons.' },
  { id: 'search', view: 'home', target: 'search', since: 1, title: 'Search everything', text: 'Find any transaction by name, category, amount or payment mode — with filters for type, amount and dates.' },
  // Add sheet
  { id: 'fab', view: 'home', target: 'fab', since: 1, title: 'Add an expense', text: 'Tap + anytime to log something. Let’s look inside.' },
  { id: 'add-kind', sheet: true, target: 'add-kind', adv: true, since: 1, title: 'Expense, income or refund', text: 'Log money going out, salary or other income coming in, and refunds that reduce your spending.' },
  { id: 'add-sms', sheet: true, target: 'add-sms', adv: true, since: 1, title: 'Paste a bank SMS', text: 'Copy a debit/UPI SMS and paste it — amount, merchant, date and category are filled in for you. It’s read on your phone only.' },
  { id: 'add-amount', sheet: true, target: 'add-amount', since: 1, title: 'Amount', text: 'Type the amount — commas appear as you type (11,11,111). The buttons below add ₹50, ₹100… quickly.' },
  { id: 'add-category', sheet: true, target: 'add-category', since: 1, title: 'Category', text: 'Pick what it was for. You can add your own categories with icons and colours in Profile.' },
  { id: 'add-pay', sheet: true, target: 'add-pay', since: 1, title: 'Paid via', text: 'UPI, Cash, Card or Net Banking — so you can see how you pay each month.' },
  { id: 'add-options', sheet: true, target: 'add-options', adv: true, since: 1, title: 'Repeat, split & quick-add', text: 'Make it repeat every month (rent, Netflix, salary), split a bill so only your share counts, or save it as a quick-add button.' },
  // Stats
  { id: 'stats-period', view: 'stats', target: 'stats-period', since: 1, title: 'Statistics', text: 'Look at any week, month or year, and use the arrows to go back in time.' },
  { id: 'stats-flow', view: 'stats', target: 'stats-flow', since: 1, title: 'Spending flow', text: 'Your spending day by day, compared with the previous period. Tap a bar to see that day’s total.' },
  { id: 'stats-calendar', view: 'stats', prep: () => { S.period = 'month'; S.statsOffset = 0; }, target: 'stats-calendar', adv: true, since: 1, title: 'Calendar', text: 'Each day is coloured by how much you spent. Tap a day to see what you bought. It also counts your no-spend days.' },
  { id: 'stats-report', view: 'stats', prep: () => { S.period = 'month'; S.statsOffset = 0; }, target: 'stats-report', adv: true, optional: true, since: 1, title: 'Monthly report card', text: 'Your month in one shareable image — total, top category, biggest day and savings.' },
  // Budget
  { id: 'budget-total', view: 'budget', target: 'budget-total', since: 1, title: 'Budget', text: 'One monthly budget with a ring showing how much you’ve used. Budgets carry over to next month automatically.' },
  { id: 'budget-edit', view: 'budget', target: 'budget-edit', since: 1, title: 'Set your budget', text: 'Set one overall number, and optional limits only for categories you want to watch.', textAdv: 'Set one overall number, optional category limits, or base it on your income — e.g. always 70% of what you earn.' },
  // Plan
  { id: 'plan-add', view: 'plan', target: 'plan-add', adv: true, since: 1, title: 'Savings goals', text: 'Create goals like an emergency fund or a Goa trip, add money as you save, and see if you’re on schedule.' },
  // Profile
  { id: 'profile-mode', view: 'profile', target: 'row-edit-mode', since: 1, title: 'Basic or Advanced', text: 'Basic keeps things simple. Advanced unlocks everything. Switching never deletes any data.' },
  { id: 'profile-recurring', view: 'profile', target: 'row-to-recurring', adv: true, since: 1, title: 'Recurring & subscriptions', text: 'Rent, EMI, subscriptions and salary are added automatically on their day. See your yearly subscription total too.' },
  { id: 'profile-ious', view: 'profile', target: 'row-to-ious', adv: true, since: 1, title: 'Lent & borrowed', text: 'Track who owes whom, with due dates, reminders and a WhatsApp nudge. Settle in one tap.' },
  { id: 'profile-cycle', view: 'profile', target: 'row-edit-cycle', adv: true, since: 1, title: 'Salary-day cycle', text: 'Paid on the 25th? Start your budget month on salary day so everything matches your real money cycle.' },
  { id: 'profile-backup', view: 'profile', target: 'row-export-json', since: 1, title: 'Back up your data', text: 'Everything lives only on this phone. Export a backup now and then — and restore it on a new phone.' },
  { id: 'profile-tour', view: 'profile', target: 'row-start-tour', since: 1, title: 'Replay this tour', text: 'Come back here anytime to take the tour again.' },
  { id: 'outro', kind: 'outro', since: 1, title: 'You’re all set! 🎉', text: 'Tap + to add your first expense. Happy tracking!' },
];

const T = { on: false, list: [], i: 0, openedSheet: false, scope: 'full', busy: false };

/* scope: 'full' (everything for the current mode) · 'advanced' (just the Advanced features) · 'new' (steps added since last seen) */
function tourSteps(scope = 'full') {
  const adv = isAdvanced(), seen = +S.settings.tourSeen || 0;
  let list = TOUR_STEPS.filter(s => adv || !s.adv);
  if (scope === 'advanced') list = list.filter(s => s.kind || s.adv);
  if (scope === 'new') list = list.filter(s => s.kind || s.since > seen);
  return list.filter(s => !s.kind || list.some(x => !x.kind));   // drop intro/outro if nothing else is left
}
function tourText(s) {
  if (s.kind === 'intro' && T.scope === 'advanced') return { title: 'Advanced features ✨', text: 'Here’s what Advanced mode adds. Takes under a minute.' };
  if (s.kind === 'intro' && T.scope === 'new') return { title: 'What’s new ✨', text: `${T.list.filter(x => !x.kind).length} new things since your last tour. Let’s take a look.` };
  if (s.kind === 'outro' && T.scope !== 'full') return { title: 'That’s it! 🎉', text: 'Replay the full tour anytime from Profile → Take the tour.' };
  return { title: s.title, text: (isAdvanced() && s.textAdv) || s.text };
}
/* Is the step's marker actually showing? (not hidden, not display:none, not inside a closed dialog) */
function tourVisible(el) {
  const dlg = el.closest('dialog'); if (dlg && !dlg.open) return false;
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) { if (n.hidden || getComputedStyle(n).display === 'none') return false; }
  return true;
}
const tourEl = s => { const el = s.target && document.querySelector(`[data-tour="${s.target}"]`); return el && tourVisible(el) ? el : null; };

/* Gets the screen ready for a step (navigation / opening the Add sheet) and returns its target, or null. Never changes data. */
function tourPrepare(i) {
  const s = T.list[i]; if (!s) return null;
  if (s.sheet) {
    if (!$('txDlg').open) { openExpense(); T.openedSheet = true; }
  } else if (T.openedSheet && $('txDlg').open) { $('txDlg').close(); T.openedSheet = false; }
  if (s.view) {
    const need = S.view !== s.view || S.sub || (s.prep && true);
    if (s.prep) s.prep();
    if (need) { S.sub = null; S.view = s.view; S.budgetEdit = false; render(); window.scrollTo(0, 0); }
    if (!tourEl(s)) render();   // screen may be stale (e.g. data or mode changed) — redraw once and look again
  }
  return tourEl(s);
}

function tourDom() {
  if ($('tourDlg')) return;
  document.body.insertAdjacentHTML('beforeend', `<dialog id="tourDlg" class="tour" aria-label="Guided tour">
    <div class="tspot" id="tourSpot"></div>
    <div class="ttip" id="tourTip" role="document"><div class="tprog"><span id="tourStep"></span><div class="tbar"><i id="tourBar"></i></div></div>
      <h4 id="tourTitle"></h4><p id="tourText"></p>
      <div class="tact"><button type="button" class="lnk" data-action="tour-skip" id="tourSkip" style="color:var(--muted)">Skip tour</button><span style="flex:1"></span>
        <button type="button" class="btn ghost" data-action="tour-back" id="tourBack">Back</button><button type="button" class="btn" data-action="tour-next" id="tourNext">Next</button></div></div>
  </dialog>`);
  $('tourDlg').addEventListener('cancel', e => { e.preventDefault(); endTour(); });
  window.addEventListener('resize', () => T.on && tourPlace());
  document.addEventListener('scroll', () => T.on && tourPlace(), true);   // any scroll (page or sheet) → follow the target
}

function startTour(scope = 'full') {
  if (T.on) return;
  T.scope = scope; T.list = tourSteps(scope); T.i = 0; T.openedSheet = false;
  if (!T.list.length) return toast('You’ve seen everything already');
  tourDom(); hideBanner();
  ['sheetDlg', 'catDlg', 'goalDlg'].forEach(id => $(id).open && $(id).close());
  T.on = true; $('tourDlg').showModal(); $('tourDlg').classList.add('show');
  tourShow(0);
}
function tourShow(i) {
  T.i = Math.max(0, Math.min(i, T.list.length - 1));
  const s = T.list[T.i], el = tourPrepare(T.i);
  // The tour layer must sit above the Add sheet when it's open (both are top-layer dialogs)
  if (s.sheet && $('txDlg').open) { $('tourDlg').close(); $('tourDlg').showModal(); }
  const { title, text } = tourText(s);
  $('tourStep').textContent = `${T.i + 1} of ${T.list.length}`;
  $('tourBar').style.width = `${(T.i + 1) / T.list.length * 100}%`;
  $('tourTitle').textContent = title; $('tourText').textContent = text;
  $('tourBack').style.visibility = T.i ? 'visible' : 'hidden';
  $('tourNext').textContent = T.i === T.list.length - 1 ? 'Done' : T.i === 0 ? 'Start' : 'Next';
  $('tourSkip').style.visibility = T.i === T.list.length - 1 ? 'hidden' : 'visible';
  $('tourTip').classList.remove('in'); void $('tourTip').offsetWidth; $('tourTip').classList.add('in');
  if (el) { try { el.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch {} }   // instant scroll so the measurement is right; the spotlight itself animates
  tourPlace();
  clearTimeout(T.t1); clearTimeout(T.t2);
  T.t1 = setTimeout(tourPlace, 120); T.t2 = setTimeout(tourPlace, 450);   // re-measure after scrolling / entrance animation
  setTimeout(() => $('tourNext')?.focus({ preventScroll: true }), 50);
}
function tourPlace() {
  if (!T.on) return;
  const s = T.list[T.i], el = tourEl(s), spot = $('tourSpot'), tip = $('tourTip'), W = innerWidth, H = innerHeight, pad = 8;
  const th = tip.offsetHeight || 180;
  if (!el) {   // centred tip (intro/outro, or the feature has no data yet)
    spot.classList.add('center'); Object.assign(spot.style, { left: W / 2 + 'px', top: H / 2 + 'px', width: '0px', height: '0px' });
    tip.style.top = Math.max(16, (H - th) / 2) + 'px'; return;
  }
  spot.classList.remove('center');
  const r = el.getBoundingClientRect(), x = Math.max(6, r.left - pad), y = Math.max(6, r.top - pad);
  const w = Math.min(W - 12, r.width + pad * 2), h = Math.min(H - 12, r.height + pad * 2);
  const radius = Math.min(24, parseFloat(getComputedStyle(el).borderRadius) + pad || 16);
  Object.assign(spot.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', borderRadius: radius + 'px' });
  let top = y + h + 14;
  if (top + th > H - 12) top = y - th - 14;            // not enough room below → above
  if (top < 12 || top + th > H - 12) top = Math.max(12, H - th - 16);   // big or off-screen target → pin to the bottom, always visible
  tip.style.top = top + 'px';
}
function tourNext() { if (T.i >= T.list.length - 1) return endTour(true); tourShow(T.i + 1); }
function tourBack() { tourShow(T.i - 1); }
async function endTour(finished) {
  if (!T.on) return;
  T.on = false; clearTimeout(T.t1); clearTimeout(T.t2);
  $('tourDlg').classList.remove('show'); $('tourDlg').close();
  if (T.openedSheet && $('txDlg').open) $('txDlg').close();
  T.openedSheet = false;
  await setSetting('tourSeen', TOUR_VERSION);
  if (isAdvanced()) await setSetting('tourAdvSeen', TOUR_VERSION);
  go('home');
  toast(finished ? 'Tour done — replay it anytime from Profile' : 'Tour skipped — replay it anytime from Profile');
}

/* Dashboard card that offers the tour: first time for existing users, and “What's new” after updates that add steps. */
function tourOfferCard() {
  if (T.on || !S.settings.onboarded) return '';
  const seen = +S.settings.tourSeen || 0;
  if (seen >= TOUR_VERSION) return '';
  const fresh = !seen, n = fresh ? 0 : tourSteps('new').filter(s => !s.kind).length;
  if (!fresh && !n) return '';
  return `<section class="card insight" data-tour-offer><span class="ib">${icon('sparkles', 22)}</span><div style="flex:1">
    <b>${fresh ? 'New here? Take a 1-minute tour' : `What’s new: ${n} new thing${n === 1 ? '' : 's'}`}</b><div class="muted" style="font-size:13px;margin-top:2px">${fresh ? 'See everything the app can do, step by step.' : 'A quick look at what changed since your last tour.'}</div>
    <div style="display:flex;gap:10px;margin-top:12px"><button class="setbtn" data-action="start-tour" data-scope="${fresh ? 'full' : 'new'}">${fresh ? 'Start tour' : 'Show me'}</button><button class="lnk" data-action="tour-later" style="color:var(--muted)">Not now</button></div></div></section>`;
}
