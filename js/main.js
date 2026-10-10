/* Expense Tracker — Install banner, first-time setup, swipe actions, events, boot. Loaded in order: core → views → features → forms → main. */
'use strict';
/* ================= Install as app (PWA) + update banner ================= */
let deferredPrompt = null;      // Android / Chrome / Edge install prompt, captured for our own button
const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function installMode() { if (isStandalone()) return 'installed'; if (deferredPrompt) return 'prompt'; if (isIOS()) return 'ios'; return 'manual'; }
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const snoozed = () => Date.now() - (+lsGet('installSnoozed') || 0) < 7 * 864e5;

function showBanner(kind) {
  if (document.querySelector('dialog[open]')) { setTimeout(() => showBanner(kind), 4000); return; } // don't cover a form
  const b = $('banner'); let html;
  if (kind === 'update') html = `<div class="row"><span class="ic" style="background:var(--accent-soft);color:var(--accent);width:54px;height:54px;border-radius:15px">${icon('refresh', 26)}</span>
      <div><div class="bt">New version available</div><div class="bd">Reload to get the latest features. Your data is safe.</div></div>
      <button class="x" data-action="banner-close" aria-label="Close">${icon('x', 18, 2.2)}</button></div>
    <div class="ba"><button class="btn" data-action="reload">Reload now</button></div>`;
  else if (kind === 'prompt') html = `<div class="row"><img src="icon-192.png" alt="">
      <div><div class="bt">Install Expenses</div><div class="bd">Add it to your home screen — opens instantly, works offline, no app store needed.</div></div>
      <button class="x" data-action="install-later" aria-label="Close">${icon('x', 18, 2.2)}</button></div>
    <div class="ba"><button class="btn ghost" data-action="install-later">Not now</button><button class="btn" data-action="install">${icon('download', 18, 2.2)} Install</button></div>`;
  else if (kind === 'ios') html = `<div class="row"><img src="apple-touch-icon.png" alt="">
      <div><div class="bt">Install on your iPhone</div><div class="bd">Tap ${icon('share', 18, 2)} <b>Share</b>, then ${icon('plusSquare', 18, 2)} <b>Add to Home Screen</b>. It works offline and keeps your data safe.</div></div>
      <button class="x" data-action="install-later" aria-label="Close">${icon('x', 18, 2.2)}</button></div>
    <div class="ba"><button class="btn ghost" data-action="install-later">Later</button><button class="btn" data-action="install-help">Show me how</button></div>`;
  else return;
  b.innerHTML = html; b.hidden = false; b.dataset.kind = kind; document.body.classList.add('has-banner');
}
function hideBanner() { $('banner').hidden = true; document.body.classList.remove('has-banner'); }
function maybeOfferInstall() { const m = installMode(); if ((m === 'prompt' || m === 'ios') && !snoozed() && $('banner').hidden) showBanner(m); }

async function doInstall() {
  if (deferredPrompt) {
    hideBanner(); deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice.catch(() => ({}));
    deferredPrompt = null;
    if (outcome !== 'accepted') lsSet('installSnoozed', Date.now());
    render();
  } else { hideBanner(); openSheet('install'); }
}
function installSheetHTML() {
  const m = installMode();
  if (m === 'installed') return `<h3>Already installed ✓</h3><p class="note" style="margin:0 2px 18px;font-size:14px">You’re using the installed app. Find it on your home screen anytime.</p><div class="sactions"><button type="button" class="btn" data-action="close-dlg">OK</button></div>`;
  if (m === 'ios') return `<h3>Add to Home Screen</h3>
    <ol class="steps"><li><span>Tap the ${icon('share', 22, 2)} <b>Share</b> button in Safari’s toolbar</span></li>
      <li><span>Scroll down and tap ${icon('plusSquare', 22, 2)} <b>Add to Home Screen</b></span></li>
      <li><span>Tap <b>Add</b> — the Expenses icon appears on your home screen</span></li></ol>
    <p class="note" style="margin:-6px 2px 16px">Using Chrome on iPhone? The Share button is in the address bar. Open the app from the new icon from now on — that copy keeps your data long-term.</p>
    <div class="sactions"><button type="button" class="btn" data-action="close-dlg">Got it</button></div>`;
  return `<h3>Install the app</h3>
    <ol class="steps"><li><span><b>Android (Chrome):</b> menu ⋮ → <b>Install app</b> / <b>Add to Home screen</b></span></li>
      <li><span><b>Chrome / Edge on computer:</b> click the install icon ${icon('download', 20, 2)} in the address bar</span></li>
      <li><span><b>Safari on Mac:</b> File → <b>Add to Dock</b></span></li></ol>
    <p class="note" style="margin:-6px 2px 16px">Installing needs the app to be opened from its https:// address (e.g. your pages.dev link), not as a local file.</p>
    <div class="sactions"><button type="button" class="btn" data-action="close-dlg">Got it</button></div>`;
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e;            // use our own banner instead of the browser mini-bar
  setTimeout(maybeOfferInstall, 2500);
  if (S.view === 'profile') render();
});
window.addEventListener('appinstalled', () => { deferredPrompt = null; hideBanner(); toast('App installed 🎉 Find it on your home screen'); render(); });

/* ================= First-time setup ================= */
const ONB = { step: 0, name: '', day: 1, salary: '', budget: '', mode: 'basic' };
const onbSteps = () => ONB.mode === 'advanced' ? ['welcome', 'payday', 'budget'] : ['welcome', 'budget'];
function openOnboarding() {
  Object.assign(ONB, { dir: 1, step: 0, name: S.settings.name || '', day: cycleDay(), salary: '', budget: '', mode: appMode() });
  renderOnb(); if (!$('onbDlg').open) $('onbDlg').showModal();
}
function renderOnb() {
  const steps = onbSteps(); ONB.step = Math.min(ONB.step, steps.length - 1);
  const idx = ONB.step, st = { welcome: 0, payday: 1, budget: 2 }[steps[idx]];
  $('onbDots').innerHTML = steps.map((_, i) => `<i class="${i <= idx ? 'on' : ''}"></i>`).join('');
  $('onbBack').classList.toggle('show', idx > 0);
  $('onbNext').textContent = idx === steps.length - 1 ? 'Start tracking' : 'Continue';
  let h = '';
  if (st === 0) h = `<div class="hero-ic">${icon('wallet', 40, 1.8)}</div>
    <h2>Namaste! Let’s set you up</h2><p class="lead">${ONB.mode === 'advanced' ? 'Three' : 'Two'} quick questions and you’re ready. Takes about 30 seconds.</p>
    <ul class="ticks"><li>${icon('check', 20, 2.2)} Everything stays on this phone — no account, no cloud</li><li>${icon('check', 20, 2.2)} Built for ₹, UPI and Indian spending</li><li>${icon('check', 20, 2.2)} Works offline, installs like an app</li></ul>
    <div class="flabel">What should we call you?</div>
    <label class="irow"><input id="onbName" maxlength="40" placeholder="Your name (optional)" value="${esc(ONB.name)}" autocomplete="given-name"></label>
    <div class="flabel" style="margin-top:18px">How much do you want?</div>
    ${[['basic', 'layers', 'Keep it simple', 'Add expenses, a budget and stats'], ['advanced', 'grid', 'Show me everything', 'Plus recurring bills, income, goals, splits, SMS paste…']].map(([k, ic, t, d]) => `<button type="button" class="opt ${ONB.mode === k ? 'on' : ''}" data-action="onb-mode" data-m="${k}"><span class="ic" style="width:40px;height:40px;border-radius:13px;background:var(--accent-soft);color:var(--accent)">${icon(ic, 20)}</span><span style="flex:1">${t}<small style="display:block;font-weight:500;color:var(--muted);font-size:12.5px">${d}</small></span>${ONB.mode === k ? `<span class="ck">${icon('tick', 20, 2.6)}</span>` : ''}</button>`).join('')}
    <p class="note" style="margin:4px 2px 0">You can switch anytime in Profile → App mode.</p>`;
  if (st === 1) { const days = [1, 5, 7, 10, 15, 25, 28];
    h = `<div class="hero-ic">${icon('calendar', 40, 1.8)}</div>
    <h2>When do you get paid?</h2><p class="lead">Your budget month will start on this day, so it matches how your money actually comes in.</p>
    <div class="daygrid">${days.map(d => `<button type="button" class="${ONB.day === d ? 'on' : ''}" data-action="onb-day" data-d="${d}">${ordinal(d)}</button>`).join('')}
      <select id="onbDayOther" aria-label="Other day" style="border-radius:16px;border:1.5px solid ${days.includes(ONB.day) ? 'var(--border)' : 'var(--accent)'};background:var(--surface);color:var(--text);font-weight:700;font-size:15px;text-align:center">
        <option value="">Other</option>${[...Array(28)].map((_, i) => i + 1).filter(d => !days.includes(d)).map(d => `<option value="${d}" ${ONB.day === d ? 'selected' : ''}>${ordinal(d)}</option>`).join('')}</select></div>
    <p class="note" style="margin:0 2px 22px">${ONB.day === 1 ? 'Calendar month: 1st to the last day.' : `Example: ${ordinal(ONB.day)} Oct – ${ordinal(ONB.day - 1)} Nov.`}</p>
    <div class="flabel">Monthly take-home salary <span style="text-transform:none;letter-spacing:0;font-weight:500">(optional)</span></div>
    <label class="bigamt"><span>₹</span><input id="onbSalary" inputmode="decimal" placeholder="e.g. 60,000" value="${esc(groupIN(ONB.salary))}"></label>
    <p class="note" style="margin:0 2px">We’ll add it automatically as income every month on your salary day, so you can see how much you save.</p>`; }
  if (st === 2) { const sal = parseAmount(ONB.salary) || 0, sugg = [15000, 25000, 40000, 60000];
    const s70 = sal ? Math.round(sal * .7 / 1000) * 1000 : 0;
    h = `<div class="hero-ic">${icon('target', 40, 1.8)}</div>
    <h2>Set a monthly budget</h2><p class="lead">One number for all your spending. You can add limits for specific categories later — only if you want.</p>
    <label class="bigamt"><span>₹</span><input id="onbBudget" inputmode="decimal" placeholder="e.g. 30,000" value="${esc(groupIN(ONB.budget))}"></label>
    <div class="chips">${s70 ? `<button type="button" class="chip" data-action="onb-budget" data-v="${s70}">${esc(fmt(s70))} · 70% of salary</button>` : ''}${sugg.filter(v => v !== s70).map(v => `<button type="button" class="chip" data-action="onb-budget" data-v="${v}">${esc(fmt(v))}</button>`).join('')}</div>
    <p class="note" style="margin:6px 2px 0">Not sure? Leave it empty and set it later from the Budget tab.</p>`; }
  $('onbBody').innerHTML = h; $('onbBody').scrollTop = 0;
  $('onbBody').classList.remove('fwd', 'bwd'); void $('onbBody').offsetWidth; $('onbBody').classList.add(ONB.dir === -1 ? 'bwd' : 'fwd');
}
function onbCollect() {
  if ($('onbName')) ONB.name = $('onbName').value.trim();
  if ($('onbSalary')) ONB.salary = $('onbSalary').value.trim();
  if ($('onbBudget')) ONB.budget = $('onbBudget').value.trim();
}
async function onbNext(ev) {
  ev?.preventDefault(); onbCollect();
  if (ONB.salary && !(parseAmount(ONB.salary) > 0)) return toast('Enter a valid salary or leave it empty');
  if (ONB.step < onbSteps().length - 1) { ONB.step++; ONB.dir = 1; return renderOnb(); }
  if (ONB.budget && !(parseAmount(ONB.budget) > 0)) return toast('Enter a valid budget or leave it empty');
  await finishOnboarding();
}
async function finishOnboarding(skipped) {
  if (!skipped) {
    if (ONB.name) await setSetting('name', ONB.name);
    await setSetting('mode', ONB.mode);
    if (ONB.mode === 'advanced') await setSetting('cycleDay', ONB.day);   // Basic keeps whatever cycle is already set
    const m = curCycle();
    const budget = parseAmount(ONB.budget);
    if (budget > 0) { const b = { key: `${m}|${TOTAL_KEY}`, month: m, categoryId: TOTAL_KEY, limit: budget }; await dbPut('budgets', b); S.budgets[b.key] = b; }
    const sal = ONB.mode === 'advanced' ? parseAmount(ONB.salary) : 0;
    if (sal > 0 && !S.recurring.some(r => r.kind === 'income' && r.source === 'Salary')) {
      const cur = thisMonth(), due = dueDate(cur, ONB.day) <= todayStr();
      const rule = { id: uid(), name: 'Salary', amount: sal, kind: 'income', categoryId: null, source: 'Salary', payment: 'Net Banking', day: ONB.day, start: cur, active: true, subscription: false, createdAt: Date.now() };
      if (due) rule.lastPosted = cur; // assume this month's salary already came in before the app
      await dbPut('recurring', rule); S.recurring.push(rule);
    }
  }
  if (!S.settings.mode) await setSetting('mode', 'basic');   // skipped on first run → simple start
  await setSetting('onboarded', true);
  S.month = curCycle(); $('onbDlg').close(); go('home');
  if (!skipped && !(+S.settings.tourSeen >= TOUR_VERSION)) setTimeout(() => startTour('full'), 700);   // first-time users get the tour right after setup
  toast(skipped ? 'You can set things up anytime from Profile' : `You’re all set${ONB.name ? ', ' + ONB.name.split(' ')[0] : ''}! Tap + to add your first expense`);
}

/* ================= Swipe left on a transaction → Edit / Delete ================= */
let swipe = null;
const SWIPE_OPEN = -152;
function closeSwipes(except) { document.querySelectorAll('.sw-wrap.open').forEach(w => { if (w !== except) { w.classList.remove('open'); w.querySelector('.tx').style.transform = ''; } }); }
document.addEventListener('pointerdown', e => {
  if (e.target.closest('.sw-acts')) return;
  const tx = e.target.closest('.sw-wrap > .tx');
  if (!tx) { closeSwipes(); return; }
  const wrap = tx.parentElement;
  swipe = { tx, wrap, x: e.clientX, y: e.clientY, base: wrap.classList.contains('open') ? SWIPE_OPEN : 0, cur: 0, active: false };
});
document.addEventListener('pointermove', e => {
  if (!swipe) return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
  if (!swipe.active) {
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.3) { swipe.active = true; swipe.wrap.classList.add('drag'); closeSwipes(swipe.wrap); }
    else if (Math.abs(dy) > 10) { swipe = null; return; } else return;
  }
  swipe.cur = Math.min(0, Math.max(SWIPE_OPEN - 30, swipe.base + dx));
  swipe.tx.style.transform = `translateX(${swipe.cur}px)`;
});
function endSwipe() {
  if (!swipe) return; const s = swipe; swipe = null;
  if (!s.active) return;
  s.wrap.classList.remove('drag');
  const open = s.cur < SWIPE_OPEN / 2.5;
  s.wrap.classList.toggle('open', open); s.tx.style.transform = open ? `translateX(${SWIPE_OPEN}px)` : '';
  S._swiped = Date.now();
}
document.addEventListener('pointerup', endSwipe);
document.addEventListener('pointercancel', endSwipe);
async function swipeDelete(id) {
  const e = S.expenses.find(x => x.id === id); if (!e) return;
  await dbDel('expenses', id); S.expenses = S.expenses.filter(x => x.id !== id); render();
  toast(`Deleted ${e.note || (isIncome(e) ? e.source : catById(e.categoryId).name)}`, 'Undo', async () => { await dbPut('expenses', e); S.expenses.push(e); render(); toast('Restored'); });
}

/* ================= Basic / Advanced mode ================= */
async function setMode(m) {
  if (m !== 'basic' && m !== 'advanced') return;
  const changed = m !== appMode();
  await setSetting('mode', m);
  // Reset anything that only exists in Advanced so nothing is left half-applied
  if (m === 'basic') { S.txAdv = { min: '', max: '', from: '', to: '' }; S.txPanel = false; if (S.txFilter.startsWith('kind:')) S.txFilter = ''; S.calDay = null; }
  if ($('sheetDlg').open) $('sheetDlg').close();
  closeSwipes(); S.anim = 'enter'; render(); window.scrollTo(0, 0);
  if (changed && m === 'advanced' && !(+S.settings.tourAdvSeen >= TOUR_VERSION)) toast('Advanced mode on — all features unlocked', 'Take the tour', () => startTour('advanced'));
  else if (changed) toast(m === 'advanced' ? 'Advanced mode on — all features unlocked' : 'Basic mode on — your data from advanced features is kept');
}

/* ================= Income-linked budget ================= */
async function budgetFromIncome(pct) {
  const m = S.month, b = incomeBasis(m); if (!(b.amount > 0)) return toast('No income found yet');
  if (autoIncome()) { await setSetting('incomeBudget', { ...autoIncome(), pct }); render(); return toast(`Budget now follows ${pct}% of income: ${fmt(autoBudget(m))}`); }
  const limit = Math.round(b.amount * pct / 100 / 100) * 100, bud = { key: `${m}|${TOTAL_KEY}`, month: m, categoryId: TOTAL_KEY, limit };
  await dbPut('budgets', bud); S.budgets[bud.key] = bud; render(); toast(`Monthly budget set to ${fmt(limit)} (${pct}% of income)`);
}
async function setAutoIncome(on) {
  const m = S.month, cur = curCycle();
  if (on) {
    if (!(incomeBasis(m).amount > 0)) { render(); return toast('Log your income first'); }
    await setSetting('incomeBudget', { pct: autoIncome()?.pct || 80, since: m < cur ? m : cur });
    render(); return toast(`Budget will stay at ${autoIncome().pct}% of income every month`);
  }
  // Turning off: freeze the automatic amounts as normal budgets so past and current months don't jump
  const A = autoIncome(); if (!A) return render();
  const frozen = [];
  for (let k = A.since || cur, i = 0; k <= cur && i < 240; k = shiftMonth(k, 1), i++) { const v = autoBudget(k); if (v > 0) frozen.push({ key: `${k}|${TOTAL_KEY}`, month: k, categoryId: TOTAL_KEY, limit: v }); }
  if (frozen.length) { await dbPut('budgets', ...frozen); frozen.forEach(b => S.budgets[b.key] = b); }
  await setSetting('incomeBudget', null); render(); toast('Automatic budget off — kept your current amount');
}

/* ================= Events ================= */
function go(view, sub = null) { S.view = view; S.sub = sub; S.budgetEdit = false; S.anim = 'enter'; render(); window.scrollTo(0, 0); }
const reduceMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function countUps() {
  if (reduceMotion() || typeof requestAnimationFrame !== 'function') return;
  document.querySelectorAll('#main .countup').forEach(el => {
    const target = parseAmount(el.textContent); if (!(target > 0)) return;
    const t0 = performance.now(), dur = 750;
    const step = now => { const p = Math.min(1, (now - t0) / dur), k = 1 - Math.pow(1 - p, 3);
      el.textContent = p < 1 ? fmt(Math.round(target * k)) : fmt(target); if (p < 1) requestAnimationFrame(step); };
    el.textContent = fmt(0); requestAnimationFrame(step);
  });
}
const haptic = (ms = 10) => { try { navigator.vibrate?.(ms); } catch {} };
document.addEventListener('click', e => {
  if (S._swiped && Date.now() - S._swiped < 400 && e.target.closest('.tx')) { e.preventDefault(); return; }   // a drag, not a tap
  if (e.target.closest('.sw-wrap.open > .tx')) { closeSwipes(); return; }                                       // tap an open row to close it
  const t = e.target.closest('[data-action],[data-view]'); if (!t) return;
  if (t.dataset.view) { if (t.dataset.view === 'budget') S.month = curCycle(); go(t.dataset.view); return; }
  const id = t.dataset.id;
  switch (t.dataset.action) {
    case 'add': openExpense(); break;
    case 'tx-kind': S.txKind = t.dataset.k; applyKindUI(); break;
    case 'swipe-del': swipeDelete(id); break;
    case 'onb-back': onbCollect(); ONB.step = Math.max(0, ONB.step - 1); ONB.dir = -1; renderOnb(); break;
    case 'onb-skip': finishOnboarding(true); break;
    case 'onb-day': onbCollect(); ONB.day = +t.dataset.d; renderOnb(); break;
    case 'onb-budget': $('onbBudget').value = moneyVal(t.dataset.v); ONB.budget = t.dataset.v; break;
    case 'run-setup': openOnboarding(); break;
    case 'onb-mode': onbCollect(); ONB.mode = t.dataset.m; renderOnb(); break;
    case 'edit-mode': openSheet('mode'); break;
    case 'set-mode': setMode(t.dataset.m); break;
    case 'start-tour': startTour(t.dataset.scope || 'full'); break;
    case 'tour-next': tourNext(); break;
    case 'tour-back': tourBack(); break;
    case 'tour-skip': endTour(false); break;
    case 'tour-later': setSetting('tourSeen', TOUR_VERSION).then(() => { render(); toast('Find it anytime in Profile → Take the tour'); }); break;
    case 'budget-from-income': budgetFromIncome(+t.dataset.pct); break;
    case 'auto-income-off': setAutoIncome(false); break;
    case 'leftover-move': S.pendingLeftover = t.dataset.k; S.moveAmt = +t.dataset.amt; openSheet('pickgoal'); break;
    case 'leftover-goal': setSetting('leftoverDone', { ...(S.settings.leftoverDone || {}), [t.dataset.k]: true }).then(() => go('plan')).then(() => openGoalEditor(null, GOAL_SUGGESTIONS[0])); break;
    case 'leftover-dismiss': setSetting('leftoverDone', { ...(S.settings.leftoverDone || {}), [t.dataset.k]: true }).then(() => { render(); toast('Okay — I’ll ask again next month'); }); break;
    case 'hide-nudge': setSetting('hideAdvNudge', true).then(() => { render(); toast('Find more in Profile → App mode'); }); break;
    case 'add-income': openExpense(null, { kind: 'income' }); break;
    case 'quick-add': quickAdd(id); break;
    case 'to-favs': go(S.view, 'favs'); break;
    case 'add-fav': S.editingFav = null; openSheet('fav'); break;
    case 'edit-fav': S.editingFav = favorites().find(f => f.id === id); openSheet('fav'); break;
    case 'delete-fav': if (confirm('Remove this quick-add button?')) setSetting('favorites', favorites().filter(f => f.id !== S.editingFav.id)).then(() => { $('sheetDlg').close(); render(); }); break;
    case 'to-recurring': go(S.view, 'recurring'); break;
    case 'add-rule': S.editingRule = null; S.ruleIdea = null; openSheet('rule'); break;
    case 'rule-idea': S.editingRule = null; S.ruleIdea = RULE_IDEAS[+t.dataset.i]; openSheet('rule'); break;
    case 'edit-rule': S.editingRule = S.recurring.find(r => r.id === id); S.ruleIdea = null; openSheet('rule'); break;
    case 'delete-rule': deleteRule(); break;
    case 'rule-kind': { $('rKind').value = t.dataset.k; t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); const inc = t.dataset.k === 'income'; $('rCatRow').hidden = inc; $('rSubRow').hidden = inc; $('rSrcRow').hidden = !inc; break; }
    case 'edit-cycle': openSheet('cycle'); break;
    case 'to-ious': go(S.view, 'ious'); break;
    case 'add-iou': S.editingIou = null; openSheet('iou'); break;
    case 'open-iou': S.iouId = id; openSheet('iou-detail'); break;
    case 'edit-iou': S.editingIou = S.ious.find(i => i.id === id); openSheet('iou'); break;
    case 'iou-dir': { $('iDir').value = t.dataset.k; t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); break; }
    case 'settle-iou': setIou(id, { settled: true, settledAt: Date.now() }).then(n => { $('sheetDlg').close(); render(); toast(`Settled with ${n.person}`, 'Undo', () => setIou(id, { settled: undefined, settledAt: undefined }).then(render)); }); break;
    case 'unsettle-iou': setIou(id, { settled: undefined, settledAt: undefined }).then(() => { $('sheetDlg').close(); render(); }); break;
    case 'delete-iou': if (confirm('Delete this entry?')) dbDel('ious', id).then(() => { S.ious = S.ious.filter(i => i.id !== id); $('sheetDlg').close(); render(); toast('Deleted'); }); break;
    case 'save-to-goal': S.pendingLeftover = null; S.moveAmt = +t.dataset.amt; openSheet('pickgoal'); break;
    case 'pick-goal': S.goalId = id; S.contribSign = 1; openSheet('contrib'); setTimeout(() => { $('contribAmt').value = moneyVal(S.moveAmt); $('contribNote').value = 'Monthly savings'; }, 0); break;
    case 'cal-day': S.calDay = t.dataset.d === S.calDay ? null : t.dataset.d; render(); break;
    case 'report': openReport(); break;
    case 'share-report': shareReport(); break;
    case 'split-n': S.splitN = Math.min(20, Math.max(2, S.splitN + +t.dataset.d)); syncOptions(); break;
    case 'paste-sms': pasteSms(); break;
    case 'sms-fill': { const p = parseSms($('smsText').value); $('sheetDlg').close(); applyParsed(p); break; }
    case 'edit-expense': openExpense(id); break;
    case 'delete-expense': deleteExpense(); break;
    case 'quick-amt': $('txAmount').value = moneyVal(round2((parseAmount($('txAmount').value) || 0) + Number(t.dataset.amt))); syncOptions(); break;
    case 'close-dlg': t.closest('dialog').close(); break;
    case 'back': S.sub = null; S.anim = 'enter'; render(); window.scrollTo(0, 0); break;
    case 'home-period': S.homePeriod = t.dataset.p; S.anim = 'charts'; render(); break;
    case 'to-stats': S.period = S.homePeriod === 'day' ? 'week' : S.homePeriod; S.statsOffset = 0; go('stats'); break;
    case 'to-tx': S.txFilter = ''; S.txSearch = ''; S.txAdv = { min: '', max: '', from: '', to: '' }; S.txPanel = false; go(S.view, 'transactions'); break;
    case 'goto-cat': S.txFilter = 'cat:' + id; S.txSearch = ''; go(S.view, 'transactions'); break;
    case 'tx-filter': S.txFilter = t.dataset.k; render(); break;
    case 'tx-clear': S.txFilter = ''; S.txSearch = ''; render(); break;
    case 'tx-panel': S.txPanel = !S.txPanel; render(); break;
    case 'tx-adv-clear': S.txAdv = { min: '', max: '', from: '', to: '' }; render(); break;
    case 'tx-date': { const [a, b] = datePreset(t.dataset.k); const same = S.txAdv.from === a && S.txAdv.to === b; S.txAdv.from = same ? '' : a; S.txAdv.to = same ? '' : b; render(); break; }
    case 'stats-period': S.period = t.dataset.p; S.statsOffset = 0; S.anim = 'charts'; render(); break;
    case 'stats-prev': S.statsOffset--; S.calDay = null; S.anim = 'charts'; render(); break;
    case 'stats-next': if (S.statsOffset < 0) { S.statsOffset++; S.calDay = null; S.anim = 'charts'; render(); } break;
    case 'stats-today': S.statsOffset = 0; render(); break;
    case 'bar': { const b = S._bars[+t.dataset.i]; document.querySelectorAll('.bcol.sel').forEach(x => x.classList.remove('sel')); t.classList.add('sel'); $('barInfo').innerHTML = `${esc(b.full)} · <b>${esc(fmt(b.v))}</b>`; break; }
    case 'month-prev': S.month = shiftMonth(S.month, -1); S.anim = 'charts'; render(); break;
    case 'month-next': S.month = shiftMonth(S.month, 1); S.anim = 'charts'; render(); break;
    case 'budget-edit': S.budgetEdit = !S.budgetEdit; render(); if (S.budgetEdit && t.dataset.focus === 'overall') setTimeout(() => $('overallInput')?.focus(), 60); break;
    case 'to-cats': go('profile', 'categories'); break;
    case 'open-cat': openCat(id); break;
    case 'add-cat': openCat(); break;
    case 'delete-cat': deleteCat(); break;
    case 'edit-name': openSheet('name'); break;
    case 'edit-payment': openSheet('payment'); break;
    case 'privacy': openSheet('privacy'); break;
    case 'edit-theme': openSheet('theme'); break;
    case 'install': doInstall(); break;
    case 'install-help': hideBanner(); openSheet('install'); break;
    case 'install-later': lsSet('installSnoozed', Date.now()); hideBanner(); break;
    case 'banner-close': hideBanner(); break;
    case 'reload': location.reload(); break;
    case 'add-goal': openGoalEditor(); break;
    case 'suggest-goal': openGoalEditor(null, GOAL_SUGGESTIONS[+t.dataset.i]); break;
    case 'edit-goal': openGoalEditor(id); break;
    case 'delete-goal': deleteGoal(); break;
    case 'open-goal': S.goalId = id; openSheet('goal'); break;
    case 'contrib': S.pendingLeftover = null; S.goalId = id; S.contribSign = +t.dataset.sign; openSheet('contrib'); break;
    case 'contrib-quick': $('contribAmt').value = moneyVal(round2((parseAmount($('contribAmt').value) || 0) + Number(t.dataset.amt))); break;
    case 'del-contrib': deleteContribution(id); break;
    case 'set-theme': setTheme(t.dataset.t).then(() => { $('sheetDlg').close(); toast(`Appearance: ${THEMES.find(x => x[0] === t.dataset.t)[2]}`); }); break;
    case 'toggle-theme': setTheme(effectiveTheme() === 'dark' ? 'light' : 'dark'); break;
    case 'set-payment': setSetting('defaultPayment', t.dataset.m).then(() => { $('sheetDlg').close(); render(); toast('Default payment: ' + t.dataset.m); }); break;
    case 'export-json': exportJSON(); break;
    case 'export-csv': exportCSV(); break;
    case 'import-json': $('importFile').click(); break;
    case 'erase': eraseAll(); break;
  }
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.matches && el.matches('input[inputmode="decimal"]')) {   // live Indian commas, caret kept after the same digit
    const pos = el.selectionStart ?? el.value.length, before = el.value.slice(0, pos).replace(/[^\d.]/g, '').length, next = groupIN(el.value);
    if (next !== el.value) { el.value = next; let n = 0, p = 0; while (p < next.length && n < before) { if (/[\d.]/.test(next[p])) n++; p++; } try { el.setSelectionRange(p, p); } catch {} }
  }
}, true);
document.addEventListener('input', e => { if (['txAmount'].includes(e.target.id)) syncOptions();
  if (e.target.classList.contains('advin')) { S.txAdv[{ fMin: 'min', fMax: 'max', fFrom: 'from', fTo: 'to' }[e.target.id]] = e.target.value; $('txList').innerHTML = txListHTML(); } if (e.target.id === 'txSearch') { S.txSearch = e.target.value; $('txList').innerHTML = txListHTML(); } });
document.addEventListener('change', async e => {
  if (['txRepeat', 'txSplit', 'txDate'].includes(e.target.id)) syncOptions();
  if (e.target.id === 'autoIncome') setAutoIncome(e.target.checked);
  if (e.target.id === 'onbDayOther' && e.target.value) { onbCollect(); ONB.day = +e.target.value; renderOnb(); }
  if (e.target.id === 'cycleSel') { const d = +e.target.value; $('cyclePrev').textContent = d === 1 ? 'Each budget month runs from the 1st to the last day.' : `Example: ${ordinal(d)} Oct – ${ordinal(d - 1)} Nov. A cycle is named after the month it starts in.`; }
  if (e.target.matches('.binput')) saveBudget(e.target);
  else if (e.target.id === 'importFile' && e.target.files[0]) { await importJSON(e.target.files[0]); e.target.value = ''; }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.binput')) e.target.blur(); });
$('txForm').addEventListener('submit', saveExpense);
$('catForm').addEventListener('submit', saveCat);
$('sheetForm').addEventListener('submit', submitSheet);
$('goalForm').addEventListener('submit', saveGoal);
$('onbForm').addEventListener('submit', onbNext);
document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d && d.id !== 'onbDlg') d.close(); }));
$('onbDlg').addEventListener('cancel', e => { e.preventDefault(); finishOnboarding(true); });
// static icons
$('fab').innerHTML = icon('plus', 28, 2.4);
$('txBack').innerHTML = icon('back', 20);
$('txDelete').innerHTML = icon('trash', 20);
$('smsIc').innerHTML = icon('clipboard', 17, 2); $('oiRepeat').innerHTML = icon('repeat', 19); $('oiSplit').innerHTML = icon('users', 19); $('oiFav').innerHTML = icon('star', 19);
$('noteRow').insertAdjacentHTML('afterbegin', icon('pencil', 19));
$('dateRow').insertAdjacentHTML('afterbegin', icon('calendar', 19));

/* ================= Boot ================= */
async function load() {
  let [cats, exps, buds, sets, goals, recurring, ious] = await Promise.all(STORES.map(dbAll));
  S.recurring = recurring.sort((a, b) => a.day - b.day); S.ious = ious;
  S.settings = Object.fromEntries(sets.map(s => [s.key, s.value]));
  S.goals = goals.sort((a, b) => a.createdAt - b.createdAt);
  S.settings = Object.fromEntries(sets.map(s => [s.key, s.value]));
  if ((S.settings.seedVersion || 1) < SEED_VERSION) {
    if (!exps.length && cats.length) { const t = db.transaction('categories', 'readwrite'); t.objectStore('categories').clear(); await done(t); cats = []; }
    await setSetting('seedVersion', SEED_VERSION);
  }
  if (!cats.length) {
    cats = DEFAULT_CATEGORIES.map(([name, ic, color], order) => ({ id: uid(), name, icon: ic, color, order }));
    await dbPut('categories', ...cats);
  }
  const fix = cats.filter(c => !c.icon || !/^#[0-9a-f]{6}$/i.test(c.color)).map(c => ({ ...c, icon: c.icon || LEGACY_ICON[c.name] || 'tag', color: /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : '#64748B' }));
  if (fix.length) { await dbPut('categories', ...fix); cats = cats.map(c => fix.find(f => f.id === c.id) || c); }
  S.categories = cats.sort((a, b) => (a.order || 0) - (b.order || 0));
  if (!S.settings.favorites) await setSetting('favorites', DEFAULT_FAVS.map(([name, amount, ic]) => ({ id: uid(), name, amount, categoryId: (S.categories.find(c => c.icon === ic) || S.categories[0]).id, payment: 'UPI' })));
  S.expenses = exps;
  S.budgets = Object.fromEntries(buds.map(b => [b.key, b]));
}

(async function boot() {
  try { db = await openDB(); await load(); applyTheme(); S.month = curCycle(); }
  catch (err) { $('main').innerHTML = emptyCard('alert', 'Storage unavailable', `This browser is blocking on-device storage (private mode?). ${esc(err?.message || '')}`); return; }
  // Home-screen shortcuts: ?view=stats|plan|budget, ?action=add
  const qs = new URLSearchParams(location.search);
  if (VIEWS[qs.get('view')] && TABS.some(t => t[0] === qs.get('view'))) S.view = qs.get('view');
  // Decide the mode before the first screen is drawn: existing users keep every feature, new users start simple
  if (!S.settings.mode && (S.settings.onboarded || hasUserData())) await setSetting('mode', 'advanced');
  if (!S.settings.onboarded && hasUserData()) await setSetting('onboarded', true);
  const posted = await postRecurring();
  S.anim = 'enter'; render();
  if (posted.length) toast(`Added ${posted.length} recurring ${posted.length === 1 ? 'entry' : 'entries'} · ${posted.slice(0, 2).map(e => e.note).join(', ')}${posted.length > 2 ? '…' : ''}`);
  if (!S.settings.onboarded && !qs.get('action')) openOnboarding();
  if (qs.get('action') === 'add') openExpense();
  if (qs.toString()) history.replaceState(null, '', location.pathname);
  if (navigator.storage?.persist) S.persisted = (await navigator.storage.persisted?.()) || (await navigator.storage.persist().catch(() => false));
  // iPhone has no install prompt API, so offer our own guide after a few seconds
  if (isIOS() && !isStandalone()) setTimeout(maybeOfferInstall, 3500);
  document.addEventListener('visibilitychange', async () => { if (document.visibilityState === 'visible') { const p = await postRecurring(); if (p.length) { render(); toast(`Added ${p.length} recurring ${p.length === 1 ? 'entry' : 'entries'}`); } } });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    const hadController = !!navigator.serviceWorker.controller; // false on very first visit → no "update" banner
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => { if (nw.state === 'activated' && hadController) showBanner('update'); });
      });
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => {});
  }
})();
