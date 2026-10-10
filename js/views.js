/* Expense Tracker — Screens: dashboard, stats, budget, profile, transactions, categories, lent & borrowed. Loaded in order: core → views → features → forms → main. */
'use strict';
/* ================= Shared pieces ================= */
function txVisual(e) {
  if (isIncome(e)) { const src = INCOME_SOURCES.find(x => x[0] === e.source) || INCOME_SOURCES[0]; return { c: { name: e.source || 'Income', icon: src[1], color: '#16A34A' }, amt: '+' + fmt(e.amount), cls: 'green', tag: 'Income' }; }
  const c = catById(e.categoryId);
  return e.kind === 'credit' ? { c, amt: '+' + fmt(e.amount), cls: 'green', tag: 'Refund' } : { c, amt: '−' + fmt(e.amount), cls: '' };
}
function txRow(e) {
  const v = txVisual(e), c = v.c;
  const bits = [e.recurringId ? '↻ Monthly' : '', e.split ? `Split ${e.split.n} ways of ${fmt(e.split.total)}` : '', e.payment, e.note ? c.name : ''].filter(Boolean);
  const sub = bits.join(' · ') || dayLabel(e.date);
  return `<div class="sw-wrap"><div class="sw-acts"><button class="e" data-action="edit-expense" data-id="${e.id}" tabindex="-1">${icon('pencil', 18, 2.2)}Edit</button><button class="d" data-action="swipe-del" data-id="${e.id}" tabindex="-1">${icon('trash', 18, 2.2)}Delete</button></div>
    <button class="tx" data-action="edit-expense" data-id="${e.id}">${tint(c)}
    <div class="g"><div class="t">${esc(e.note || c.name)}</div><div class="s">${v.tag ? `<span class="tagp">${v.tag}</span>` : ''}${esc(sub)}</div></div>
    <span class="a ${v.cls}">${esc(v.amt)}</span></button></div>`;
}
function donut(segs, total, size = 176) {
  const R = 15.9155, gap = segs.length > 1 ? 1.4 : 0; let cum = 0;
  const rings = segs.map(s => { const p = s.value / total * 100, len = Math.max(p - gap, .3);
    const el = `<circle r="${R}" cx="21" cy="21" fill="none" stroke="${s.color}" class="arc" stroke-width="3.6" stroke-dasharray="${len.toFixed(3)} ${(100 - len).toFixed(3)}" stroke-dashoffset="${(25 - cum - gap / 2).toFixed(3)}"/>`;
    cum += p; return el; }).join('');
  return `<svg class="donut" style="width:${size}px;height:${size}px" viewBox="0 0 42 42" role="img" aria-label="Spending by category">
    <circle r="${R}" cx="21" cy="21" fill="none" stroke="var(--surface-3)" stroke-width="3.6"/>${rings}
    <text x="21" y="21.6" text-anchor="middle" font-size="5.4" font-weight="700" style="fill:var(--text)">${esc(fmtShort(total))}</text>
    <text x="21" y="26.4" text-anchor="middle" font-size="2.3" font-weight="700" letter-spacing=".35" style="fill:var(--muted)">SPENT</text></svg>`;
}
const emptyCard = (ic, title, text, btn = '') => `<div class="card empty"><div class="ei">${icon(ic, 28)}</div><b>${title}</b><div>${text}</div>${btn}</div>`;

/* ================= Views ================= */
function forecastInfo(m) {
  const r = cycleRange(m), today = todayStr();
  if (today < r.start || today > r.end) return null;
  const list = expensesIn(r.start, r.end), spent = Math.max(0, spendSum(list));
  const total = diffDays(r.start, r.end) + 1, elapsed = diffDays(r.start, today) + 1, left = total - elapsed;
  const variable = Math.max(0, spendSum(list.filter(e => !e.recurringId)));
  const upcoming = sum(S.recurring.filter(x => x.active && x.kind !== 'income' && nextDue(x) > today && nextDue(x) <= r.end).map(x => x.amount));
  const projected = round2(spent + variable / elapsed * left + upcoming);
  return { spent, avg: spent / elapsed, projected, upcoming, end: r.end, elapsed };
}
function viewHome() {
  const m = curCycle(), r = cycleRange(m), today = todayStr();
  const spent = Math.max(0, spendSum(expensesIn(r.start, r.end))), target = effectiveBudget(m);
  const daysLeft = diffDays(today, r.end) + 1;
  const over = target && spent > target;
  const name = S.settings.name;

  const hero = `<section class="card hero">
    <div class="lbl">Spent ${cycleDay() === 1 ? 'in ' + esc(cycleName(m)) : 'this cycle · ' + esc(cycleLabel(m))}</div>
    <div class="amt num countup">${esc(fmt(spent))}</div>
    ${target ? `<div class="hbar"><i class="${over ? 'over' : ''}" style="width:${Math.min(100, spent / target * 100)}%"></i></div>
      ${over ? `<span class="pace">${Math.round(spent / target * 100)}% of budget used</span>` : `<span class="pace">${daysLeft} day${daysLeft === 1 ? '' : 's'} left · ~${esc(fmt(Math.floor((target - spent) / daysLeft)))}/day</span>`}` : ''}
    <div class="cols">
      <div><div class="cap">${icon('target', 13, 2.4)} Budget</div><div class="v num">${target ? esc(fmt(target)) : '<button data-view="budget" style="font-size:15px;font-weight:700;text-decoration:underline">Set budget</button>'}</div></div>
      <div><div class="cap">${icon(over ? 'up' : 'down', 13, 2.4)} ${over ? 'Over by' : 'Left'}</div><div class="v num">${target ? esc(fmt(Math.abs(target - spent))) : '—'}</div></div>
    </div></section>`;

  // Month-end forecast
  const f = forecastInfo(m);
  let forecast = '';
  if (f && f.spent > 0) {
    const endL = parseDate(f.end).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
    const diff = target ? round2(f.projected - target) : 0;
    const msg = `At this pace you’ll spend <b style="color:var(--text)">${esc(fmt(Math.round(f.projected)))}</b> by ${esc(endL)}` +
      (target ? (diff > 0 ? ` — <b class="red">${esc(fmt(Math.round(diff)))} over budget</b>.` : ` — <b class="green">${esc(fmt(Math.round(-diff)))} under budget</b>.`) : '.') +
      (f.upcoming ? ` Includes ${esc(fmt(f.upcoming))} of upcoming bills.` : '');
    forecast = `<section class="card fc"><div class="row3"><div><div class="cap">Daily average</div><div class="v num">${esc(fmt(Math.round(f.avg)))}</div></div>
      <div><div class="cap">Projected</div><div class="v num ${target && diff > 0 ? 'red' : ''}">${esc(fmt(Math.round(f.projected)))}</div></div></div><div class="msg">${msg}</div></section>`;
  }

  // Cash flow & savings
  const inc = sum(incomeIn(r.start, r.end).map(e => e.amount));
  let flow = '';
  if (inc > 0) {
    const saved = round2(inc - spent), rate = Math.round(saved / inc * 100);
    flow = `<section class="card"><div class="ch" style="margin-bottom:14px"><h3>Cash flow</h3><span class="badge ${saved >= 0 ? 'down' : 'up'}">${saved >= 0 ? rate + '% saved' : 'Overspent'}</span></div>
      <div class="flow"><div><div class="cap">Income</div><div class="v num green">${esc(fmtShort(inc))}</div></div><div><div class="cap">Spent</div><div class="v num">${esc(fmtShort(spent))}</div></div>
      <div><div class="cap">${saved >= 0 ? 'Saved' : 'Short'}</div><div class="v num ${saved >= 0 ? 'blue' : 'red'}">${esc(fmtShort(Math.abs(saved)))}</div></div></div>
      ${saved > 0 && S.goals.some(g => goalInfo(g).state !== 'done') ? `<button class="btn ghost" style="width:100%;margin-top:14px" data-action="save-to-goal" data-amt="${saved}">${icon('piggy', 18)} Move ${esc(fmt(saved))} to a goal</button>` : ''}</section>`;
  } else if (S.expenses.filter(e => !isIncome(e)).length >= 5 && !S.expenses.some(isIncome)) {
    flow = `<button class="catcard" data-action="add-income" style="padding:14px 16px"><div class="top"><span class="ic" style="background:var(--green-soft);color:var(--green)">${icon('rupee', 22)}</span><div class="g"><div class="t">Add your salary</div><div class="s n">See how much you save each month</div></div>${icon('chevR', 18, 2)}</div></button>`;
  }

  // Quick-add favourites
  const favs = favorites();
  const quick = `<div class="sec" style="margin-top:6px"><h2>Quick add</h2><button class="lnk" data-action="to-favs">Edit ${icon('chevR', 15, 2.4)}</button></div>
    <div class="qa">${favs.map(fv => { const c = catById(fv.categoryId); return `<button class="qbtn" data-action="quick-add" data-id="${fv.id}"><span class="ic" style="background:${c.color}22;color:${c.color}">${icon(c.icon, 16, 2)}</span>${esc(fv.name)}<small>${esc(fmt(fv.amount))}</small></button>`; }).join('')}
    <button class="qbtn" data-action="add-fav" style="padding-left:12px;color:var(--accent)">${icon('plus', 16, 2.4)} New</button></div>`;

  const pr = rangeOf(S.homePeriod, 0), list = expensesIn(pr.start, pr.end), tot = sum(Object.values(totalsByCat(list)));
  let byCat = Object.entries(totalsByCat(list)).map(([id, v]) => ({ c: catById(id), v })).sort((a, b) => b.v - a.v);
  if (byCat.length > 6) byCat = [...byCat.slice(0, 5), { c: { name: `Others (${byCat.length - 5})`, color: '#71717A' }, v: sum(byCat.slice(5).map(x => x.v)) }];
  const pills = `<div class="pills" style="margin-top:18px">${['day', 'week', 'month', 'year'].map(p => `<button class="pill ${S.homePeriod === p ? 'on' : ''}" data-action="home-period" data-p="${p}">${p[0].toUpperCase() + p.slice(1)}</button>`).join('')}</div>`;
  const breakdown = tot ? `<section class="card">
      <div class="ch"><h3>${{ day: 'Today’s', week: 'Weekly', month: cycleDay() === 1 ? 'Monthly' : 'This cycle’s', year: 'Yearly' }[S.homePeriod]} Spending</h3><button class="lnk" data-action="to-stats">Details ${icon('chevR', 15, 2.4)}</button></div>
      <div class="donut-box">${donut(byCat.map(x => ({ value: x.v, color: x.c.color })), tot)}</div>
      <div class="legend">${byCat.slice(0, 6).map(x => `<div><span class="dot" style="background:${x.c.color}"></span><span class="n">${esc(x.c.name)}</span><span class="p">${Math.round(x.v / tot * 100)}%</span></div>`).join('')}</div>
    </section>` : emptyCard('receipt', `Nothing spent ${S.homePeriod === 'day' ? 'today' : 'this ' + S.homePeriod} yet`, 'Tap + to add your first expense.');

  // Upcoming bills (next 7 days)
  const in7 = ds(new Date(Date.now() + 7 * 864e5));
  const up = S.recurring.filter(x => x.active && x.kind !== 'income').map(x => ({ x, d: nextDue(x) })).filter(o => o.d > today && o.d <= in7).sort((a, b) => a.d.localeCompare(b.d));
  const upcoming = up.length ? `<div class="sec"><h2>Upcoming bills</h2><button class="lnk" data-action="to-recurring">All ${icon('chevR', 15, 2.4)}</button></div>
    <div class="slist">${up.map(({ x, d }) => `<button class="srow" data-action="edit-rule" data-id="${x.id}">${tint(ruleVisual(x), 42, 14)}<div class="t">${esc(x.name)}<small>${esc(dayLabel(d) === 'Today' ? 'Today' : 'In ' + diffDays(today, d) + ' day' + (diffDays(today, d) === 1 ? '' : 's'))} · ${esc(parseDate(d).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' }))}</small></div><b class="num">${esc(fmt(x.amount))}</b></button>`).join('')}</div>` : '';

  // Lent & borrowed
  const open = S.ious.filter(i => !i.settled);
  let iouCard = '';
  if (open.length) {
    const get = sum(open.filter(i => i.dir === 'lent').map(i => i.amount)), owe = sum(open.filter(i => i.dir === 'borrowed').map(i => i.amount));
    const overdue = open.filter(i => i.due && i.due < today).sort((a, b) => a.due.localeCompare(b.due))[0];
    iouCard = `<div class="sec"><h2>Money with friends</h2><button class="lnk" data-action="to-ious">Open ${icon('chevR', 15, 2.4)}</button></div>
      <button class="catcard" data-action="to-ious"><div class="flow" style="grid-template-columns:1fr 1fr"><div><div class="cap">You’ll get</div><div class="v num green">${esc(fmt(get))}</div></div><div><div class="cap">You owe</div><div class="v num ${owe ? 'red' : ''}">${esc(fmt(owe))}</div></div></div>
      ${overdue ? `<div class="alert" style="background:rgba(249,115,22,.12);color:#F97316">${icon('info', 15, 2.2)} ${overdue.dir === 'lent' ? `${esc(overdue.person)} owes you ${esc(fmt(overdue.amount))}` : `You owe ${esc(overdue.person)} ${esc(fmt(overdue.amount))}`} — due ${diffDays(overdue.due, today)} day${diffDays(overdue.due, today) === 1 ? '' : 's'} ago</div>` : ''}</button>`;
  }

  let goalTeaser = '';
  if (S.goals.length) {
    const gs = S.goals.map(g => ({ g, gi: goalInfo(g) })).filter(x => x.gi.state !== 'done');
    const pick = gs.find(x => x.gi.state === 'behind') || gs[0];
    if (pick) goalTeaser = `<div class="sec"><h2>Savings goal</h2><button class="lnk" data-view="plan">My Plan ${icon('chevR', 15, 2.4)}</button></div>
      <button class="catcard" data-view="plan"><div class="top">${tint(pick.g)}<div class="g"><div class="t">${esc(pick.g.name)}</div><div class="s n">${esc(fmt(pick.gi.saved))} of ${esc(fmt(pick.g.target))}</div></div>${goalRing(pick.g, pick.gi.pct, 52)}</div>
      ${pick.gi.state === 'behind' ? `<div class="alert" style="background:rgba(249,115,22,.12);color:#F97316">${icon('info', 15, 2.2)} ${esc(pick.gi.msg)}</div>` : ''}</button>`;
  }
  const adv = isAdvanced();
  const nudge = `<section class="card insight" style="margin-top:22px"><span class="ib">${icon('sparkles', 22)}</span><div style="flex:1"><b>Want more?</b> Advanced mode adds recurring bills, income & savings, goals, bill splitting, SMS paste and more.
    <div style="display:flex;gap:10px;margin-top:12px"><button class="setbtn" data-action="set-mode" data-m="advanced">Try Advanced</button><button class="lnk" data-action="hide-nudge" style="color:var(--muted)">Not now</button></div></div></section>`;
  const recent = [...S.expenses].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 5);
  const recentHtml = recent.length ? `<div class="sec"><h2>Recent</h2><button class="lnk" data-action="to-tx">See all ${icon('chevR', 15, 2.4)}</button></div>${recent.map(txRow).join('')}` : '';

  return `<header class="head"><div><div class="eyebrow">${esc(new Date().toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }))}</div><h1>Dashboard</h1><div class="subt">${name ? `Namaste, ${esc(name.split(' ')[0])} · ` : ''}${esc(cycleLabel(m))}</div></div>
      <div style="display:flex;gap:10px"><button class="rbtn" data-action="toggle-theme" aria-label="Switch to ${effectiveTheme() === 'dark' ? 'light' : 'dark'} mode">${icon(effectiveTheme() === 'dark' ? 'sun' : 'moon', 20)}</button>
      <button class="rbtn" data-action="to-tx" aria-label="Search transactions">${icon('search', 20)}</button></div></header>
    ${hero}${adv ? forecast + flow + quick : ''}${pills}${breakdown}${adv ? upcoming + iouCard + goalTeaser : ''}${recentHtml}${adv || S.settings.hideAdvNudge ? '' : nudge}`;
}

/* ================= Lent & borrowed ================= */
const initials = n => n.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
const personColor = n => PALETTE[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
function viewIous() {
  const today = todayStr(), open = S.ious.filter(i => !i.settled), done = S.ious.filter(i => i.settled).sort((a, b) => (b.settledAt || 0) - (a.settledAt || 0)).slice(0, 15);
  const get = sum(open.filter(i => i.dir === 'lent').map(i => i.amount)), owe = sum(open.filter(i => i.dir === 'borrowed').map(i => i.amount));
  const row = i => { const col = personColor(i.person), od = !i.settled && i.due && i.due < today;
    return `<button class="srow" data-action="open-iou" data-id="${i.id}"><span class="av" style="background:${col}22;color:${col}">${esc(initials(i.person))}</span>
      <div class="t">${esc(i.person)}<small>${i.dir === 'lent' ? 'Owes you' : 'You owe'}${i.note ? ' · ' + esc(i.note) : ''}${i.due && !i.settled ? ` · <span class="${od ? 'red' : ''}">due ${esc(dayLabel(i.due))}</span>` : ''}${i.settled ? ' · settled' : ''}</small></div>
      <b class="num ${i.settled ? 'muted' : i.dir === 'lent' ? 'green' : 'red'}">${i.dir === 'lent' ? '+' : '−'}${esc(fmt(i.amount))}</b></button>`; };
  const head = `<header class="head center"><button class="rbtn" data-action="back" aria-label="Back">${icon('back', 20)}</button><h1>Lent & borrowed</h1>
    <button class="rbtn" data-action="add-iou" aria-label="Add">${icon('plus', 20, 2.2)}</button></header>`;
  if (!S.ious.length) return head + emptyCard('handshake', 'No one owes anyone', 'Track money you lend or borrow — “Rahul owes me ₹500” — and settle it with one tap. Splitting a bill can add entries here automatically.', `<button class="btn" data-action="add-iou">${icon('plus', 18, 2.4)} Add entry</button>`);
  const sorted = [...open].sort((a, b) => (a.due || '9').localeCompare(b.due || '9') || b.createdAt - a.createdAt);
  return head + `<div class="tiles"><div class="card"><div class="cap">You’ll get</div><div class="v num green">${esc(fmt(get))}</div></div><div class="card"><div class="cap">You owe</div><div class="v num ${owe ? 'red' : ''}">${esc(fmt(owe))}</div></div></div>` +
    (sorted.length ? `<div class="sec"><h2>Open</h2></div><div class="slist">${sorted.map(row).join('')}</div>` : emptyCard('check', 'All settled', 'Nothing pending right now.')) +
    (done.length ? `<div class="sec"><h2>Settled</h2></div><div class="slist" style="opacity:.75">${done.map(row).join('')}</div>` : '') +
    `<p class="note">These don’t count as spending. Reminders show on your dashboard when something is overdue.</p>`;
}
function iouFormHTML(i) {
  const dir = i?.dir || 'lent';
  return `<h3>${i ? 'Edit entry' : 'New entry'}</h3>
    <div class="seg" style="margin-bottom:14px"><button type="button" data-action="iou-dir" data-k="lent" class="${dir === 'lent' ? 'on' : ''}">I lent</button><button type="button" data-action="iou-dir" data-k="borrowed" class="${dir === 'borrowed' ? 'on' : ''}">I borrowed</button></div>
    <input type="hidden" id="iDir" value="${dir}">
    <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:10px"><label class="irow"><input id="iPerson" maxlength="30" placeholder="Name, e.g. Rahul" value="${esc(i?.person || '')}"></label>
      <label class="irow"><span style="font-weight:700;color:var(--accent)">₹</span><input id="iAmt" inputmode="decimal" placeholder="Amount" value="${i?.amount || ''}"></label></div>
    <label class="irow"><input id="iNote" maxlength="50" placeholder="What for? (optional)" value="${esc(i?.note || '')}"></label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <label class="irow"><span class="muted" style="font-size:12px;white-space:nowrap">On</span><input type="date" id="iDate" value="${i?.date || todayStr()}" max="${todayStr()}"></label>
      <label class="irow"><span class="muted" style="font-size:12px;white-space:nowrap">Due</span><input type="date" id="iDue" value="${i?.due || ''}"></label></div>
    <div class="err" id="iErr"></div>
    <div class="sactions"><button type="button" class="btn ghost" data-action="close-dlg">Cancel</button><button type="submit" class="btn">Save</button></div>`;
}
function iouDetailHTML(i) {
  const col = personColor(i.person), od = !i.settled && i.due && i.due < todayStr();
  const msg = i.dir === 'lent' ? `Hi ${i.person.split(' ')[0]}, just a friendly reminder about ${fmt(i.amount)}${i.note ? ' for ' + i.note.replace(/^Split: /, '') : ''}. Thanks!` : '';
  return `<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px"><span class="av" style="width:52px;height:52px;border-radius:17px;background:${col}22;color:${col};font-size:18px">${esc(initials(i.person))}</span>
      <div style="flex:1;min-width:0"><h3 style="margin:0">${esc(i.person)}</h3><div class="muted" style="font-size:13px">${i.dir === 'lent' ? 'Owes you' : 'You owe'} · since ${esc(dayLabel(i.date))}</div></div>
      <button type="button" class="rbtn sm" data-action="edit-iou" data-id="${i.id}" aria-label="Edit">${icon('pencil', 18, 2.2)}</button></div>
    <div class="gamt" style="margin:0 0 6px" ><span class="num ${i.dir === 'lent' ? 'green' : 'red'}">${esc(fmt(i.amount))}</span></div>
    ${i.note ? `<div class="muted" style="font-size:14px;margin-bottom:6px">${esc(i.note)}</div>` : ''}
    ${i.due ? `<div style="font-size:13.5px;margin-bottom:6px" class="${od ? 'red' : 'muted'}">${od ? 'Overdue — was due ' : 'Due '}${esc(dayLabel(i.due))}</div>` : ''}
    ${i.settled ? `<div class="gnote" style="--c:#16A34A;margin-top:10px">${icon('check', 18, 2.2)}<span>Settled ${i.settledAt ? esc(dayLabel(ds(new Date(i.settledAt)))) : ''}</span></div>` : ''}
    <div class="sactions" style="margin-top:18px;flex-wrap:wrap">
      ${i.settled ? `<button type="button" class="btn ghost" data-action="unsettle-iou" data-id="${i.id}">Mark as open</button>` : `<button type="button" class="btn" data-action="settle-iou" data-id="${i.id}">${icon('check', 18, 2.2)} Settled</button>`}
      ${msg && !i.settled ? `<a class="btn ghost" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener noreferrer">Remind on WhatsApp</a>` : ''}
    </div>
    <div class="sactions"><button type="button" class="btn danger" data-action="delete-iou" data-id="${i.id}">Delete</button></div>`;
}
async function saveIou() {
  const person = $('iPerson').value.trim(), amount = parseAmount($('iAmt').value);
  if (!person) return ($('iErr').textContent = 'Who is it with?');
  if (!(amount > 0)) return ($('iErr').textContent = 'Enter an amount.');
  const i = { ...(S.editingIou || { id: uid(), createdAt: Date.now() }), person, amount, dir: $('iDir').value, note: $('iNote').value.trim(), date: $('iDate').value || todayStr(), due: $('iDue').value || undefined };
  if (!i.due) delete i.due;
  await dbPut('ious', i); const idx = S.ious.findIndex(x => x.id === i.id); idx >= 0 ? (S.ious[idx] = i) : S.ious.push(i);
  $('sheetDlg').close(); render(); toast(i.dir === 'lent' ? `${person} owes you ${fmt(amount)}` : `You owe ${person} ${fmt(amount)}`);
}
async function setIou(id, patch) {
  const i = S.ious.find(x => x.id === id); if (!i) return;
  const n = { ...i, ...patch }; for (const k of Object.keys(n)) if (n[k] === undefined) delete n[k];
  await dbPut('ious', n); S.ious[S.ious.indexOf(i)] = n; return n;
}

function viewStats() {
  const r = rangeOf(S.period, S.statsOffset), prev = rangeOf(S.period, S.statsOffset - 1);
  const list = expensesIn(r.start, r.end), total = Math.max(0, spendSum(list));
  const prevList = expensesIn(prev.start, prev.end), prevTotal = Math.max(0, spendSum(prevList));
  const change = prevTotal > 0 ? Math.round((total - prevTotal) / prevTotal * 100) : null;
  const vals = r.buckets.map(b => Math.max(0, spendSum(expensesIn(b.start, b.end))));
  const max = Math.max(...vals, 1);
  const n = r.buckets.length;
  const days = daysElapsed(r);
  const avg = days ? total / days : 0;

  const seg = `<div class="seg">${['week', 'month', 'year'].map(p => `<button class="${S.period === p ? 'on' : ''}" data-action="stats-period" data-p="${p}">${p}</button>`).join('')}</div>`;
  const pnav = `<div class="pnav"><button data-action="stats-prev" aria-label="Previous">${icon('chevL', 18, 2.2)}</button><span>${esc(r.label)}</span><button data-action="stats-next" aria-label="Next" ${S.statsOffset >= 0 ? 'disabled' : ''}>${icon('chevR', 18, 2.2)}</button></div>`;
  const badge = change === null || change === 0 ? '' : `<span class="badge ${change > 0 ? 'up' : 'down'}">${icon(change > 0 ? 'up' : 'down', 12, 2.6)} ${Math.abs(change)}%</span>`;
  const bars = r.buckets.map((b, i) => `<button class="bcol ${b.cur ? 'cur' : ''}" data-action="bar" data-i="${i}" title="${esc(b.full)}: ${esc(fmt(vals[i]))}">
      <div class="btrack"><i style="--i:${i};height:${vals[i] ? Math.max(4, vals[i] / max * 100) : 0}%"></i></div><span>${b.label}</span></button>`).join('');
  S._bars = r.buckets.map((b, i) => ({ full: b.full, v: vals[i] }));
  const flow = `<section class="card">
    <div class="ch"><h3>Spending Flow</h3>${badge}</div>
    <div class="binfo" id="barInfo">Total <b>${esc(fmt(total))}</b> · ${change === null ? 'no data for previous ' + r.noun : `${Math.abs(change)}% ${change >= 0 ? 'more' : 'less'} than previous ${r.noun}`}</div>
    <div class="bars n${n}">${bars}</div></section>`;

  const byCat = Object.entries(totalsByCat(list)).map(([id, v]) => ({ c: catById(id), v })).sort((a, b) => b.v - a.v);
  const prevByCat = totalsByCat(prevList);
  const top = byCat[0];
  let ins;
  if (!total) ins = `No spending recorded for ${esc(r.label.toLowerCase().startsWith('this') || r.label.toLowerCase().startsWith('last') ? r.label.toLowerCase() : r.label)} yet.`;
  else {
    ins = change === null ? '' : change > 0 ? `<b>Insight:</b> You spent <b class="red">${change}% more</b> than the previous ${r.noun}. ` : change < 0 ? `<b>Nice!</b> You spent <b class="green">${-change}% less</b> than the previous ${r.noun}. ` : `Same spending as the previous ${r.noun}. `;
    ins += `<b>${esc(top.c.name)}</b> is your biggest expense at ${Math.round(top.v / total * 100)}%${change > 10 && !['home', 'bank'].includes(top.c.icon) ? ' — cutting back there will help you stay on track.' : '.'}`;
  }
  const insight = `<section class="card insight"><span class="ib">${icon('bulb', 22)}</span><div>${ins}</div></section>`;

  const tiles = `<div class="tiles"><div class="card"><div class="cap">Total spent</div><div class="v num countup">${esc(fmt(total))}</div></div>
    <div class="card"><div class="cap">Daily average</div><div class="v num">${esc(fmt(Math.round(avg)))}</div></div></div>`;

  const byPay = {}; list.forEach(e => { const k = e.payment || 'Other'; byPay[k] = round2((byPay[k] || 0) + sv(e)); }); for (const k in byPay) if (byPay[k] <= 0) delete byPay[k];
  const modes = [...PAYMENT_MODES, ['Other', 'tag', '#64748B']].filter(([m]) => byPay[m]);
  const pay = total ? `<section class="card"><div class="ch"><h3>Paid via</h3></div>
    <div class="stack">${modes.map(([m, , col]) => `<i style="width:${byPay[m] / total * 100}%;background:${col}"></i>`).join('')}</div>
    ${modes.map(([m, ic, col]) => `<div class="prow"><span class="dot" style="background:${col}"></span>${esc(m)}<span class="muted" style="margin-left:6px;font-size:13px">${Math.round(byPay[m] / total * 100)}%</span><span class="p">${esc(fmt(byPay[m]))}</span></div>`).join('')}</section>` : '';

  const topCats = byCat.length ? `<div class="sec"><h2>Top Categories</h2></div>` + byCat.map(({ c, v }) => {
    const pv = prevByCat[c.id] || 0, ch = pv ? Math.round((v - pv) / pv * 100) : null;
    return `<button class="catcard" data-action="goto-cat" data-id="${c.id}"><div class="top">${tint(c)}
      <div class="g"><div class="t">${esc(c.name)}</div><div class="s">${Math.round(v / total * 100)}% of spending</div></div>
      <div class="r">${esc(fmt(v))}${ch ? `<small class="${ch > 0 ? 'red' : 'green'}">${ch > 0 ? '↗' : '↘'} ${Math.abs(ch)}%</small>` : ''}</div></div>
      <div class="pbar"><i style="width:${v / byCat[0].v * 100}%;background:${c.color}"></i></div></button>`;
  }).join('') : '';

  const inc = sum(incomeIn(r.start, r.end).map(e => e.amount));
  const tiles2 = inc ? `<div class="tiles"><div class="card"><div class="cap">Income</div><div class="v num green">${esc(fmt(inc))}</div></div>
    <div class="card"><div class="cap">${inc >= total ? 'Saved' : 'Overspent'}</div><div class="v num ${inc >= total ? 'blue' : 'red'}">${esc(fmt(Math.abs(inc - total)))}<span class="muted" style="font-size:13px;font-weight:600"> ${inc >= total ? Math.round((inc - total) / inc * 100) + '%' : ''}</span></div></div></div>` : '';
  const isMonth = S.period === 'month' && isAdvanced();
  const cal = isMonth ? calendarHTML(r) : '';
  const report = isMonth && (total || inc) ? `<button class="catcard" data-action="report" style="background:linear-gradient(140deg,#5B9BFF,#2563EB);border:0;color:#fff"><div class="top"><span class="ic" style="background:rgba(255,255,255,.18);color:#fff">${icon('receipt', 22)}</span>
      <div class="g"><div class="t">${esc(r.label)} report card</div><div class="s n" style="color:rgba(255,255,255,.85)">Your month in one shareable image</div></div>${icon('chevR', 18, 2)}</div></button>` : '';
  return `<header class="head"><h1>Statistics</h1><button class="rbtn" data-action="stats-today" aria-label="Back to current period">${icon('calendar', 20)}</button></header>
    ${seg}${pnav}${report}${flow}${insight}${tiles}${isAdvanced() ? tiles2 : ''}${cal}${pay}${topCats}`;
}

function viewBudget() {
  const m = S.month, r = cycleRange(m);
  const spend = totalsByCat(expensesIn(r.start, r.end));
  const spent = sum(Object.values(spend)), total = effectiveBudget(m);
  const overall = overallBudget(m), catSum = totalBudget(m), pool = round2(overall - catSum);
  const pct = total ? spent / total * 100 : 0, st = status(spent, total);
  const ringLen = Math.min(100, pct);
  const head = `<header class="head"><div><h1>Budget</h1>
      <div class="mnav"><button data-action="month-prev" aria-label="Previous month">${icon('chevL', 16, 2.4)}</button><span>${esc(cycleLabel(m))}</span><button data-action="month-next" aria-label="Next month">${icon('chevR', 16, 2.4)}</button></div></div>
    <button class="rbtn ${S.budgetEdit ? 'on' : ''}" data-action="budget-edit" aria-label="Edit budgets">${icon(S.budgetEdit ? 'tick' : 'sliders', 20, 2)}</button></header>`;

  const totalCard = `<section class="card btotal">
    <div class="row"><div><div class="cap">${overall ? 'Monthly budget' : 'Total of category limits'}</div><div class="amt num countup" id="bTotal">${total ? esc(fmt(total)) : '—'}</div>
      ${overall && catSum ? `<div class="muted" style="font-size:12.5px;margin-top:4px">${esc(fmt(catSum))} in category limits · ${pool >= 0 ? esc(fmt(pool)) + ' for everything else' : `<span class="red">limits exceed budget by ${esc(fmt(-pool))}</span>`}</div>` : ''}</div>
      <svg class="ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--surface-3)" stroke-width="3.2"/>
        ${total ? `<circle cx="18" cy="18" r="15.9155" fill="none" class="arc" stroke="${STATUS_COLOR[st]}" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="${ringLen} ${100 - ringLen}" transform="rotate(-90 18 18)"/>` : ''}
        <text x="18" y="20.2" text-anchor="middle" font-size="7" font-weight="700" style="fill:var(--text)">${total ? Math.round(pct) + '%' : '—'}</text></svg></div>
    <div class="split"><div><div class="cap">Spent</div><div class="v num red">${esc(fmt(spent))}</div></div>
      <div><div class="cap">${total && spent > total ? 'Over' : 'Left'}</div><div class="v num ${total && spent > total ? 'red' : 'green'}">${total ? esc(fmt(Math.abs(total - spent))) : '—'}</div></div></div></section>`;

  if (S.budgetEdit) {
    const ob = budgetFor(TOTAL_KEY, m);
    const overallCard = `<section class="card" style="border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)">
      <div class="top" style="display:flex;align-items:center;gap:14px"><span class="ic" style="background:var(--accent-soft);color:var(--accent)">${icon('wallet', 22)}</span>
        <div style="flex:1;min-width:0"><div style="font-weight:700">Overall monthly budget</div><div class="muted" style="font-size:12.5px" id="bsub-${TOTAL_KEY}">${ob.inherited ? `Carried from ${esc(monthLabel(ob.from, 'short'))}` : 'One number for the whole month'}</div></div>
        <input class="binput" id="overallInput" type="text" inputmode="decimal" placeholder="₹ —" data-cat="${TOTAL_KEY}" value="${ob.limit || ''}" aria-label="Overall monthly budget"></div>
      <div class="muted" style="font-size:12.5px;margin-top:12px;line-height:1.45" id="bAlloc">${allocLine(m)}</div></section>`;
    const rows = S.categories.map(c => { const b = budgetFor(c.id, m);
      return `<div class="catcard"><div class="top">${tint(c)}<div class="g"><div class="t">${esc(c.name)}</div>
        <div class="s n" id="bsub-${c.id}">Spent ${esc(fmt(spend[c.id] || 0))}${b.inherited ? ` · from ${esc(monthLabel(b.from, 'short'))}` : ''}</div></div>
        <input class="binput" type="text" inputmode="decimal" placeholder="Optional" data-cat="${c.id}" value="${b.limit || ''}" aria-label="Monthly limit for ${esc(c.name)}"></div></div>`; }).join('');
    return head + `<div class="sec" style="margin-top:4px"><h2>Edit budget</h2><button class="lnk cap" data-action="budget-edit">DONE</button></div>${overallCard}
      <div class="sec"><h2>Category limits <span class="muted" style="font-size:13px;font-weight:600">· optional</span></h2></div>
      <p class="note" style="margin:-6px 4px 14px">Only add limits for categories you want to watch closely. Everything without a limit is covered by your overall budget.</p>${rows}
      <p class="note">Budgets carry over to the following months automatically. A change here applies from ${esc(cycleLabel(m))} onward. Leave a field blank to remove it.</p>`;
  }

  if (!total) return head + totalCard + emptyCard('target', 'Set a monthly budget', 'Start with one number for the whole month. You can add limits for specific categories later — only if you want to.', `<button class="btn" data-action="budget-edit" data-focus="overall">${icon('plus', 18, 2.4)} Set monthly budget</button>`);

  const withB = S.categories.map(c => ({ c, s: spend[c.id] || 0, l: budgetFor(c.id, m).limit })).filter(x => x.l > 0).sort((a, b) => b.s / b.l - a.s / a.l);
  const cards = withB.map(({ c, s, l }) => { const stt = status(s, l), p = s / l * 100;
    return `<button class="catcard" data-action="goto-cat" data-id="${c.id}"><div class="top">${tint(c)}
      <div class="g"><div class="t">${esc(c.name)}</div><div class="s n">${esc(fmt(s))} of ${esc(fmt(l))}</div></div>
      <div class="r ${stt === 'over' ? 'red' : stt === 'warn' ? 'amber' : ''}">${Math.round(p)}%</div></div>
      <div class="pbar"><i style="width:${Math.min(100, p)}%;background:${STATUS_COLOR[stt]}"></i></div>
      ${stt === 'over' ? `<div class="alert">${icon('alert', 15, 2.2)} Exceeded budget by ${esc(fmt(s - l))}</div>` : `<div class="okline"><span>${esc(fmt(l - s))} remaining</span>${icon('check', 16, 2.2)}</div>`}</button>`; }).join('');
  const unb = S.categories.filter(c => !(budgetFor(c.id, m).limit > 0) && spend[c.id]).sort((a, b) => spend[b.id] - spend[a.id]);
  let rest = '';
  if (overall) {
    // Everything without its own limit shares what's left of the overall budget
    const restSpent = sum(S.categories.filter(c => !(budgetFor(c.id, m).limit > 0)).map(c => spend[c.id] || 0));
    const restCats = S.categories.filter(c => !(budgetFor(c.id, m).limit > 0)).length;
    const lim = Math.max(0, pool), stt = lim ? status(restSpent, lim) : (restSpent > 0 ? 'over' : 'ok'), p = lim ? restSpent / lim * 100 : (restSpent ? 100 : 0);
    const restCard = withB.length ? `<div class="catcard"><div class="top"><span class="ic" style="background:var(--surface-3);color:var(--muted)">${icon('layers', 22)}</span>
        <div class="g"><div class="t">Everything else</div><div class="s n">${esc(fmt(restSpent))} of ${esc(fmt(lim))} · ${restCats} categories</div></div>
        <div class="r ${stt === 'over' ? 'red' : stt === 'warn' ? 'amber' : ''}">${Math.round(p)}%</div></div>
        <div class="pbar"><i style="width:${Math.min(100, p)}%;background:${STATUS_COLOR[stt]}"></i></div>
        ${stt === 'over' ? `<div class="alert">${icon('alert', 15, 2.2)} ${lim ? 'Over by ' + esc(fmt(restSpent - lim)) : 'No budget left after category limits'}</div>` : `<div class="okline"><span>${esc(fmt(lim - restSpent))} remaining</span>${icon('check', 16, 2.2)}</div>`}</div>` : '';
    const breakdown = unb.length ? `<div class="sec"><h2>${withB.length ? 'Inside “Everything else”' : 'Where it went'}</h2></div><div class="slist">${unb.map(c => `<button class="srow" data-action="goto-cat" data-id="${c.id}">${tint(c, 42, 14)}<div class="t">${esc(c.name)}<small>${Math.round(spend[c.id] / (spent || 1) * 100)}% of this month’s spending</small></div><b class="num">${esc(fmt(spend[c.id]))}</b></button>`).join('')}</div>` : '';
    rest = restCard + breakdown;
  } else {
    rest = `<section class="card insight" style="margin-top:6px"><span class="ib">${icon('wallet', 22)}</span><div><b>Add an overall budget</b> to cover the categories without a limit, so all your spending is tracked against one number.
      <div style="margin-top:10px"><button class="setbtn" data-action="budget-edit" data-focus="overall">Set overall budget</button></div></div></section>` +
      (unb.length ? `<div class="sec"><h2>No limit set</h2></div><div class="slist">${unb.map(c => `<div class="srow">${tint(c, 42, 14)}<div class="t">${esc(c.name)}<small>Spent ${esc(fmt(spend[c.id]))}</small></div><button class="setbtn" data-action="budget-edit">Set</button></div>`).join('')}</div>` : '');
  }
  const catHead = withB.length ? `<div class="sec"><h2>Category limits</h2><button class="lnk cap" data-action="budget-edit">EDIT</button></div>` : `<div class="sec"><h2>Spending</h2><button class="lnk cap" data-action="budget-edit">ADD LIMITS</button></div>`;
  return head + totalCard + catHead + cards + rest;
}

function viewProfile() {
  const name = S.settings.name || '';
  const initials = name ? esc(name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()) : icon('user', 44, 1.6);
  const first = S.expenses.reduce((m, e) => (!m || e.date < m ? e.date : m), '');
  const pm = S.settings.defaultPayment || 'UPI';
  const row = (ic, col, title, sub, action, extra = '', cls = '') => `<button class="srow ${cls}" data-action="${action}"><span class="ic" style="background:${col}22;color:${col}">${icon(ic, 20)}</span><div class="t">${title}${sub ? `<small>${sub}</small>` : ''}</div>${extra}<span class="chev">${icon('chevR', 18, 2)}</span></button>`;
  return `<header class="head"><h1>Profile</h1></header>
    <div class="prof"><button class="avatar" data-action="edit-name" aria-label="Edit name">${initials}<span class="edit">${icon('pencil', 16, 2.2)}</span></button>
      <h2>${name ? esc(name) : 'Add your name'}</h2><div class="h">Private · stored only on this device</div></div>
    <div class="tiles"><div class="card"><div class="cap">Tracking since</div><div class="v">${first ? esc(monthLabel(first.slice(0, 7), 'short')) : '—'}</div></div>
      <div class="card"><div class="cap">Storage</div><div class="v blue" style="display:flex;align-items:center;gap:6px">${icon('lock', 17, 2.2)} On-device</div></div></div>
    <div class="sec"><span class="cap" style="font-size:12px;letter-spacing:.14em">Settings</span></div>
    <div class="slist">
      ${installMode() === 'installed' ? '' : row('download', '#0E7C66', 'Install app', 'Add to your home screen · works offline', 'install', installMode() === 'prompt' ? '<span class="setbtn">Install</span>' : '')}
      ${row('layers', '#3B82F6', 'Categories', `${S.categories.length} categories`, 'to-cats')}
      ${row(isAdvanced() ? 'grid' : 'layers', '#0E7C66', 'App mode', isAdvanced() ? 'All features on' : 'Simple: expenses, budget & stats', 'edit-mode', `<span class="v">${isAdvanced() ? 'Advanced' : 'Basic'}</span>`)}
      ${isAdvanced() ? `${row('repeat', '#8B5CF6', 'Recurring & subscriptions', S.recurring.length ? `${fmt(sum(S.recurring.filter(r => r.active && r.kind !== 'income').map(r => r.amount)))}/month fixed · ${fmt(sum(S.recurring.filter(r => r.active && r.subscription).map(r => r.amount * 12)))}/yr subscriptions` : 'Rent, EMI, Netflix, salary…', 'to-recurring')}
      ${row('handshake', '#14B8A6', 'Lent & borrowed', S.ious.some(i => !i.settled) ? `${S.ious.filter(i => !i.settled).length} open` : 'Who owes whom', 'to-ious')}
      ${row('star', '#EAB308', 'Quick-add buttons', `${favorites().length} on your dashboard`, 'to-favs')}
      ${row('calendar', '#0EA5E9', 'Budget cycle', '', 'edit-cycle', `<span class="v">${cycleDay() === 1 ? 'Calendar month' : 'From the ' + ordinal(cycleDay())}</span>`)}` : ''}
      ${row(effectiveTheme() === 'dark' ? 'moon' : 'sun', '#6366F1', 'Appearance', '', 'edit-theme', `<span class="v">${THEMES.find(x => x[0] === (S.settings.theme || 'system'))[2]}</span>`)}
      ${row('card', '#F59E0B', 'Default payment', '', 'edit-payment', `<span class="v">${esc(pm)}</span>`)}
      ${row('shield', '#22C55E', 'Privacy', 'No account, no tracking, no cloud', 'privacy')}
      ${isAdvanced() ? row('sparkles', '#EC4899', 'Run setup again', 'Name, salary day and monthly budget', 'run-setup') : ''}
    </div>
    <div class="sec"><span class="cap" style="font-size:12px;letter-spacing:.14em">Backup & data</span></div>
    <div class="slist">
      ${row('download', '#06B6D4', 'Export backup', 'Save a .json file of everything', 'export-json')}
      ${row('upload', '#A855F7', 'Restore backup', 'Replace data from a .json file', 'import-json')}
      ${row('file', '#14B8A6', 'Export CSV', 'For Excel or Google Sheets', 'export-csv')}
      ${row('trash', '#F43F5E', 'Erase all data', '', 'erase', '', 'danger')}
    </div>
    <p class="note" style="text-align:center;margin-top:18px">${S.expenses.length} expenses stored · Add to Home Screen to use offline</p>`;
}

function txListHTML() {
  let list = [...S.expenses];
  const [kind, val] = S.txFilter ? S.txFilter.split(':') : [];
  if (kind === 'pay') list = list.filter(e => e.payment === val);
  if (kind === 'cat') list = list.filter(e => e.categoryId === val);
  if (kind === 'kind') list = list.filter(e => val === 'recurring' ? e.recurringId : val === 'split' ? e.split : (e.kind || 'expense') === val);
  const A = S.txAdv, mn = parseAmount(A.min), mx = parseAmount(A.max);
  if (mn > 0) list = list.filter(e => e.amount >= mn);
  if (mx > 0) list = list.filter(e => e.amount <= mx);
  if (A.from) list = list.filter(e => e.date >= A.from);
  if (A.to) list = list.filter(e => e.date <= A.to);
  const q = S.txSearch.trim().toLowerCase();
  if (q) list = list.filter(e => [e.note, e.categoryId ? catById(e.categoryId).name : '', e.source, e.payment, String(e.amount)].join(' ').toLowerCase().includes(q));
  list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  if (!list.length) return emptyCard('search', q || S.txFilter || advCount() ? 'No matches' : 'No transactions yet', q || S.txFilter || advCount() ? 'Try a different search or filter.' : 'Tap + to add your first expense.');
  const groups = {}; list.forEach(e => (groups[e.date] ||= []).push(e));
  const spent = spendSum(list.filter(e => !isIncome(e))), inc = sum(list.filter(isIncome).map(e => e.amount));
  return `<div class="glabel" style="margin-top:18px"><span>${list.length} transaction${list.length === 1 ? '' : 's'}</span><span class="num">${spent ? '−' + esc(fmt(spent)) : ''}${spent && inc ? ' · ' : ''}${inc ? `<span class="green">+${esc(fmt(inc))}</span>` : ''}</span></div>` +
    Object.entries(groups).map(([d, items]) => { const ds_ = spendSum(items.filter(e => !isIncome(e)));
      return `<div class="glabel"><span>${esc(dayLabel(d))}</span><span class="num">${ds_ ? esc(fmt(ds_)) : ''}</span></div>${items.map(txRow).join('')}`; }).join('');
}
const advCount = () => ['min', 'max', 'from', 'to'].filter(k => S.txAdv[k]).length;
function advSummary() {
  const A = S.txAdv, f = d => parseDate(d).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' }), bits = [];
  if (A.min || A.max) bits.push(A.min && A.max ? `${fmt(parseAmount(A.min))} – ${fmt(parseAmount(A.max))}` : A.min ? `≥ ${fmt(parseAmount(A.min))}` : `≤ ${fmt(parseAmount(A.max))}`);
  if (A.from || A.to) bits.push(A.from && A.to ? `${f(A.from)} – ${f(A.to)}` : A.from ? `from ${f(A.from)}` : `until ${f(A.to)}`);
  return bits;
}
function datePreset(k) {
  const t = new Date(), today = ds(t), ago = n => ds(new Date(Date.now() - n * 864e5));
  if (k === '7') return [ago(6), today];
  if (k === '30') return [ago(29), today];
  if (k === 'cycle') { const r = cycleRange(curCycle()); return [r.start, r.end]; }
  if (k === 'last') { const r = cycleRange(shiftMonth(curCycle(), -1)); return [r.start, r.end]; }
  if (k === 'year') return [`${t.getFullYear()}-01-01`, `${t.getFullYear()}-12-31`];
  return ['', ''];
}
function viewTransactions() {
  const chip = (key, label) => `<button class="chip ${S.txFilter === key ? 'on' : ''}" data-action="tx-filter" data-k="${esc(key)}">${esc(label)}</button>`;
  const A = S.txAdv, n = advCount(), adv = isAdvanced();
  const panel = S.txPanel && adv ? `<section class="card fpanel">
      <div class="flabel">Amount</div>
      <div class="two"><label class="irow"><span style="font-weight:700;color:var(--accent)">₹</span><input id="fMin" class="advin" inputmode="decimal" placeholder="Min" value="${esc(A.min)}"></label>
        <label class="irow"><span style="font-weight:700;color:var(--accent)">₹</span><input id="fMax" class="advin" inputmode="decimal" placeholder="Max" value="${esc(A.max)}"></label></div>
      <div class="flabel">Date</div>
      <div class="chips">${[['cycle', cycleDay() === 1 ? 'This month' : 'This cycle'], ['last', cycleDay() === 1 ? 'Last month' : 'Last cycle'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['year', 'This year']].map(([k, l]) => { const [a, b] = datePreset(k); return `<button class="chip ${A.from === a && A.to === b ? 'on' : ''}" data-action="tx-date" data-k="${k}">${l}</button>`; }).join('')}</div>
      <div class="two"><label class="irow"><span class="muted" style="font-size:12px">From</span><input type="date" id="fFrom" class="advin" value="${esc(A.from)}"></label>
        <label class="irow"><span class="muted" style="font-size:12px">To</span><input type="date" id="fTo" class="advin" value="${esc(A.to)}"></label></div>
      <div class="sactions" style="margin-top:4px"><button class="btn ghost" data-action="tx-adv-clear">Clear</button><button class="btn" data-action="tx-panel">Done</button></div></section>` : '';
  const bar = adv && !S.txPanel && n ? `<div class="fbar">${icon('sliders', 16, 2)} ${advSummary().map(b => `<span class="chip on">${esc(b)}</span>`).join('')}<button class="lnk" data-action="tx-adv-clear">Clear</button></div>` : '';
  return `<header class="head center"><button class="rbtn" data-action="back" aria-label="Back">${icon('back', 20)}</button><h1>All Transactions</h1>
      ${adv ? `<button class="rbtn ${S.txPanel || n ? 'on' : ''}" data-action="tx-panel" aria-label="Filter by amount and date">${icon('sliders', 20)}${n ? `<span class="cnt">${n}</span>` : ''}</button>` : '<span></span>'}</header>
    <label class="search">${icon('search', 20)}<input id="txSearch" type="search" placeholder="Search transactions…" value="${esc(S.txSearch)}" autocomplete="off"></label>
    ${panel}
    <div class="chips">${chip('', 'All')}${adv ? chip('kind:expense', 'Expenses') + chip('kind:income', 'Income') + chip('kind:credit', 'Refunds') + chip('kind:recurring', 'Recurring') + chip('kind:split', 'Split') : ''}${PAYMENT_MODES.map(([m]) => chip('pay:' + m, m)).join('')}${S.categories.map(c => chip('cat:' + c.id, c.name)).join('')}</div>
    ${bar}
    <div class="divider"></div>
    <div id="txList">${txListHTML()}</div>`;
}

function viewCategories() {
  const counts = {}; S.expenses.forEach(e => counts[e.categoryId] = (counts[e.categoryId] || 0) + 1);
  return `<header class="head center"><button class="rbtn" data-action="back" aria-label="Back">${icon('back', 20)}</button><h1>Categories</h1>
      <button class="rbtn" data-action="add-cat" aria-label="Add category">${icon('plus', 20, 2.2)}</button></header>
    <div class="slist">${S.categories.map(c => `<button class="srow" data-action="open-cat" data-id="${c.id}">${tint(c, 42, 14)}<div class="t">${esc(c.name)}<small>${counts[c.id] || 0} expense${counts[c.id] === 1 ? '' : 's'}</small></div><span class="chev">${icon('chevR', 18, 2)}</span></button>`).join('')}</div>
    <p class="note">Deleting a category moves its expenses to “Other”.</p>`;
}

