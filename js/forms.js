/* Expense Tracker — Add / edit sheet, SMS paste, categories, sheets, backup & data. Loaded in order: core → views → features → forms → main. */
'use strict';
/* ================= Add / edit expense ================= */
function applyKindUI() {
  const k = S.txKind, edit = !!S.editingExpense;
  document.querySelectorAll('#txKind button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
  const noun = { expense: 'Expense', income: 'Income', credit: 'Refund' }[k];
  $('txTitle').textContent = (edit ? 'Edit ' : 'Add ') + noun;
  $('txSave').textContent = (edit ? 'Update ' : 'Save ') + noun;
  $('txAmtLabel').textContent = { expense: 'Amount spent', income: 'Amount received', credit: 'Amount refunded' }[k];
  $('catBlock').hidden = k === 'income'; $('srcBlock').hidden = k !== 'income';
  $('catLabel').textContent = k === 'credit' ? 'Refund for which category?' : 'Select category';
  $('payLabel').textContent = k === 'expense' ? 'Paid via' : 'Received via';
  $('optBlock').hidden = edit;
  $('optSplit').hidden = k !== 'expense'; $('optFav').hidden = k !== 'expense'; $('optRepeat').hidden = k === 'credit';
  if (k !== 'expense') { $('txSplit').checked = false; $('txFav').checked = false; }
  if (k === 'credit') $('txRepeat').checked = false;
  syncOptions();
}
function syncOptions() {
  $('repeatMore').hidden = !$('txRepeat').checked || S.txKind !== 'expense';
  $('splitMore').hidden = !$('txSplit').checked;
  const d = $('txDate').value ? +$('txDate').value.slice(8) : new Date().getDate();
  $('repeatSub').textContent = `Added automatically on the ${ordinal(d)} of every month`;
  const total = parseAmount($('txAmount').value) || 0, n = S.splitN;
  $('splitN').textContent = n; $('splitMine').textContent = fmt(round2(total / n));
}
const ordinal = n => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');

function openExpense(id, preset) {
  const e = id ? S.expenses.find(x => x.id === id) : null;
  S.editingExpense = e; S.splitN = 2;
  S.txKind = e ? (e.kind || 'expense') : (preset?.kind || 'expense');
  $('txAmount').value = e ? (e.split ? e.split.total : e.amount) : (preset?.amount || '');
  $('txNote').value = e ? e.note : (preset?.note || '');
  $('txDate').value = e ? e.date : (preset?.date || todayStr());
  const [fk, fv] = S.txFilter ? S.txFilter.split(':') : [];
  const selected = e ? e.categoryId : preset?.categoryId || (S.sub === 'transactions' && fk === 'cat' && fv) || S.settings.lastCategory || S.categories[0]?.id;
  $('txCats').innerHTML = S.categories.map(c => `<input type="radio" name="txCat" id="tc-${c.id}" value="${c.id}" ${c.id === selected ? 'checked' : ''}><label for="tc-${c.id}"><span class="tile">${icon(c.icon, 24)}</span><span class="tl">${esc(c.name)}</span></label>`).join('');
  const src = e?.source || preset?.source || 'Salary';
  $('txSrc').innerHTML = INCOME_SOURCES.map(([n, ic], i) => `<input type="radio" name="txSrc" id="ts-${i}" value="${n}" ${n === src ? 'checked' : ''}><label for="ts-${i}">${icon(ic, 22)}${n}</label>`).join('');
  const pay = e ? (e.payment || '') : (preset?.payment || S.settings.defaultPayment || 'UPI');
  $('txPay').innerHTML = PAYMENT_MODES.map(([m, ic], i) => `<input type="radio" name="txPay" id="tp-${i}" value="${m}" ${m === pay ? 'checked' : ''}><label for="tp-${i}">${icon(ic, 22)}${m}</label>`).join('');
  $('quickAmts').innerHTML = QUICK_AMOUNTS.map(a => `<button type="button" class="chip" data-action="quick-amt" data-amt="${a}">+${INR0.format(a)}</button>`).join('');
  ['txRepeat', 'txSub', 'txSplit', 'txFav'].forEach(k => $(k).checked = false);
  $('splitNames').value = ''; $('splitOwe').checked = true;
  $('smsBtn').hidden = !!e; $('smsInfo').hidden = true;
  const info = [];
  if (e?.split) info.push(`Split ${e.split.n} ways — the amount above is the full bill (${fmt(e.split.total)}); your share is ${fmt(e.amount)}.`);
  if (e?.recurringId) info.push('Added automatically by a monthly repeat. Manage repeats in Profile → Recurring.');
  $('editInfo').hidden = !info.length; $('editInfo').innerHTML = info.map(esc).join('<br>');
  $('txDelete').style.visibility = e ? 'visible' : 'hidden';
  $('txErr').textContent = '';
  applyKindUI();
  if (!$('txDlg').open) $('txDlg').showModal();
  $('txDlg').querySelector('.fbody').scrollTop = 0;
  if (!e && !preset) setTimeout(() => $('txAmount').focus(), 60);
}

async function saveExpense(ev) {
  ev.preventDefault();
  const k = S.txKind, editing = S.editingExpense;
  const entered = parseAmount($('txAmount').value);
  const categoryId = k === 'income' ? null : document.querySelector('input[name=txCat]:checked')?.value;
  const source = k === 'income' ? (document.querySelector('input[name=txSrc]:checked')?.value || 'Other') : undefined;
  const date = $('txDate').value;
  if (!(entered > 0)) return ($('txErr').textContent = 'Enter an amount greater than ₹0.');
  if (k !== 'income' && !categoryId) return ($('txErr').textContent = 'Pick a category.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return ($('txErr').textContent = 'Pick a date.');
  const note = $('txNote').value.trim();
  const payment = document.querySelector('input[name=txPay]:checked')?.value || '';
  // Split: the entered amount is the whole bill; only my share is my expense
  let split = editing?.split || null, amount = entered;
  if (!editing && k === 'expense' && $('txSplit').checked && S.splitN > 1) split = { total: entered, n: S.splitN };
  if (split && k === 'expense') { split = { ...split, total: entered }; amount = round2(entered / split.n); } else split = null;
  const base = { amount, kind: k === 'expense' ? undefined : k, categoryId, source, date, note, payment, split: split || undefined };
  const e = editing ? { ...editing, ...base, updatedAt: Date.now() } : { id: uid(), ...base, createdAt: Date.now() };
  for (const key of Object.keys(e)) if (e[key] === undefined) delete e[key];

  if (!editing && $('txRepeat').checked && k !== 'credit') {
    const rule = { id: uid(), name: note || (k === 'income' ? source : catById(categoryId).name), amount, kind: k === 'income' ? 'income' : undefined, categoryId, source, payment,
      day: +date.slice(8), start: date.slice(0, 7), lastPosted: date.slice(0, 7), active: true, subscription: k === 'expense' && $('txSub').checked, createdAt: Date.now() };
    for (const key of Object.keys(rule)) if (rule[key] === undefined) delete rule[key];
    await dbPut('recurring', rule); S.recurring.push(rule); e.recurringId = rule.id;
  }
  await dbPut('expenses', e);
  const i = S.expenses.findIndex(x => x.id === e.id);
  i >= 0 ? (S.expenses[i] = e) : S.expenses.push(e);

  let extra = '';
  if (!editing && split && $('splitOwe').checked) {
    const names = $('splitNames').value.split(',').map(x => x.trim()).filter(Boolean);
    const share = round2(entered / split.n), what = note || catById(categoryId).name;
    const ious = names.length ? names.slice(0, split.n - 1).map(nm => ({ id: uid(), person: nm, amount: share, dir: 'lent', note: `Split: ${what}`, date, createdAt: Date.now() }))
      : [{ id: uid(), person: `${split.n - 1} ${split.n - 1 === 1 ? 'person' : 'people'} (split)`, amount: round2(entered - share), dir: 'lent', note: `Split: ${what}`, date, createdAt: Date.now() }];
    await dbPut('ious', ...ious); S.ious.push(...ious);
    extra = ` · ${fmt(sum(ious.map(x => x.amount)))} owed to you`;
  }
  if (!editing && $('txFav').checked && k === 'expense') {
    const favs = [...favorites(), { id: uid(), name: note || catById(categoryId).name, amount, categoryId, payment }];
    await setSetting('favorites', favs);
  }
  if (!editing && k !== 'income') await setSetting('lastCategory', categoryId);
  $('txDlg').close(); haptic(12); S.anim = 'charts'; render();
  const label = k === 'income' ? `Income ${fmt(amount)} · ${source}` : k === 'credit' ? `Refund ${fmt(amount)} · ${catById(categoryId).name}` : `Added ${fmt(amount)} · ${catById(categoryId).name}`;
  toast(editing ? 'Updated' : label + (e.recurringId && !editing ? ' · repeats monthly' : '') + extra);
  if (k === 'expense') budgetAlerts(categoryId, date, amount);
}
function budgetAlerts(categoryId, date, amount) {
  const m = cycleKey(date), cr = cycleRange(m), list = expensesIn(cr.start, cr.end), limit = budgetFor(categoryId, m).limit;
  const spent = spendSum(list.filter(x => x.categoryId === categoryId)), monthTotal = spendSum(list), budget = effectiveBudget(m);
  if (limit && spent > limit) setTimeout(() => toast(`⚠️ ${catById(categoryId).name} is ${fmt(spent - limit)} over its limit`), 2500);
  else if (budget && monthTotal > budget && monthTotal - amount <= budget) setTimeout(() => toast(`⚠️ Monthly budget exceeded by ${fmt(monthTotal - budget)}`), 2500);
}
async function deleteExpense() {
  const e = S.editingExpense; if (!e || !confirm(`Delete this ${isIncome(e) ? 'income entry' : e.kind === 'credit' ? 'refund' : 'expense'}?`)) return;
  await dbDel('expenses', e.id);
  S.expenses = S.expenses.filter(x => x.id !== e.id);
  $('txDlg').close(); render(); toast('Deleted');
}

/* ================= Paste a bank / UPI SMS (parsed on this device only) ================= */
const MERCHANT_ICON = [
  [/zomato|swiggy|eatsure|dominos|domino's|pizza ?hut|kfc|mcdonald|faasos|box8/i, 'scooter'],
  [/blinkit|zepto|bigbasket|big basket|instamart|dmart|d-mart|jiomart|grofers|more retail|reliance fresh|spencer|kirana|grocery/i, 'cart'],
  [/uber|ola|rapido|metro|namma yatri|blusmart|auto|cab|irctc ?ut|fastag|toll/i, 'car'],
  [/petrol|fuel|hpcl|bpcl|iocl|indian ?oil|bharat ?petroleum|hindustan ?petroleum|shell|nayara/i, 'fuel'],
  [/jio|airtel|vodafone|\bvi\b|bsnl|act ?fibernet|hathway|tata ?play|recharge|broadband/i, 'phone'],
  [/netflix|hotstar|jiocinema|prime ?video|spotify|youtube|bookmyshow|pvr|inox|sonyliv|zee5|apple\.com|google ?play/i, 'film'],
  [/amazon|flipkart|myntra|ajio|meesho|nykaa|tata ?cliq|decathlon|lifestyle|westside|croma|reliance ?digital/i, 'bag'],
  [/apollo|pharmeasy|1mg|netmeds|medplus|hospital|clinic|pharma|diagnostic|lab/i, 'heart'],
  [/irctc|makemytrip|goibibo|indigo|air ?india|vistara|akasa|redbus|cleartrip|ixigo|oyo|airbnb/i, 'train'],
  [/electricity|bescom|tneb|tangedco|msedcl|mahadiscom|tpddl|bses|cesc|wbsedcl|apdcl|tsecl|indane|bharat ?gas|hp ?gas|piped gas|mgl|igl/i, 'zap'],
  [/\bemi\b|loan|bajaj ?fin|home ?credit|credit ?card ?bill/i, 'bank'],
  [/\brent\b|nobroker|housing/i, 'home'],
  [/school|college|university|udemy|coursera|byju|unacademy|tuition|fees/i, 'book'],
  [/chai|tea|cafe|coffee|starbucks|ccd|restaurant|hotel|dhaba|bakery|sweets/i, 'utensils'],
];
function parseSms(text) {
  const t = text.replace(/\s+/g, ' ').trim();
  const am = t.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i) || t.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹)/i);
  if (!am) return null;
  const amount = parseAmount(am[1]);
  const isRefund = /refund|reversal|reversed|cashback/i.test(t);
  const isCredit = /credited|received|deposited|added to/i.test(t) && !/debited|spent|paid|sent|withdrawn/i.test(t);
  const kind = isRefund ? 'credit' : isCredit ? 'income' : 'expense';
  let merchant = '';
  const pats = [/(?:to|at|towards|trf to|paid to|sent to)\s+(?:vpa\s+)?([A-Za-z0-9 &.'@_-]{2,40}?)(?=\s+(?:on|via|ref|upi|for|from|dated|avl|avbl|bal|a\/c|is|was)\b|[.,;]|$)/i,
    /for\s+(?:your\s+)?([A-Za-z][A-Za-z0-9&.'-]{1,30})\s+order/i, /\bby\s+([A-Za-z][A-Za-z0-9 &.'-]{2,40}?)(?=\s+(?:on|via|ref|upi|avl|avbl|bal)\b|[.,;]|$)/i,
    /info[:\s]+(?:upi\/)?(?:[\w-]+\/)*([A-Za-z][A-Za-z0-9 &.'-]{2,30})/i, /from\s+([A-Za-z][A-Za-z0-9 &.'@_-]{2,40}?)(?=\s+(?:on|via|ref|upi|to)\b|[.,;]|$)/i];
  for (const p of pats) { const mm = t.match(p); if (mm && !/^(a\/?c|ac|acct|account|your|xx)/i.test(mm[1])) { merchant = mm[1].trim(); break; } }
  merchant = merchant.replace(/@.*$/, '').replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (merchant) merchant = merchant.split(' ').slice(0, 4).map(w => w.length > 3 && w === w.toUpperCase() ? w[0] + w.slice(1).toLowerCase() : w[0].toUpperCase() + w.slice(1)).join(' ');
  let date;
  const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const d1 = t.match(/\b(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ,]*(\d{2,4})\b/), d2 = t.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
  const mk = (d, m, y) => { y = +y < 100 ? 2000 + +y : +y; const dt = new Date(y, m - 1, +d); return dt.getDate() === +d && dt <= new Date() ? ds(dt) : undefined; };
  const d3 = t.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (d3) date = mk(d3[3], +d3[2], d3[1]); else if (d1 && MON[d1[2].toLowerCase()]) date = mk(d1[1], MON[d1[2].toLowerCase()], d1[3]); else if (d2) date = mk(d2[1], +d2[2], d2[3]);
  const payment = /upi|vpa|@ok|@ybl|@paytm|@axl|@ibl|gpay|phonepe/i.test(t) ? 'UPI' : /card|pos\b/i.test(t) ? 'Card' : /neft|imps|rtgs|net ?banking/i.test(t) ? 'Net Banking' : /atm|cash/i.test(t) ? 'Cash' : undefined;
  let categoryId;
  const hay = merchant + ' ' + t, hit = MERCHANT_ICON.find(([re]) => re.test(hay));
  if (hit) categoryId = S.categories.find(c => c.icon === hit[1])?.id;
  return { amount, kind, note: merchant, date, payment, categoryId, source: kind === 'income' ? (/salary|sal\b/i.test(t) ? 'Salary' : /interest/i.test(t) ? 'Interest' : 'Other') : undefined };
}
function applyParsed(p) {
  if (!p) { $('smsInfo').hidden = false; $('smsInfo').innerHTML = 'Couldn’t find an amount in that message. Try copying the full SMS.'; return; }
  openExpense(null, p);
  const k = { expense: 'expense', income: 'income', credit: 'refund' }[p.kind];
  $('smsInfo').hidden = false;
  $('smsInfo').innerHTML = `Filled from SMS: <b>${esc(fmt(p.amount))}</b> ${k}${p.note ? ` · <b>${esc(p.note)}</b>` : ''}${p.date ? ` · ${esc(dayLabel(p.date))}` : ''}${p.categoryId ? '' : ' · pick a category'}. Check it and save.`;
}
async function pasteSms() {
  let text = '';
  try { if (navigator.clipboard?.readText) text = await navigator.clipboard.readText(); } catch {}
  if (text && /(rs\.?|inr|₹)\s*[\d,]/i.test(text)) return applyParsed(parseSms(text));
  openSheet('sms');
}
const favorites = () => S.settings.favorites || [];

/* ================= Categories ================= */
function openCat(id) {
  const c = id ? S.categories.find(x => x.id === id) : null;
  S.editingCat = c;
  $('catTitle').textContent = c ? 'Edit category' : 'New category';
  $('catName').value = c ? c.name : '';
  const ic = c ? c.icon : 'tag', col = c ? c.color : PALETTE[0];
  $('catIcons').innerHTML = CAT_ICONS.map((k, i) => `<input type="radio" name="catIcon" id="ci-${i}" value="${k}" ${k === ic ? 'checked' : ''}><label for="ci-${i}" aria-label="${k}">${icon(k, 21)}</label>`).join('');
  const pal = PALETTE.includes(col) ? PALETTE : [col, ...PALETTE.slice(0, 11)];
  $('catColors').innerHTML = pal.map((p, i) => `<input type="radio" name="catColor" id="cc-${i}" value="${p}" ${p === col ? 'checked' : ''}><label for="cc-${i}" style="background:${p};color:${p}" aria-label="${p}"><span style="color:#fff">${icon('tick', 18, 3)}</span></label>`).join('');
  $('catDelete').hidden = !c;
  $('catErr').textContent = '';
  $('catDlg').showModal();
}
async function saveCat(ev) {
  ev.preventDefault();
  const name = $('catName').value.trim();
  if (!name) return ($('catErr').textContent = 'Give the category a name.');
  if (S.categories.some(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== S.editingCat?.id)) return ($('catErr').textContent = 'A category with this name already exists.');
  const ic = document.querySelector('input[name=catIcon]:checked')?.value || 'tag';
  const color = document.querySelector('input[name=catColor]:checked')?.value || PALETTE[0];
  const c = S.editingCat ? { ...S.editingCat, name, icon: ic, color } : { id: uid(), name, icon: ic, color, order: Math.max(0, ...S.categories.map(x => x.order || 0)) + 1 };
  await dbPut('categories', c);
  const i = S.categories.findIndex(x => x.id === c.id);
  i >= 0 ? (S.categories[i] = c) : S.categories.push(c);
  $('catDlg').close(); render(); toast('Category saved');
}
async function deleteCat() {
  const c = S.editingCat; if (!c) return;
  if (S.categories.length <= 1) return ($('catErr').textContent = 'You need at least one category.');
  const fallback = S.categories.find(x => x.id !== c.id && x.name === 'Other') || S.categories.find(x => x.id !== c.id);
  const affected = S.expenses.filter(e => e.categoryId === c.id);
  if (!confirm(affected.length ? `Delete "${c.name}"? Its ${affected.length} expense(s) will move to "${fallback.name}".` : `Delete "${c.name}"?`)) return;
  const moved = affected.map(e => ({ ...e, categoryId: fallback.id }));
  if (moved.length) await dbPut('expenses', ...moved);
  moved.forEach(m => { S.expenses[S.expenses.findIndex(e => e.id === m.id)] = m; });
  for (const k of Object.keys(S.budgets).filter(k => S.budgets[k].categoryId === c.id)) { await dbDel('budgets', k); delete S.budgets[k]; }
  await dbDel('categories', c.id);
  S.categories = S.categories.filter(x => x.id !== c.id);
  if (S.txFilter === 'cat:' + c.id) S.txFilter = '';
  $('catDlg').close(); render(); toast('Category deleted');
}

/* ================= Sheets: name, payment, privacy ================= */
function openSheet(kind) {
  S.sheet = kind;
  let html = '';
  if (kind === 'name') html = `<h3>Your name</h3><label class="irow"><input id="nameInput" maxlength="40" placeholder="e.g. Birat Datta" value="${esc(S.settings.name || '')}"></label>
    <p class="note" style="margin:-2px 2px 16px">Only used to greet you. Stays on this device.</p><div class="sactions"><button type="button" class="btn ghost" data-action="close-dlg">Cancel</button><button type="submit" class="btn">Save</button></div>`;
  if (kind === 'payment') { const pm = S.settings.defaultPayment || 'UPI';
    html = `<h3>Default payment mode</h3>${PAYMENT_MODES.map(([m, ic, col]) => `<button type="button" class="opt ${m === pm ? 'on' : ''}" data-action="set-payment" data-m="${m}"><span class="ic" style="width:40px;height:40px;border-radius:13px;background:${col}22;color:${col}">${icon(ic, 20)}</span>${m}${m === pm ? `<span class="ck">${icon('tick', 20, 2.6)}</span>` : ''}</button>`).join('')}`; }
  if (kind === 'install') html = installSheetHTML();
  if (kind === 'rule') html = ruleFormHTML(S.editingRule, S.ruleIdea);
  if (kind === 'fav') html = favFormHTML(S.editingFav);
  if (kind === 'iou') html = iouFormHTML(S.editingIou);
  if (kind === 'iou-detail') html = iouDetailHTML(S.ious.find(i => i.id === S.iouId));
  if (kind === 'pickgoal') html = `<h3>Move ${esc(fmt(S.moveAmt))} to…</h3>${S.goals.filter(g => goalInfo(g).state !== 'done').map(g => { const gi = goalInfo(g); return `<button type="button" class="opt" data-action="pick-goal" data-id="${g.id}">${tint(g, 40, 13)}<span style="flex:1">${esc(g.name)}<small style="display:block;font-weight:500;color:var(--muted);font-size:12.5px">${esc(fmt(gi.saved))} of ${esc(fmt(g.target))}</small></span>${icon('chevR', 18, 2)}</button>`; }).join('')}`;
  if (kind === 'cycle') { const cd = cycleDay();
    html = `<h3>Budget cycle</h3><p class="note" style="margin:-8px 2px 14px">Start your month on salary day so budgets, the dashboard and stats follow your real money cycle.</p>
      <label class="irow"><span class="muted" style="font-size:13px;white-space:nowrap">Starts on</span><select id="cycleSel" style="flex:1;background:none;border:0;font-size:16px;color:var(--text);outline:0;height:100%">${[...Array(28)].map((_, i) => `<option value="${i + 1}" ${i + 1 === cd ? 'selected' : ''}>${i === 0 ? '1st (calendar month)' : ordinal(i + 1) + ' of the month'}</option>`).join('')}</select></label>
      <p class="note" style="margin:0 2px 16px" id="cyclePrev"></p>
      <div class="sactions"><button type="button" class="btn ghost" data-action="close-dlg">Cancel</button><button type="submit" class="btn">Save</button></div>`; }
  if (kind === 'sms') html = `<h3>Paste your SMS</h3><p class="note" style="margin:-8px 2px 12px">Copy a debit / credit SMS from your bank or UPI app and paste it here. It’s read on this phone only.</p>
    <textarea id="smsText" rows="5" placeholder="e.g. Rs.450.00 debited from A/c XX1234 on 10-Oct-26 to VPA zomato@icici. UPI Ref 123456" style="width:100%;border-radius:14px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);padding:12px;font-size:15px;resize:vertical"></textarea>
    <div class="sactions"><button type="button" class="btn ghost" data-action="close-dlg">Cancel</button><button type="button" class="btn" data-action="sms-fill">Fill in</button></div>`;
  if (kind === 'goal') html = goalDetailHTML(S.goals.find(g => g.id === S.goalId));
  if (kind === 'contrib') { const g = S.goals.find(x => x.id === S.goalId), add = S.contribSign > 0;
    html = `<h3>${add ? 'Add money to' : 'Withdraw from'} ${esc(g.name)}</h3>
      <div class="amtcard" style="background:var(--surface-2);box-shadow:none"><div class="cap">${add ? 'Amount saved' : 'Amount withdrawn'}</div>
        <div class="amtrow"><span class="sym">₹</span><input id="contribAmt" type="text" inputmode="decimal" placeholder="0" autocomplete="off" aria-label="Amount in rupees"></div></div>
      ${add ? `<div class="chips quick" style="margin:0 -20px 16px">${SAVE_AMOUNTS.map(a => `<button type="button" class="chip" data-action="contrib-quick" data-amt="${a}">+${INR0.format(a)}</button>`).join('')}</div>` : ''}
      <div class="two" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label class="irow"><input type="date" id="contribDate" value="${todayStr()}" max="${todayStr()}" aria-label="Date"></label>
      <label class="irow"><input id="contribNote" maxlength="40" placeholder="Note (optional)"></label></div>
      <div class="err" id="contribErr"></div>
      <div class="sactions"><button type="button" class="btn ghost" data-action="close-dlg">Cancel</button><button type="submit" class="btn">${add ? 'Add money' : 'Withdraw'}</button></div>`; }
  if (kind === 'theme') { const cur = S.settings.theme || 'system';
    html = `<h3>Appearance</h3>${THEMES.map(([k, ic, l, d]) => `<button type="button" class="opt ${k === cur ? 'on' : ''}" data-action="set-theme" data-t="${k}"><span class="ic" style="width:40px;height:40px;border-radius:13px;background:var(--accent-soft);color:var(--accent)">${icon(ic, 20)}</span><span>${l}<small style="display:block;font-weight:500;color:var(--muted);font-size:12.5px">${d}</small></span>${k === cur ? `<span class="ck">${icon('tick', 20, 2.6)}</span>` : ''}</button>`).join('')}`; }
  if (kind === 'privacy') html = `<h3>Your data stays with you</h3>
    <div class="note" style="margin:0 2px 18px;font-size:14px;color:var(--text-2)">
      <p style="margin:0 0 10px">• Everything is stored in this browser’s on-device storage (IndexedDB).</p>
      <p style="margin:0 0 10px">• No account, no server, no analytics, no ads. The app makes no network requests with your data.</p>
      <p style="margin:0 0 10px">• Your iPhone and computer keep separate copies. Use <b>Export backup</b> / <b>Restore backup</b> to move data.</p>
      <p style="margin:0">• Clearing Safari website data deletes it — export a backup now and then.</p>
      <p style="margin:12px 0 0" class="muted">${S.persisted ? 'Storage is marked persistent on this device.' : 'Tip: Add to Home Screen so iOS keeps your data long-term.'}</p></div>
    <div class="sactions"><button type="button" class="btn" data-action="close-dlg">Got it</button></div>`;
  $('sheetBody').innerHTML = html;
  if (!$('sheetDlg').open) $('sheetDlg').showModal();
  if (kind === 'name') setTimeout(() => $('nameInput').focus(), 60);
  if (kind === 'contrib') setTimeout(() => $('contribAmt').focus(), 60);
  if (kind === 'sms') setTimeout(() => $('smsText').focus(), 60);
}
async function submitSheet(ev) {
  ev.preventDefault();
  if (S.sheet === 'contrib') return saveContribution();
  if (S.sheet === 'rule') return saveRule();
  if (S.sheet === 'fav') return saveFav();
  if (S.sheet === 'iou') return saveIou();
  if (S.sheet === 'cycle') { await setSetting('cycleDay', +$('cycleSel').value); S.month = curCycle(); S.statsOffset = 0; $('sheetDlg').close(); render(); return toast(cycleDay() === 1 ? 'Budget follows the calendar month' : `Budget cycle starts on the ${ordinal(cycleDay())}`); }
  if (S.sheet === 'name') { await setSetting('name', $('nameInput').value.trim()); $('sheetDlg').close(); render(); toast('Name saved'); }
}

/* ================= Data ================= */
async function setSetting(key, value) { S.settings[key] = value; await dbPut('settings', { key, value }); }

async function saveBudget(input) {
  const catId = input.dataset.cat, m = S.month, raw = input.value.trim();
  const limit = raw === '' ? 0 : parseAmount(raw);
  const cur = budgetFor(catId, m);
  if (!(limit >= 0)) { toast('Enter a valid amount'); input.value = cur.limit || ''; return; }
  if (limit === cur.limit && !cur.inherited) return;
  const b = { key: `${m}|${catId}`, month: m, categoryId: catId, limit };
  await dbPut('budgets', b); S.budgets[b.key] = b;
  input.value = limit || '';
  if ($('bAlloc')) $('bAlloc').innerHTML = allocLine(m);
  if (catId === TOTAL_KEY) {
    $('bsub-' + catId).textContent = 'One number for the whole month';
    return toast(limit ? `Monthly budget: ${fmt(limit)}` : 'Overall budget removed');
  }
  const cr = cycleRange(m), sp = spendSum(expensesIn(cr.start, cr.end).filter(e => e.categoryId === catId));
  $('bsub-' + catId).textContent = `Spent ${fmt(sp)}`;
  toast(limit ? `${catById(catId).name}: ${fmt(limit)}/month` : `Limit removed for ${catById(catId).name}`);
}
function exportJSON() {
  const data = { app: 'expense-tracker', version: 3, exportedAt: new Date().toISOString(), settings: S.settings, categories: S.categories, expenses: S.expenses, budgets: Object.values(S.budgets), goals: S.goals, recurring: S.recurring, ious: S.ious };
  download(`expenses-backup-${todayStr()}.json`, JSON.stringify(data, null, 2), 'application/json');
  toast('Backup downloaded');
}
function exportCSV() {
  const q = v => { v = String(v ?? ''); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
  const dmy = d => d.split('-').reverse().join('/');
  const rows = [['Date (DD/MM/YYYY)', 'Type', 'Category / Source', 'Amount (INR)', 'Paid via', 'Note']].concat(
    [...S.expenses].sort((a, b) => a.date.localeCompare(b.date)).map(e => [dmy(e.date), isIncome(e) ? 'Income' : e.kind === 'credit' ? 'Refund' : 'Expense', isIncome(e) ? (e.source || 'Income') : catById(e.categoryId).name, e.amount, e.payment || '', e.note]));
  download(`expenses-${todayStr()}.csv`, '﻿' + rows.map(r => r.map(q).join(',')).join('\n'), 'text/csv;charset=utf-8');
  toast('CSV downloaded');
}
async function importJSON(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'expense-tracker' || !Array.isArray(data.categories) || !Array.isArray(data.expenses)) throw new Error('Not a valid backup file');
    if (!data.expenses.every(e => e.id && typeof e.amount === 'number' && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && (e.categoryId || e.kind === 'income'))) throw new Error('The backup has invalid expense entries');
    if (!confirm(`Restore ${data.expenses.length} expenses and ${data.categories.length} categories? This replaces everything currently on this device.`)) return;
    await dbClearAll();
    if (data.categories.length) await dbPut('categories', ...data.categories);
    if (data.expenses.length) await dbPut('expenses', ...data.expenses);
    if (data.budgets?.length) await dbPut('budgets', ...data.budgets);
    if (data.goals?.length) await dbPut('goals', ...data.goals);
    if (data.recurring?.length) await dbPut('recurring', ...data.recurring);
    if (data.ious?.length) await dbPut('ious', ...data.ious);
    const sets = Object.entries(data.settings || {}).map(([key, value]) => ({ key, value }));
    if (sets.length) await dbPut('settings', ...sets);
    await load(); render(); toast('Backup restored');
  } catch (err) { alert('Could not restore: ' + err.message); }
}
async function eraseAll() {
  if (!confirm('Erase ALL expenses, categories and budgets from this device? Export a backup first if you might need them.')) return;
  if (!confirm('This cannot be undone. Erase everything?')) return;
  await dbClearAll(); await load(); S.txFilter = ''; S.sub = null; S.view = 'home'; render(); toast('All data erased');
}

