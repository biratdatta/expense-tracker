/* Expense Tracker — Savings goals, recurring & subscriptions, quick-add, calendar, report card, rendering. Loaded in order: core → views → features → forms → main. */
'use strict';
/* ================= Plan: savings goals ================= */
function goalInfo(g) {
  const saved = sum((g.contributions || []).map(c => c.amount));
  const pct = g.target ? Math.min(100, Math.max(0, saved / g.target * 100)) : 0;
  const left = Math.max(0, round2(g.target - saved));
  const r = { saved, pct, left, exp: null, state: 'none', need: 0, msg: 'Add a target date to track your pace.' };
  if (saved >= g.target) return { ...r, state: 'done', msg: 'Goal reached — well done! 🎉' };
  if (!g.deadline) return r;
  const today = todayStr(), total = diffDays(g.start, g.deadline), daysLeft = diffDays(today, g.deadline);
  r.exp = total > 0 ? Math.min(100, Math.max(0, diffDays(g.start, today) / total * 100)) : 100;
  r.need = Math.ceil(left / Math.max(1, daysLeft / 30.44));
  const by = parseDate(g.deadline).toLocaleDateString(LOCALE, { month: 'short', year: 'numeric' });
  if (daysLeft < 0) return { ...r, state: 'late', msg: `Target date passed · ${fmt(left)} still to go.` };
  if (r.exp - pct > 5) return { ...r, state: 'behind', msg: `You’re ${Math.round(r.exp - pct)}% behind schedule. Save ${fmt(r.need)}/month to catch up.` };
  return { ...r, state: 'ok', msg: `On track! Save ${fmt(r.need)}/month to reach it by ${by}.` };
}
const GOAL_BANNER = { behind: '#F97316', late: '#EF4444', ok: '#16A34A', done: '#16A34A', none: '#3B82F6' };
function goalBar(g, gi) {
  const a = gi.pct, e = gi.exp != null && gi.exp > a ? gi.exp : a;
  return `<div class="gtrack" style="--c:${g.color};background:${g.color}22">
    ${e > a ? `<i class="gexp" style="left:${a}%;width:${e - a}%"></i>` : ''}<i class="gfill" style="width:${a}%"></i>
    <span class="gknob" style="left:clamp(10px,${a}%,calc(100% - 10px))"></span></div>`;
}
function goalRing(g, pct, size = 58) {
  const p = Math.min(100, pct);
  return `<svg width="${size}" height="${size}" viewBox="0 0 36 36" style="flex:none"><circle cx="18" cy="18" r="15.9155" fill="${g.color}14" stroke="${g.color}26" stroke-width="2.6"/>
    <circle cx="18" cy="18" r="15.9155" fill="none" class="arc" stroke="${g.color}" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="${p} ${100 - p}" transform="rotate(-90 18 18)"/>
    <text x="18" y="20.6" text-anchor="middle" font-size="8" font-weight="700" style="fill:${g.color}">${Math.round(pct)}%</text></svg>`;
}
function goalCardBig(g) {
  const gi = goalInfo(g);
  return `<section class="card gcard">
    <div class="top">${tint(g, 50, 16)}<div class="g"><div class="t">${esc(g.name)}</div><div class="s">${g.deadline ? 'By ' + esc(parseDate(g.deadline).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })) : 'No target date'}</div></div>
      <button class="rbtn sm" data-action="edit-goal" data-id="${g.id}" aria-label="Edit goal">${icon('more', 20, 2.4)}</button></div>
    <div class="gamt"><span class="num">${esc(fmt(gi.saved))}</span> <small>of ${esc(fmt(g.target))}</small></div>
    ${goalBar(g, gi)}
    <div class="glbl"><span>Your progress · ${Math.round(gi.pct)}%</span><b>${gi.left ? esc(fmt(gi.left)) + ' left' : 'Completed'}</b></div>
    <div class="gactions"><button class="btn" data-action="contrib" data-id="${g.id}" data-sign="1">${icon('plus', 18, 2.4)} Add money</button><button class="btn ghost" data-action="open-goal" data-id="${g.id}">Details</button></div>
    <div class="gbanner" style="background:${GOAL_BANNER[gi.state]}">${icon(gi.state === 'done' || gi.state === 'ok' ? 'check' : 'info', 20, 2.2)}<span>${esc(gi.msg)}</span></div>
  </section>`;
}
function viewPlan() {
  const head = `<header class="head"><div><h1>My Plan</h1><div class="subt">Savings goals</div></div>
    <button class="rbtn on" data-action="add-goal" aria-label="New goal">${icon('plus', 22, 2.4)}</button></header>`;
  const suggest = `<div class="sec"><h2>Ideas to start with</h2></div><div class="chips" style="flex-wrap:wrap;margin:0;padding:0">${GOAL_SUGGESTIONS.map(([n, ic, col], i) => `<button class="chip" data-action="suggest-goal" data-i="${i}" style="display:inline-flex;align-items:center;gap:7px"><span style="color:${col};display:flex">${icon(ic, 16, 2)}</span>${esc(n)}</button>`).join('')}</div>`;
  if (!S.goals.length) return head + emptyCard('piggy', 'Plan your savings', 'Create goals like an emergency fund or a Goa trip, add money as you save, and see if you’re on schedule.', `<button class="btn" data-action="add-goal">${icon('plus', 18, 2.4)} New goal</button>`) + suggest;
  const infos = S.goals.map(g => ({ g, gi: goalInfo(g) }));
  const totSaved = sum(infos.map(x => x.gi.saved)), totTarget = sum(S.goals.map(g => g.target));
  const monthly = sum(infos.filter(x => ['ok', 'behind'].includes(x.gi.state)).map(x => x.gi.need));
  const done = infos.filter(x => x.gi.state === 'done').length;
  const summary = `<div class="tiles"><div class="card"><div class="cap">Total saved</div><div class="v num">${esc(fmtShort(totSaved))}</div><div class="muted" style="font-size:12.5px;margin-top:2px">of ${esc(fmtShort(totTarget))}</div></div>
    <div class="card"><div class="cap">Save monthly</div><div class="v num blue">${monthly ? esc(fmtShort(monthly)) : '—'}</div><div class="muted" style="font-size:12.5px;margin-top:2px">${done ? `${done} of ${S.goals.length} goals done` : 'to stay on track'}</div></div></div>`;
  const rank = x => ({ behind: 0, late: 1, ok: 2, none: 3, done: 4 })[x.gi.state];
  const sorted = [...infos].sort((a, b) => rank(a) - rank(b) || (a.g.deadline || '9').localeCompare(b.g.deadline || '9'));
  const featured = sorted[0].g;
  const list = sorted.slice(1).map(({ g, gi }) => `<button class="catcard" data-action="open-goal" data-id="${g.id}"><div class="top">${tint(g, 50, 16)}
    <div class="g"><div class="t">${esc(g.name)}</div><div class="s n"><b style="color:var(--text);font-size:15px">${esc(fmt(gi.saved))}</b> of ${esc(fmt(g.target))}</div></div>${goalRing(g, gi.pct)}</div></button>`).join('');
  return head + summary + `<div class="sec"><h2>${sorted[0].gi.state === 'behind' ? 'Needs attention' : 'Top goal'}</h2></div>` + goalCardBig(featured) +
    (list ? `<div class="sec"><h2>All goals</h2><span class="muted" style="font-size:13px">${S.goals.length} goals</span></div>${list}` : '') + (S.goals.length < 3 ? suggest : '');
}

function openGoalEditor(id, preset) {
  const g = id ? S.goals.find(x => x.id === id) : null;
  S.editingGoal = g;
  const p = preset || [];
  $('goalTitle').textContent = g ? 'Edit goal' : 'New goal';
  $('goalName').value = g ? g.name : (p[0] || '');
  $('goalTarget').value = g ? g.target : (p[3] || '');
  const d = new Date(); d.setFullYear(d.getFullYear() + 1);
  $('goalDate').value = g ? (g.deadline || '') : (p[0] ? ds(d) : '');
  $('goalDate').min = todayStr();
  const ic = g ? g.icon : (p[1] || 'piggy'), col = g ? g.color : (p[2] || PALETTE[0]);
  $('goalIcons').innerHTML = GOAL_ICONS.map((k, i) => `<input type="radio" name="goalIcon" id="gi-${i}" value="${k}" ${k === ic ? 'checked' : ''}><label for="gi-${i}" aria-label="${k}">${icon(k, 21)}</label>`).join('');
  const pal = PALETTE.includes(col) ? PALETTE : [col, ...PALETTE.slice(0, 11)];
  $('goalColors').innerHTML = pal.map((c, i) => `<input type="radio" name="goalColor" id="gc-${i}" value="${c}" ${c === col ? 'checked' : ''}><label for="gc-${i}" style="background:${c};color:${c}" aria-label="${c}"><span style="color:#fff">${icon('tick', 18, 3)}</span></label>`).join('');
  $('goalDelete').hidden = !g;
  $('goalErr').textContent = '';
  if ($('sheetDlg').open) $('sheetDlg').close();
  $('goalDlg').showModal();
}
async function saveGoal(ev) {
  ev.preventDefault();
  const name = $('goalName').value.trim(), target = parseAmount($('goalTarget').value), deadline = $('goalDate').value;
  if (!name) return ($('goalErr').textContent = 'Give your goal a name.');
  if (!(target > 0)) return ($('goalErr').textContent = 'Enter a target amount.');
  if (deadline && deadline <= todayStr() && !S.editingGoal) return ($('goalErr').textContent = 'Pick a target date in the future.');
  const iconK = document.querySelector('input[name=goalIcon]:checked')?.value || 'piggy';
  const color = document.querySelector('input[name=goalColor]:checked')?.value || PALETTE[0];
  const g = S.editingGoal ? { ...S.editingGoal, name, target, deadline, icon: iconK, color } : { id: uid(), name, target, deadline, icon: iconK, color, start: todayStr(), contributions: [], createdAt: Date.now() };
  await dbPut('goals', g);
  const i = S.goals.findIndex(x => x.id === g.id); i >= 0 ? (S.goals[i] = g) : S.goals.push(g);
  $('goalDlg').close(); go('plan'); toast(S.editingGoal ? 'Goal updated' : `Goal created: ${name}`);
}
async function deleteGoal() {
  const g = S.editingGoal; if (!g || !confirm(`Delete the goal "${g.name}" and its savings history?`)) return;
  await dbDel('goals', g.id); S.goals = S.goals.filter(x => x.id !== g.id);
  $('goalDlg').close(); render(); toast('Goal deleted');
}
function goalDetailHTML(g) {
  const gi = goalInfo(g), hist = [...(g.contributions || [])].sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at);
  return `<div class="top" style="display:flex;align-items:center;gap:14px;margin-bottom:18px">${tint(g, 50, 16)}<div style="flex:1;min-width:0"><h3 style="margin:0">${esc(g.name)}</h3>
      <div class="muted" style="font-size:13px">${g.deadline ? 'Target: ' + esc(parseDate(g.deadline).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })) : 'No target date'}</div></div>
      <button type="button" class="rbtn sm" data-action="edit-goal" data-id="${g.id}" aria-label="Edit goal">${icon('pencil', 18, 2.2)}</button></div>
    <div class="gamt" style="margin-top:0"><span class="num">${esc(fmt(gi.saved))}</span> <small>of ${esc(fmt(g.target))}</small></div>
    ${goalBar(g, gi)}
    <div class="glbl"><span>${Math.round(gi.pct)}% saved</span><b>${gi.left ? esc(fmt(gi.left)) + ' left' : 'Completed'}</b></div>
    <div class="gnote" style="--c:${GOAL_BANNER[gi.state]}">${icon(gi.state === 'done' || gi.state === 'ok' ? 'check' : 'info', 18, 2.2)}<span>${esc(gi.msg)}</span></div>
    <div class="sactions" style="margin:16px 0 4px"><button type="button" class="btn ghost" data-action="contrib" data-id="${g.id}" data-sign="-1" ${gi.saved > 0 ? '' : 'disabled style="opacity:.5"'}>${icon('minus', 18, 2.4)} Withdraw</button>
      <button type="button" class="btn" data-action="contrib" data-id="${g.id}" data-sign="1">${icon('plus', 18, 2.4)} Add money</button></div>
    <div class="flabel" style="margin-top:20px">History</div>
    ${hist.length ? `<div class="slist">${hist.map(c => `<div class="srow" style="padding:12px 14px"><span class="ic" style="width:36px;height:36px;border-radius:12px;background:${c.amount > 0 ? 'var(--green-soft)' : 'var(--red-soft)'};color:${c.amount > 0 ? 'var(--green)' : 'var(--red)'}">${icon(c.amount > 0 ? 'down' : 'up', 16, 2.4)}</span>
      <div class="t" style="font-weight:600">${c.amount > 0 ? 'Added' : 'Withdrawn'}<small>${esc(dayLabel(c.date))}${c.note ? ' · ' + esc(c.note) : ''}</small></div><b class="num ${c.amount > 0 ? 'green' : 'red'}">${c.amount > 0 ? '+' : '−'}${esc(fmt(Math.abs(c.amount)))}</b>
      <button type="button" class="icon-x" data-action="del-contrib" data-id="${c.id}" aria-label="Remove entry">${icon('trash', 16, 2)}</button></div>`).join('')}</div>` : '<p class="note" style="margin:0 2px">No savings added yet.</p>'}`;
}
async function saveContribution() {
  const g = S.goals.find(x => x.id === S.goalId); if (!g) return;
  const amt = parseAmount($('contribAmt').value), date = $('contribDate').value || todayStr();
  if (!(amt > 0)) return ($('contribErr').textContent = 'Enter an amount greater than ₹0.');
  const gi = goalInfo(g);
  if (S.contribSign < 0 && amt > gi.saved) return ($('contribErr').textContent = `You can withdraw up to ${fmt(gi.saved)}.`);
  const c = { id: uid(), amount: S.contribSign * amt, date, note: $('contribNote').value.trim(), at: Date.now() };
  const ng = { ...g, contributions: [...(g.contributions || []), c] };
  await dbPut('goals', ng); S.goals[S.goals.indexOf(g)] = ng;
  $('sheetDlg').close(); render();
  const after = goalInfo(ng);
  toast(after.state === 'done' && gi.state !== 'done' ? `🎉 ${g.name} reached!` : `${S.contribSign > 0 ? 'Added' : 'Withdrew'} ${fmt(amt)} · ${g.name}`);
}
async function deleteContribution(cid) {
  const g = S.goals.find(x => x.id === S.goalId); if (!g || !confirm('Remove this entry?')) return;
  const ng = { ...g, contributions: g.contributions.filter(c => c.id !== cid) };
  await dbPut('goals', ng); S.goals[S.goals.indexOf(g)] = ng;
  $('sheetBody').innerHTML = goalDetailHTML(ng); render();
}

/* ================= Recurring expenses & subscriptions ================= */
const dueDate = (month, day) => `${month}-${pad(Math.min(day, daysInMonth(month)))}`;
const nextDue = r => dueDate(r.lastPosted ? shiftMonth(r.lastPosted, 1) : r.start, r.day);
const ruleVisual = r => r.kind === 'income' ? { name: r.source || 'Income', icon: (INCOME_SOURCES.find(x => x[0] === r.source) || INCOME_SOURCES[0])[1], color: '#16A34A' } : catById(r.categoryId);
/* Posts every due entry up to today (catches up if the app wasn't opened for a while). */
async function postRecurring() {
  const today = todayStr(), cur = thisMonth(), created = [], updated = [];
  for (const r of S.recurring) {
    if (!r.active) continue;
    let m = r.lastPosted ? shiftMonth(r.lastPosted, 1) : r.start, n = 0, changed = false;
    while (m <= cur && n++ < 36) {
      const d = dueDate(m, r.day); if (d > today) break;
      const e = { id: uid(), amount: r.amount, kind: r.kind, categoryId: r.categoryId, source: r.source, payment: r.payment, note: r.name, date: d, recurringId: r.id, createdAt: Date.now() + n };
      for (const k of Object.keys(e)) if (e[k] === undefined || e[k] === null && k !== 'categoryId') delete e[k];
      created.push(e); r.lastPosted = m; changed = true; m = shiftMonth(m, 1);
    }
    if (changed) updated.push(r);
  }
  if (created.length) { await dbPut('expenses', ...created); S.expenses.push(...created); }
  if (updated.length) await dbPut('recurring', ...updated);
  return created;
}
const RULE_IDEAS = [['Rent', 'home', 15000, false], ['EMI', 'bank', 8000, false], ['Netflix', 'film', 649, true], ['Maid salary', 'sparkles', 3000, false], ['SIP', 'box', 5000, false], ['Mobile recharge', 'phone', 299, true], ['Salary', 'income', 50000, false]];
function viewRecurring() {
  const act = S.recurring.filter(r => r.active), exp = act.filter(r => r.kind !== 'income');
  const fixed = sum(exp.map(r => r.amount)), subsYr = sum(exp.filter(r => r.subscription).map(r => r.amount * 12));
  const row = r => { const v = ruleVisual(r), nd = nextDue(r);
    return `<button class="srow" data-action="edit-rule" data-id="${r.id}">${tint(v, 42, 14)}<div class="t">${esc(r.name)}<small>${r.active ? `${ordinal(r.day)} of every month · next ${esc(dayLabel(nd))}` : 'Paused'}${r.subscription ? ` · ${esc(fmt(r.amount * 12))}/yr` : ''}</small></div>
      <b class="num ${r.kind === 'income' ? 'green' : ''}" style="${r.active ? '' : 'opacity:.45'}">${r.kind === 'income' ? '+' : ''}${esc(fmt(r.amount))}</b></button>`; };
  const sec = (title, list, extra = '') => list.length ? `<div class="sec"><h2>${title}</h2>${extra}</div><div class="slist">${list.map(row).join('')}</div>` : '';
  const ideas = `<div class="sec"><h2>Quick add</h2></div><div class="chips" style="flex-wrap:wrap;margin:0;padding:0">${RULE_IDEAS.map(([n, ic], i) => `<button class="chip" data-action="rule-idea" data-i="${i}" style="display:inline-flex;align-items:center;gap:6px">${icon(ic === 'income' ? 'rupee' : ic, 16, 2)}${esc(n)}</button>`).join('')}</div>`;
  const head = `<header class="head center"><button class="rbtn" data-action="back" aria-label="Back">${icon('back', 20)}</button><h1>Recurring</h1>
    <button class="rbtn" data-action="add-rule" aria-label="Add recurring">${icon('plus', 20, 2.2)}</button></header>`;
  if (!S.recurring.length) return head + emptyCard('repeat', 'Nothing repeating yet', 'Add rent, EMI, subscriptions, maid salary, SIP or your salary once — they’ll be added automatically every month on their day.', `<button class="btn" data-action="add-rule">${icon('plus', 18, 2.4)} Add recurring</button>`) + ideas;
  const subs = S.recurring.filter(r => r.kind !== 'income' && r.subscription), bills = S.recurring.filter(r => r.kind !== 'income' && !r.subscription), inc = S.recurring.filter(r => r.kind === 'income');
  return head + `<div class="tiles"><div class="card"><div class="cap">Fixed per month</div><div class="v num">${esc(fmt(fixed))}</div><div class="muted" style="font-size:12.5px;margin-top:2px">${exp.length} active</div></div>
      <div class="card"><div class="cap">Subscriptions</div><div class="v num blue">${esc(fmt(subsYr))}<span class="muted" style="font-size:13px;font-weight:600">/yr</span></div><div class="muted" style="font-size:12.5px;margin-top:2px">${esc(fmt(subsYr / 12))} a month</div></div></div>` +
    sec('Subscriptions', subs, `<span class="muted" style="font-size:13px">${esc(fmt(subsYr))} a year</span>`) + sec('Bills & fixed costs', bills) + sec('Income', inc) +
    `<p class="note">Entries are added on their day each month, marked “↻ Monthly” in your history. Editing a repeat changes future entries only.</p>` + ideas;
}
function ruleFormHTML(r, idea) {
  const kind = r?.kind === 'income' || idea?.[1] === 'income' ? 'income' : 'expense';
  const catId = r?.categoryId || (idea ? S.categories.find(c => c.icon === idea[1])?.id : null) || S.categories[0]?.id;
  const today = new Date().getDate(), day = r?.day || today;
  const sel = (id, opts, val) => `<select id="${id}" style="flex:1;background:none;border:0;font-size:16px;color:var(--text);outline:0;height:100%">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  return `<h3>${r ? 'Edit recurring' : 'New recurring'}</h3>
    <div class="seg" id="ruleKind" style="margin-bottom:14px"><button type="button" data-action="rule-kind" data-k="expense" class="${kind === 'expense' ? 'on' : ''}">Expense</button><button type="button" data-action="rule-kind" data-k="income" class="${kind === 'income' ? 'on' : ''}">Income</button></div>
    <input type="hidden" id="rKind" value="${kind}">
    <label class="irow"><input id="rName" maxlength="40" placeholder="Name, e.g. Rent or Netflix" value="${esc(r?.name || idea?.[0] || '')}"></label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <label class="irow"><span style="font-weight:700;color:var(--accent)">₹</span><input id="rAmt" inputmode="decimal" placeholder="Amount" value="${r?.amount || idea?.[2] || ''}"></label>
      <label class="irow"><span class="muted" style="font-size:13px">Day</span>${sel('rDay', [...Array(31)].map((_, i) => [i + 1, ordinal(i + 1)]), day)}</label></div>
    <label class="irow" id="rCatRow" ${kind === 'income' ? 'hidden' : ''}><span class="muted" style="font-size:13px">Category</span>${sel('rCat', S.categories.map(c => [c.id, c.name]), catId)}</label>
    <label class="irow" id="rSrcRow" ${kind === 'income' ? '' : 'hidden'}><span class="muted" style="font-size:13px">Source</span>${sel('rSrc', INCOME_SOURCES.map(([n]) => [n, n]), r?.source || 'Salary')}</label>
    <label class="irow"><span class="muted" style="font-size:13px">Via</span>${sel('rPay', PAYMENT_MODES.map(([m]) => [m, m]), r?.payment || S.settings.defaultPayment || 'UPI')}</label>
    <label class="chk" id="rSubRow" ${kind === 'income' ? 'hidden' : ''} style="padding:2px 4px 8px"><input type="checkbox" id="rSub" ${r?.subscription || idea?.[3] ? 'checked' : ''}> It’s a subscription (counts in your yearly subscriptions total)</label>
    ${r ? `<label class="chk" style="padding:2px 4px 8px"><input type="checkbox" id="rActive" ${r.active ? 'checked' : ''}> Active (untick to pause)</label>`
      : `<label class="chk" style="padding:2px 4px 8px"><input type="checkbox" id="rNow"> Also add this month’s entry now (if it’s already due)</label>`}
    <div class="err" id="rErr"></div>
    <div class="sactions">${r ? `<button type="button" class="btn danger" data-action="delete-rule">Delete</button>` : `<button type="button" class="btn ghost" data-action="close-dlg">Cancel</button>`}<button type="submit" class="btn">Save</button></div>`;
}
async function saveRule() {
  const r = S.editingRule, kind = $('rKind').value, amount = parseAmount($('rAmt').value), name = $('rName').value.trim(), day = +$('rDay').value;
  if (!name) return ($('rErr').textContent = 'Give it a name.');
  if (!(amount > 0)) return ($('rErr').textContent = 'Enter an amount.');
  const cur = thisMonth(), dueNow = dueDate(cur, day) <= todayStr();
  const base = { name, amount, day, kind: kind === 'income' ? 'income' : undefined, categoryId: kind === 'income' ? null : $('rCat').value, source: kind === 'income' ? $('rSrc').value : undefined,
    payment: $('rPay').value, subscription: kind !== 'income' && $('rSub').checked };
  let rule;
  if (r) rule = { ...r, ...base, active: $('rActive').checked };
  else { const now = $('rNow').checked; rule = { id: uid(), ...base, start: cur, lastPosted: dueNow && !now ? cur : undefined, active: true, createdAt: Date.now() }; }
  for (const k of Object.keys(rule)) if (rule[k] === undefined) delete rule[k];
  await dbPut('recurring', rule);
  const i = S.recurring.findIndex(x => x.id === rule.id); i >= 0 ? (S.recurring[i] = rule) : S.recurring.push(rule);
  S.recurring.sort((a, b) => a.day - b.day);
  const posted = await postRecurring();
  $('sheetDlg').close(); render();
  toast(r ? 'Recurring updated' : `${name} repeats on the ${ordinal(day)}${posted.length ? ' · added this month’s' : ''}`);
}
async function deleteRule() {
  const r = S.editingRule; if (!r || !confirm(`Stop and delete “${r.name}”? Entries already added stay in your history.`)) return;
  await dbDel('recurring', r.id); S.recurring = S.recurring.filter(x => x.id !== r.id);
  $('sheetDlg').close(); render(); toast('Recurring deleted');
}

/* ================= Quick-add favourites ================= */
function viewFavs() {
  const favs = favorites();
  return `<header class="head center"><button class="rbtn" data-action="back" aria-label="Back">${icon('back', 20)}</button><h1>Quick-add</h1>
    <button class="rbtn" data-action="add-fav" aria-label="Add favourite">${icon('plus', 20, 2.2)}</button></header>
    ${favs.length ? `<div class="slist">${favs.map(f => `<button class="srow" data-action="edit-fav" data-id="${f.id}">${tint(catById(f.categoryId), 42, 14)}<div class="t">${esc(f.name)}<small>${esc(catById(f.categoryId).name)} · ${esc(f.payment || '')}</small></div><b class="num">${esc(fmt(f.amount))}</b></button>`).join('')}</div>`
      : emptyCard('star', 'No quick-add buttons', 'Add things you buy often — like chai, metro or lunch — and log them with one tap from the dashboard.', `<button class="btn" data-action="add-fav">${icon('plus', 18, 2.4)} Add one</button>`)}
    <p class="note">Tap a button on the dashboard to log it instantly for today. You can also tick “Save to quick-add” when adding an expense.</p>`;
}
function favFormHTML(f) {
  const sel = (id, opts, val) => `<select id="${id}" style="flex:1;background:none;border:0;font-size:16px;color:var(--text);outline:0;height:100%">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  return `<h3>${f ? 'Edit quick-add' : 'New quick-add'}</h3>
    <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:10px"><label class="irow"><input id="fName" maxlength="24" placeholder="Name, e.g. Chai" value="${esc(f?.name || '')}"></label>
    <label class="irow"><span style="font-weight:700;color:var(--accent)">₹</span><input id="fAmt" inputmode="decimal" placeholder="Amount" value="${f?.amount || ''}"></label></div>
    <label class="irow"><span class="muted" style="font-size:13px">Category</span>${sel('fCat', S.categories.map(c => [c.id, c.name]), f?.categoryId || S.categories[0]?.id)}</label>
    <label class="irow"><span class="muted" style="font-size:13px">Via</span>${sel('fPay', PAYMENT_MODES.map(([m]) => [m, m]), f?.payment || S.settings.defaultPayment || 'UPI')}</label>
    <div class="err" id="fErr"></div>
    <div class="sactions">${f ? `<button type="button" class="btn danger" data-action="delete-fav">Delete</button>` : `<button type="button" class="btn ghost" data-action="close-dlg">Cancel</button>`}<button type="submit" class="btn">Save</button></div>`;
}
async function saveFav() {
  const name = $('fName').value.trim(), amount = parseAmount($('fAmt').value);
  if (!name) return ($('fErr').textContent = 'Give it a name.');
  if (!(amount > 0)) return ($('fErr').textContent = 'Enter an amount.');
  const f = { id: S.editingFav?.id || uid(), name, amount, categoryId: $('fCat').value, payment: $('fPay').value };
  const favs = favorites().filter(x => x.id !== f.id); const idx = favorites().findIndex(x => x.id === f.id);
  idx >= 0 ? favs.splice(idx, 0, f) : favs.push(f);
  await setSetting('favorites', favs); $('sheetDlg').close(); render(); toast('Quick-add saved');
}
async function quickAdd(id) {
  const f = favorites().find(x => x.id === id); if (!f) return;
  const e = { id: uid(), amount: f.amount, categoryId: f.categoryId, note: f.name, payment: f.payment, date: todayStr(), createdAt: Date.now() };
  await dbPut('expenses', e); S.expenses.push(e); haptic(12); render();
  toast(`Added ${f.name} · ${fmt(f.amount)}`, 'Undo', async () => { await dbDel('expenses', e.id); S.expenses = S.expenses.filter(x => x.id !== e.id); render(); toast('Removed'); });
  budgetAlerts(f.categoryId, e.date, f.amount);
}

/* ================= Calendar heatmap ================= */
function calendarHTML(r) {
  const today = todayStr(), byDay = {};
  expensesIn(r.start, r.end).forEach(e => byDay[e.date] = round2((byDay[e.date] || 0) + sv(e)));
  const max = Math.max(...Object.values(byDay).filter(v => v > 0), 1), start = parseDate(r.start), n = diffDays(r.start, r.end) + 1;
  const short = v => v >= 100000 ? (v / 100000).toFixed(1) + 'L' : v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k' : String(Math.round(v));
  const alpha = [0, .16, .34, .58, .9];
  let cells = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => `<div class="dh">${d}</div>`).join('') + '<div class="dc blank"></div>'.repeat((start.getDay() + 6) % 7);
  for (let i = 0; i < n; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i); const k = ds(d), v = byDay[k] || 0, lvl = v > 0 ? Math.max(1, Math.ceil(Math.sqrt(v / max) * 4)) : 0;
    cells += `<button class="dc ${k === today ? 'today' : ''} ${k > today ? 'fut' : ''} ${S.calDay === k ? 'sel' : ''}" data-action="cal-day" data-d="${k}" style="${lvl ? `background:rgba(59,130,246,${alpha[lvl]});${lvl >= 3 ? 'color:#fff' : ''}` : ''}" aria-label="${esc(d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' }))}: ${esc(fmt(v))}">${d.getDate()}${v > 0 ? `<small>${short(v)}</small>` : ''}</button>`;
  }
  const noSpend = [...Array(n)].filter((_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); const k = ds(d); return k <= today && !(byDay[k] > 0); }).length;
  let detail = '';
  if (S.calDay && S.calDay >= r.start && S.calDay <= r.end) {
    const items = S.expenses.filter(e => e.date === S.calDay).sort((a, b) => b.createdAt - a.createdAt);
    detail = `<div class="glabel" style="margin:18px 2px 10px"><span>${esc(dayLabel(S.calDay))}</span><span class="num">${byDay[S.calDay] > 0 ? esc(fmt(byDay[S.calDay])) : ''}</span></div>` +
      (items.length ? items.map(txRow).join('') : `<p class="note" style="margin:0 2px">Nothing logged this day.</p>`);
  }
  return `<section class="card"><div class="ch"><h3>Calendar</h3><span class="muted" style="font-size:12.5px">${noSpend} no-spend day${noSpend === 1 ? '' : 's'}</span></div>
    <div class="cal">${cells}</div>
    <div class="legend-h">Less ${alpha.slice(1).map(a => `<i style="background:rgba(59,130,246,${a})"></i>`).join('')} More</div>${detail}</section>`;
}

/* ================= Monthly report card (drawn on a canvas, shareable as an image) ================= */
function reportData() {
  const r = rangeOf('month', S.period === 'month' ? S.statsOffset : 0), prev = rangeOf('month', (S.period === 'month' ? S.statsOffset : 0) - 1);
  const list = expensesIn(r.start, r.end), total = Math.max(0, spendSum(list)), prevTotal = Math.max(0, spendSum(expensesIn(prev.start, prev.end)));
  const byCat = Object.entries(totalsByCat(list)).map(([id, v]) => ({ c: catById(id), v })).sort((a, b) => b.v - a.v);
  const byDay = {}; list.forEach(e => byDay[e.date] = round2((byDay[e.date] || 0) + sv(e)));
  const big = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
  const inc = sum(incomeIn(r.start, r.end).map(e => e.amount)), budget = effectiveBudget(r.key);
  const days = Math.min(diffDays(r.start, r.end) + 1, daysElapsed(r)), noSpend = days - Object.values(byDay).filter(v => v > 0).length;
  return { r, total, prevTotal, byCat, big, inc, budget, noSpend, change: prevTotal ? Math.round((total - prevTotal) / prevTotal * 100) : null, count: list.filter(e => e.kind !== 'credit').length };
}
function drawReport(d) {
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), F = '-apple-system, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  const rr = (X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0B1220'); g.addColorStop(1, '#111827'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const hg = x.createLinearGradient(0, 0, W, 560); hg.addColorStop(0, '#5B9BFF'); hg.addColorStop(1, '#2563EB'); x.fillStyle = hg; rr(48, 48, W - 96, 520, 48); x.fill();
  x.save(); rr(48, 48, W - 96, 520, 48); x.clip(); x.fillStyle = 'rgba(255,255,255,.08)'; x.beginPath(); x.arc(W - 120, 90, 210, 0, 7); x.fill(); x.restore();
  x.fillStyle = 'rgba(255,255,255,.85)'; x.font = `600 34px ${F}`; x.fillText('MONTHLY REPORT', 104, 140);
  x.fillStyle = '#fff'; x.font = `700 64px ${F}`; x.fillText(d.r.label, 104, 220);
  x.fillStyle = 'rgba(255,255,255,.85)'; x.font = `500 36px ${F}`; x.fillText('Total spent', 104, 320);
  x.fillStyle = '#fff'; x.font = `800 112px ${F}`; x.fillText(fmt(Math.round(d.total)), 100, 430);
  let pill = d.budget ? (d.total <= d.budget ? `✓ ${fmt(Math.round(d.budget - d.total))} under budget` : `${fmt(Math.round(d.total - d.budget))} over budget`) : `${d.count} expenses logged`;
  x.font = `700 32px ${F}`; const pw = x.measureText(pill).width + 56; x.fillStyle = 'rgba(255,255,255,.18)'; rr(104, 470, pw, 64, 32); x.fill(); x.fillStyle = '#fff'; x.fillText(pill, 132, 513);
  const box = (X, Y, label, val, sub, col) => { x.fillStyle = '#1B2333'; rr(X, Y, 468, 190, 32); x.fill();
    x.fillStyle = '#8E98A8'; x.font = `700 26px ${F}`; x.fillText(label.toUpperCase(), X + 36, Y + 56);
    x.fillStyle = col || '#F4F4F5'; x.font = `700 46px ${F}`; let v = val; while (x.measureText(v).width > 400 && v.length > 4) v = v.slice(0, -2) + '…'; x.fillText(v, X + 36, Y + 118);
    x.fillStyle = '#8E98A8'; x.font = `500 28px ${F}`; let sb = sub; while (x.measureText(sb).width > 400 && sb.length > 4) sb = sb.slice(0, -2) + '…'; x.fillText(sb, X + 36, Y + 160); };
  const top = d.byCat[0];
  box(48, 610, 'Top category', top ? top.c.name : '—', top ? `${fmt(Math.round(top.v))} · ${Math.round(top.v / d.total * 100)}%` : 'No spending', top?.c.color);
  box(564, 610, 'Biggest day', d.big ? fmt(Math.round(d.big[1])) : '—', d.big ? parseDate(d.big[0]).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'short' }) : '');
  box(48, 830, 'vs last month', d.change === null ? '—' : `${d.change > 0 ? '↑' : d.change < 0 ? '↓' : ''} ${Math.abs(d.change)}%`, d.change === null ? 'No data for last month' : d.change > 0 ? 'more than last month' : 'less than last month', d.change === null ? null : d.change > 0 ? '#F87171' : '#4ADE80');
  if (d.inc) box(564, 830, 'Saved', fmt(Math.round(d.inc - d.total)), `${Math.round((d.inc - d.total) / d.inc * 100)}% of ${fmt(Math.round(d.inc))} income`, d.inc >= d.total ? '#60A5FA' : '#F87171');
  else box(564, 830, 'No-spend days', String(d.noSpend), d.noSpend === 1 ? 'day without spending' : 'days without spending', '#60A5FA');
  x.fillStyle = '#F4F4F5'; x.font = `700 34px ${F}`; x.fillText('Where it went', 72, 1100);
  d.byCat.slice(0, 3).forEach((o, i) => { const Y = 1140 + i * 58;
    x.fillStyle = '#D4D4D8'; x.font = `600 28px ${F}`; x.fillText(o.c.name, 72, Y + 22);
    x.textAlign = 'right'; x.fillText(fmt(Math.round(o.v)), W - 72, Y + 22); x.textAlign = 'left';
    x.fillStyle = '#26262C'; rr(420, Y + 4, 400, 20, 10); x.fill(); x.fillStyle = o.c.color; rr(420, Y + 4, Math.max(20, 400 * o.v / d.byCat[0].v), 20, 10); x.fill(); });
  x.fillStyle = '#5E5E66'; x.font = `500 24px ${F}`; x.textAlign = 'center'; x.fillText('Tracked privately on my phone · Expenses', W / 2, H - 28); x.textAlign = 'left';
  return c;
}
let reportCanvas = null;
function openReport() {
  const d = reportData(); reportCanvas = drawReport(d);
  S.sheet = 'report';
  $('sheetBody').innerHTML = `<h3>${esc(d.r.label)} report card</h3><img src="${reportCanvas.toDataURL('image/png')}" alt="Report card for ${esc(d.r.label)}" style="width:100%;border-radius:18px;display:block;margin-bottom:14px">
    <div class="sactions"><button type="button" class="btn ghost" data-action="close-dlg">Close</button><button type="button" class="btn" data-action="share-report">${icon('share', 18, 2)} Share image</button></div>`;
  if (!$('sheetDlg').open) $('sheetDlg').showModal();
}
function shareReport() {
  if (!reportCanvas) return;
  reportCanvas.toBlob(async blob => {
    const file = new File([blob], 'expense-report.png', { type: 'image/png' });
    try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'My monthly expense report' }); return; } } catch (e) { if (e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'expense-report.png'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast('Report image downloaded');
  }, 'image/png');
}

const VIEWS = { ious: viewIous, recurring: viewRecurring, favs: viewFavs, plan: viewPlan, home: viewHome, stats: viewStats, budget: viewBudget, profile: viewProfile, transactions: viewTransactions, categories: viewCategories };
const TABS = [['home', 'home', 'Home'], ['stats', 'chart', 'Stats'], ['budget', 'wallet', 'Budget'], ['plan', 'flag', 'Plan'], ['profile', 'user', 'Profile']];

/* Animation modes: 'enter' = page change (cards rise in, numbers count up, charts draw); 'charts' = data view change (charts redraw only). */
function render() {
  const v = S.sub || S.view, mode = S.anim, main = $('main'); S.anim = null;
  main.classList.remove('enter', 'charts');
  main.innerHTML = VIEWS[v]();
  if (mode) { void main.offsetWidth; main.classList.add(mode); }
  if (mode === 'enter') countUps();
  $('tabs').innerHTML = TABS.map(([k, ic, l]) => `<button class="tab ${S.view === k && !S.sub ? 'on' : ''} ${mode === 'enter' && S.view === k && !S.sub ? 'pop' : ''}" data-view="${k}">${icon(ic, 23, S.view === k && !S.sub ? 2.1 : 1.8)}${l}</button>`).join('');
  $('fab').hidden = ['profile', 'categories', 'plan', 'recurring', 'favs', 'ious'].includes(v);
}

