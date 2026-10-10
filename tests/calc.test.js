/* Expense Tracker — calculation test suite. Clock pinned to Sat 10 Oct 2026, 12:00.
   Run:  cd tests && npm install && npm test        (needs Node 18+) */
const {JSDOM}=require('jsdom'); const FDB=require('fake-indexeddb');
const D=require('path').join(__dirname,'..')+'/';
const fs=require('fs');
const html=fs.readFileSync(D+'index.html','utf8');
const appJs=['core','views','features','forms','main'].map(n=>fs.readFileSync(D+'js/'+n+'.js','utf8').replace("'use strict';",'')).join('\n').replace(/^(const|let) /gm,'var ');   // share top-level bindings across evals, like <script> tags do
let pass=0, fail=0; const fails=[];
function eq(name, got, exp){ const ok = typeof exp==='number' && typeof got==='number' ? Math.abs(got-exp)<1e-9 : JSON.stringify(got)===JSON.stringify(exp);
  if(ok) pass++; else { fail++; fails.push(`✗ ${name}\n    expected: ${JSON.stringify(exp)}\n    got:      ${JSON.stringify(got)}`); } }
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function app(nowISO='2026-10-10T12:00:00'){
  const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://x.pages.dev/'}); const w=dom.window;
  w.indexedDB=new FDB.IDBFactory(); w.matchMedia=()=>({matches:false,addEventListener(){}});
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true}; w.HTMLDialogElement.prototype.close=function(){this.open=false}; w.scrollTo=()=>{}; w.confirm=()=>true;
  const T=new Date(nowISO).getTime();
  w.eval(`(()=>{const _D=Date; class FD extends _D{constructor(...a){ if(a.length) super(...a); else super(${T}); } static now(){ return ${T}; }} window.Date=FD;})()`);
  const errs=[]; w.addEventListener('error',e=>errs.push(e.message)); w.addEventListener('unhandledrejection',e=>errs.push(String(e.reason&&e.reason.stack||e.reason)));
  let blob=null; w.URL.createObjectURL=b=>{blob=b;return 'blob:x'}; w.URL.revokeObjectURL=()=>{};
  w.eval(appJs); await sleep(350);
  const E=s=>w.eval(s);
  E("S.settings.mode='advanced'; S.settings.onboarded=true; document.getElementById('onbDlg').close();");
  return {w,E,errs,d:w.document,getBlob:()=>blob};
}
const X=(E,arr)=>E(`(async()=>{ const list=${JSON.stringify(arr)}.map((e,i)=>({id:'t'+Math.random().toString(36).slice(2),createdAt:Date.now()+i,payment:'UPI',...e})); for(const e of list){ if(e.cat!==undefined){ e.categoryId=S.categories[e.cat].id; delete e.cat; } } await dbPut('expenses',...list); S.expenses.push(...list); return list.length; })()`);
const txt=(d,s)=>d.querySelector(s)?.textContent.replace(/\s+/g,' ').trim();

(async()=>{
 const allErrs=[];
 const {E,errs,d,w}=await app(); allErrs.push(errs);
 const t=s=>txt(d,s);
 // ---------- A. Formatting & parsing
 eq('fmt lakh', E("fmt(125000)"), '₹1,25,000');
 eq('fmt crore', E("fmt(12345678)"), '₹1,23,45,678');
 eq('fmt decimals', E("fmt(1234.5)"), '₹1,234.50');
 eq('fmt zero', E("fmt(0)"), '₹0');
 eq('fmt near-integer', E("fmt(99.999)"), '₹100');
 eq('fmtShort 850', E("fmtShort(850)"), '₹850');
 eq('fmtShort 12500', E("fmtShort(12500)"), '₹12.5K');
 eq('fmtShort 215000', E("fmtShort(215000)"), '₹2.15L');
 eq('fmtShort 1 crore', E("fmtShort(10000000)"), '₹1Cr');
 eq('fmtShort 9,999.4 stays rupees', E("fmtShort(9999.4)"), '₹9,999');
 eq('fmtShort 99,994 stays K', E("fmtShort(99994)"), '₹99.99K');
 eq('fmtShort negative', E("fmtShort(-250000)"), '-₹2.5L');
 eq('fmtShort 99,999 should read ₹1L not ₹100K', E("fmtShort(99999)"), '₹1L');
 eq('fmtShort 9,99,99,999 should read ₹10Cr', E("fmtShort(99999999)"), '₹10Cr');
 eq('fmtShort 9,999.6 should read ₹10K', E("fmtShort(9999.6)"), '₹10K');
 eq('parse 1,23,456.78', E("parseAmount('1,23,456.78')"), 123456.78);
 eq('parse 1,23,456', E("parseAmount('1,23,456')"), 123456);
 eq('parse ₹ 2,000', E("parseAmount('₹ 2,000')"), 2000);
 eq('parse 12,5 (comma decimal)', E("parseAmount('12,5')"), 12.5);
 eq('parse garbage', E("String(parseAmount('abc'))"), 'NaN');
 eq('round2 float', E("round2(0.1+0.2)"), 0.3);
 eq('sum floats', E("sum([0.1,0.2,0.3])"), 0.6);
 eq('sum many paise', E("sum(Array(100).fill(0.01))"), 1);

 // ---------- B. Spend math (expense / refund / income)
 await X(E,[{amount:1000,cat:1,date:'2026-10-02'},{amount:500,cat:1,date:'2026-10-05'},{amount:200,cat:1,date:'2026-10-06',kind:'credit'},
            {amount:50000,kind:'income',source:'Salary',categoryId:null,date:'2026-10-01'},{amount:300,cat:5,date:'2026-10-09'}]);
 eq('spendSum nets refunds, excludes income', E("spendSum(expensesIn('2026-10-01','2026-10-31'))"), 1600);
 eq('totalsByCat food net of refund', E("totalsByCat(expensesIn('2026-10-01','2026-10-31'))[S.categories[1].id]"), 1300);
 eq('totalsByCat transport', E("totalsByCat(expensesIn('2026-10-01','2026-10-31'))[S.categories[5].id]"), 300);
 eq('income total', E("sum(incomeIn('2026-10-01','2026-10-31').map(e=>e.amount))"), 50000);
 eq('income not in category totals', E("Object.keys(totalsByCat(expensesIn('2026-10-01','2026-10-31'))).length"), 2);

 // ---------- C. Budget cycle
 eq('cd1 key', E("cycleKey('2026-10-10')"), '2026-10');
 eq('cd1 range', E("cycleRange('2026-10')"), {start:'2026-10-01',end:'2026-10-31'});
 eq('cd1 Feb leap', E("cycleRange('2028-02').end"), '2028-02-29');
 eq('cd1 Feb normal', E("cycleRange('2026-02').end"), '2026-02-28');
 E("S.settings.cycleDay=25");
 eq('cd25 before payday', E("cycleKey('2026-10-10')"), '2026-09');
 eq('cd25 range', E("cycleRange('2026-09')"), {start:'2026-09-25',end:'2026-10-24'});
 eq('cd25 on payday', E("cycleKey('2026-10-25')"), '2026-10');
 eq('cd25 year boundary', E("[cycleKey('2026-01-05'), cycleRange('2025-12')]"), ['2025-12',{start:'2025-12-25',end:'2026-01-24'}]);
 E("S.settings.cycleDay=28");
 eq('cd28 Jan→Feb', E("cycleRange('2026-01')"), {start:'2026-01-28',end:'2026-02-27'});
 eq('cd28 Feb→Mar', E("cycleRange('2026-02')"), {start:'2026-02-28',end:'2026-03-27'});
 const gaps=E(`(()=>{ const bad=[]; for(const cd of [1,5,15,25,28]){ S.settings.cycleDay=cd; let k='2025-01';
   for(let i=0;i<36;i++){ const r=cycleRange(k), n=cycleRange(shiftMonth(k,1)); const nx=new Date(parseDate(r.end)); nx.setDate(nx.getDate()+1); if(ds(nx)!==n.start) bad.push(cd+':'+k); k=shiftMonth(k,1); }
   let dt=new Date(2025,0,1); for(let i=0;i<1096;i++){ const s=ds(dt), r=cycleRange(cycleKey(s)); if(s<r.start||s>r.end) bad.push(cd+'@'+s); dt.setDate(dt.getDate()+1);} } S.settings.cycleDay=1; return bad; })()`);
 eq('cycles contiguous & every day covered (5 cycle days × 3 yrs)', gaps, []);

 // ---------- D. Period ranges (today Sat 10 Oct 2026)
 eq('week Mon–Sun', E("(r=>({s:r.start,e:r.end,n:r.buckets.length,cur:r.buckets.findIndex(b=>b.cur)}))(rangeOf('week',0))"), {s:'2026-10-05',e:'2026-10-11',n:7,cur:5});
 eq('last week', E("(r=>[r.start,r.end])(rangeOf('week',-1))"), ['2026-09-28','2026-10-04']);
 eq('month', E("(r=>[r.start,r.end,r.buckets.length])(rangeOf('month',0))"), ['2026-10-01','2026-10-31',31]);
 eq('prev month', E("(r=>[r.start,r.end,r.buckets.length])(rangeOf('month',-1))"), ['2026-09-01','2026-09-30',30]);
 eq('year', E("(r=>[r.start,r.end,r.buckets.length])(rangeOf('year',0))"), ['2026-01-01','2026-12-31',12]);
 eq('daysElapsed month', E("daysElapsed(rangeOf('month',0))"), 10);
 eq('daysElapsed week', E("daysElapsed(rangeOf('week',0))"), 6);
 eq('daysElapsed past month', E("daysElapsed(rangeOf('month',-1))"), 30);
 eq('daysElapsed future', E("daysElapsed({start:'2026-11-01',end:'2026-11-30'})"), 0);
 E("S.settings.cycleDay=25");
 eq('stats month follows cycle', E("(r=>[r.start,r.end,r.buckets.length])(rangeOf('month',0))"), ['2026-09-25','2026-10-24',30]);
 E("S.settings.cycleDay=1");

 // ---------- E. Budgets: carry-over, overall vs categories
 E(`(()=>{ const put=(m,c,l)=>{const b={key:m+'|'+c,month:m,categoryId:c,limit:l}; S.budgets[b.key]=b;};
   put('2026-08',TOTAL_KEY,30000); put('2026-09',S.categories[1].id,5000); put('2026-10',S.categories[5].id,2000); })()`);
 eq('overall carries from Aug', E("budgetFor(TOTAL_KEY,'2026-10')"), {limit:30000,inherited:true,from:'2026-08'});
 eq('category carries', E("budgetFor(S.categories[1].id,'2026-12').limit"), 5000);
 eq('no budget before first set', E("budgetFor(TOTAL_KEY,'2026-07')"), {limit:0,inherited:false});
 eq('sum of category limits', E("totalBudget('2026-10')"), 7000);
 eq('effective = overall when set', E("effectiveBudget('2026-10')"), 30000);
 eq('alloc line', E("allocLine('2026-10').replace(/<[^>]+>/g,'')"), '₹7,000 set aside in category limits · ₹23,000 left for everything else.');
 E("S.budgets['2026-11|'+TOTAL_KEY]={key:'2026-11|'+TOTAL_KEY,month:'2026-11',categoryId:TOTAL_KEY,limit:0}");
 eq('explicit 0 removes overall', E("effectiveBudget('2026-11')"), 7000);
 eq('removal carries forward', E("budgetFor(TOTAL_KEY,'2027-02')"), {limit:0,inherited:false,from:'2026-11'});
 eq('status 74%', E("budgetStatus(74,100)"), 'ok'); eq('status 75%', E("budgetStatus(75,100)"), 'warn'); eq('status 100%', E("budgetStatus(100,100)"), 'warn');
 eq('status over', E("budgetStatus(100.01,100)"), 'over'); eq('status no limit', E("budgetStatus(5,0)"), 'none');
 E("S.budgets['2026-10|'+TOTAL_KEY]={key:'2026-10|'+TOTAL_KEY,month:'2026-10',categoryId:TOTAL_KEY,limit:5000}");
 eq('alloc warns when limits exceed overall', E("allocLine('2026-10').replace(/<[^>]+>/g,'')"), 'Category limits add up to ₹7,000, which is ₹2,000 more than your overall budget.');
 E("S.budgets['2026-10|'+TOTAL_KEY].limit=30000");

 // ---------- F. Dashboard numbers (spent 1600, budget 30000, 22 days left incl. today)
 E("go('home')");
 eq('hero spent', t('.hero .amt'), '₹1,600');
 eq('hero pace', t('.hero .pace'), '22 days left · ~₹1,290/day');
 eq('hero left', t('.hero .cols > div:last-child .v'), '₹28,400');
 eq('forecast projected (1600 + 160/day × 21)', t('.fc .row3 > div:last-child .v'), '₹4,960');
 eq('daily average', t('.fc .row3 > div:first-child .v'), '₹160');
 eq('cash flow saved = income − spent', t('.flow > div:last-child .v'), '₹48.4K');
 eq('saved %', t('#main .ch .badge'), '97% saved');

 // ---------- G. Forecast with fixed bills
 await E(`(async()=>{ const c=S.categories; const rent={id:'rent',name:'Rent',amount:15000,categoryId:c[3].id,payment:'Net Banking',day:1,start:'2026-10',active:true,createdAt:1};
   const bill={id:'bill',name:'Gym',amount:1000,categoryId:c[12].id,payment:'UPI',day:20,start:'2026-09',lastPosted:'2026-09',active:true,subscription:true,createdAt:2};
   S.recurring.push(rent,bill); await dbPut('recurring',rent,bill); await postRecurring(); })()`);
 eq('rent posted on the 1st', E("S.expenses.filter(e=>e.recurringId==='rent').map(e=>e.date)"), ['2026-10-01']);
 const f=E("forecastInfo('2026-10')");
 eq('forecast with bills (16600 + 160×21 + 1000)', {spent:f.spent,proj:f.projected,up:f.upcoming}, {spent:16600,proj:20960,up:1000});

 // ---------- H. Recurring engine edge cases
 const rec=await E(`(async()=>{ const c=S.categories[0].id; const r31={id:'r31',name:'Day31',amount:100,categoryId:c,day:31,start:'2026-01',lastPosted:'2026-01',active:true,createdAt:3};
   const today={id:'rt',name:'Today',amount:50,categoryId:c,day:10,start:'2026-10',active:true,createdAt:4};
   const tom={id:'rm',name:'Tomorrow',amount:60,categoryId:c,day:11,start:'2026-10',active:true,createdAt:5};
   const off={id:'ro',name:'Paused',amount:70,categoryId:c,day:1,start:'2026-01',active:false,createdAt:6};
   const fut={id:'rf',name:'Future',amount:80,categoryId:c,day:1,start:'2026-12',active:true,createdAt:7};
   const inc={id:'ri',name:'Salary',amount:60000,kind:'income',source:'Salary',categoryId:null,day:1,start:'2026-10',active:true,createdAt:8};
   S.recurring.push(r31,today,tom,off,fut,inc); await postRecurring(); const second=await postRecurring();
   const by=id=>S.expenses.filter(e=>e.recurringId===id).map(e=>e.date).sort();
   return {d31:by('r31'),lp31:r31.lastPosted,today:by('rt'),tom:by('rm'),nextTom:nextDue(tom),off:by('ro'),fut:by('rf'),inc:S.expenses.filter(e=>e.recurringId==='ri').map(e=>[e.kind,e.date,e.categoryId===undefined||e.categoryId===null]),second:second.length}; })()`);
 eq('day-31 rule clamps to month end & catches up Feb–Sep', rec.d31, ['2026-02-28','2026-03-31','2026-04-30','2026-05-31','2026-06-30','2026-07-31','2026-08-31','2026-09-30']);
 eq('day-31 lastPosted', rec.lp31, '2026-09');
 eq('due today posts', rec.today, ['2026-10-10']);
 eq('due tomorrow waits', [rec.tom, rec.nextTom], [[], '2026-10-11']);
 eq('paused rule skipped', rec.off, []);
 eq('future-start rule skipped', rec.fut, []);
 eq('income rule posts as income', rec.inc, [['income','2026-10-01',true]]);
 eq('second run posts nothing (no duplicates)', rec.second, 0);

 // ---------- I. Savings goal maths
 const g=E(`(()=>{ const mk=(o)=>({id:'g',name:'G',icon:'piggy',color:'#22C55E',target:12000,start:'2026-04-10',deadline:'2027-04-10',contributions:[{id:'c1',amount:3000,date:'2026-05-01'}],...o});
   const pick=x=>({state:x.state,pct:Math.round(x.pct*100)/100,exp:x.exp==null?null:Math.round(x.exp*100)/100,need:x.need,left:x.left,saved:x.saved});
   return { behind:pick(goalInfo(mk({}))), done:goalInfo(mk({contributions:[{amount:12000}]})).state, late:goalInfo(mk({deadline:'2026-10-01'})).state,
     none:goalInfo(mk({deadline:''})).state, ok:goalInfo(mk({contributions:[{amount:6200}]})).state, withdraw:goalInfo(mk({contributions:[{amount:3000},{amount:-1000}]})).saved }; })()`);
 eq('goal behind (183/365 days elapsed vs 25% saved; ₹9,000 over 5.98 months)', g.behind, {state:'behind',pct:25,exp:50.14,need:1506,left:9000,saved:3000});
 eq('goal done', g.done, 'done'); eq('goal late', g.late, 'late'); eq('goal no date', g.none, 'none');
 eq('goal on track (51.7% vs 50.1%)', g.ok, 'ok'); eq('goal withdrawal nets', g.withdraw, 2000);

 // ---------- J. Split a bill through the real form: ₹1,000 ÷ 3
 E("openExpense()"); d.getElementById('txAmount').value='1000'; d.querySelectorAll('input[name=txCat]')[1].checked=true; d.getElementById('txNote').value='Pizza';
 d.getElementById('txSplit').checked=true; E("S.splitN=3; syncOptions()");
 eq('split preview share', t('#splitMine'), '₹333.33');
 d.getElementById('txForm').dispatchEvent(new w.Event('submit',{cancelable:true})); await sleep(150);
 const pz=E("S.expenses.find(e=>e.note==='Pizza')"); const owed=E("S.ious.filter(i=>i.note==='Split: Pizza').map(i=>i.amount)");
 eq('split stored share', [pz.amount, pz.split], [333.33,{total:1000,n:3}]);
 eq('others owe the rest (no paisa lost)', [owed, Math.round((pz.amount+owed.reduce((a,b)=>a+b,0))*100)/100], [[666.67],1000]);
 E("openExpense(S.expenses.find(e=>e.note==='Pizza').id)"); eq('editing shows full bill', d.getElementById('txAmount').value, '1000');
 d.getElementById('txAmount').value='1200'; d.getElementById('txForm').dispatchEvent(new w.Event('submit',{cancelable:true})); await sleep(120);
 eq('editing split bill recomputes share', E("S.expenses.find(e=>e.note==='Pizza').amount"), 400);

 // ---------- K. Stats
 { const {E:E2,d:d2,errs:er}=await app(); allErrs.push(er);
   await X(E2,[{amount:700,cat:1,date:'2026-10-05'},{amount:300,cat:2,date:'2026-10-07',payment:'Card'},{amount:100,cat:1,date:'2026-10-08',kind:'credit'},{amount:500,cat:1,date:'2026-09-30'}]);
   E2("S.period='week'; S.statsOffset=0; go('stats')");
   eq('stats week total & change (900 vs 500)', txt(d2,'#barInfo'), 'Total ₹900 · 80% more than previous week');
   eq('stats tiles (900 / 6 days)', [...d2.querySelectorAll('.tiles .card .v')].slice(0,2).map(x=>x.textContent), ['₹900','₹150']);
   eq('stats payment split nets refund', [...d2.querySelectorAll('.prow')].map(x=>x.textContent.replace(/\s+/g,'')), ['UPI67%₹600','Card33%₹300']);
   eq('stats daily bars', E2("S._bars.map(b=>b.v)"), [700,0,300,0,0,0,0]); }

 // ---------- L. Budget screen pool
 { const {E:E3,d:d3,errs:er}=await app(); allErrs.push(er);
   await X(E3,[{amount:1300,cat:1,date:'2026-10-02'},{amount:300,cat:5,date:'2026-10-03'},{amount:200,cat:10,date:'2026-10-04'}]);
   E3("(()=>{const put=(c,l)=>{const m=curCycle(),b={key:m+'|'+c,month:m,categoryId:c,limit:l}; S.budgets[b.key]=b;}; put(TOTAL_KEY,10000); put(S.categories[1].id,3000);})()");
   E3("go('budget')"); const bu=[...d3.querySelectorAll('#main .catcard')].map(c=>c.textContent.replace(/\s+/g,' ').trim());
   eq('category limit card', bu[0], 'Food & Chai₹1,300 of ₹3,000 43% ₹1,700 remaining');
   eq('everything-else pool = 10,000 − 3,000; spent 300+200', bu[1], 'Everything else₹500 of ₹7,000 · 16 categories 7% ₹6,500 remaining');
   eq('budget total card', txt(d3,'.btotal .split').replace(/\s+/g,''), 'Spent₹1,800Left₹8,200'); }

 // ---------- M. Report card & calendar
 { const {E:E4,d:d4,errs:er}=await app(); allErrs.push(er);
   await X(E4,[{amount:400,cat:1,date:'2026-10-02'},{amount:900,cat:0,date:'2026-10-02'},{amount:250,cat:5,date:'2026-10-07'},{amount:1000,cat:0,date:'2026-09-15'}]);
   E4("S.period='month'; S.statsOffset=0; go('stats')");
   eq('report data (1550, top Groceries 900, big day 2 Oct, +55%, 8 no-spend days)', E4("(x=>({total:x.total,top:x.byCat[0].c.name,big:x.big,change:x.change,noSpend:x.noSpend}))(reportData())"), {total:1550,top:'Groceries & Kirana',big:['2026-10-02',1300],change:55,noSpend:8});
   eq('calendar day labels', [...d4.querySelectorAll('.cal .dc small')].map(x=>x.textContent), ['1.3k','250']);
   eq('calendar no-spend count', d4.querySelector('.cal').closest('section').querySelector('.ch span').textContent, '8 no-spend days'); }

 // ---------- N. Backup round-trip, CSV, category delete
 { const A=await app(); const E5=A.E; allErrs.push(A.errs);
   await X(E5,[{amount:450,cat:2,date:'2026-10-03',note:'Pizza, extra cheese'},{amount:60000,kind:'income',source:'Salary',categoryId:null,date:'2026-10-01'},{amount:120,cat:2,date:'2026-10-04',kind:'credit',note:'Refund "late"'}]);
   await E5(`(async()=>{ S.goals.push({id:'g1',name:'Goa',icon:'plane',color:'#06B6D4',target:40000,start:'2026-09-01',deadline:'2027-03-01',contributions:[{id:'c',amount:5000,date:'2026-09-10'}],createdAt:1}); await dbPut('goals',S.goals[0]);
     S.ious.push({id:'i1',person:'Rahul',amount:300,dir:'lent',date:'2026-10-02',createdAt:1}); await dbPut('ious',S.ious[0]);
     const r={id:'r1',name:'Rent',amount:15000,categoryId:S.categories[3].id,day:1,start:'2026-11',active:true,createdAt:1}; S.recurring.push(r); await dbPut('recurring',r);
     const b={key:'2026-10|'+TOTAL_KEY,month:'2026-10',categoryId:TOTAL_KEY,limit:25000}; S.budgets[b.key]=b; await dbPut('budgets',b); })()`);
   const snapExpr="JSON.stringify({e:[...S.expenses].sort((a,b)=>a.id<b.id?-1:1),g:S.goals,i:S.ious,r:S.recurring,b:Object.keys(S.budgets).sort().map(k=>S.budgets[k]),c:S.categories.map(c=>c.id)})";
   const snap=E5(snapExpr);
   E5("exportJSON()"); const json=await A.getBlob().text();
   E5("exportCSV()"); const csv=await A.getBlob().text();
   await E5(`(async()=>{ await dbClearAll(); await load(); })()`); eq('erase really wiped', E5("S.expenses.length+S.goals.length+S.ious.length+S.recurring.length"), 0);
   A.w.__file={text:async()=>json}; await E5("importJSON(window.__file)");
   eq('backup → erase → restore gives identical data', E5(snapExpr)===snap, true);
   const lines=csv.replace(/^﻿/,'').split('\n');
   eq('CSV header', lines[0], 'Date (DD/MM/YYYY),Type,Category / Source,Amount (INR),Paid via,Note');
   eq('CSV income row', lines[1], '01/10/2026,Income,Salary,60000,UPI,');
   eq('CSV quotes commas', lines[2], '03/10/2026,Expense,Food Delivery,450,UPI,"Pizza, extra cheese"');
   eq('CSV escapes quotes & marks refunds', lines[3], '04/10/2026,Refund,Food Delivery,120,UPI,"Refund ""late"""');
   E5(`(()=>{const c=S.categories[2]; const b={key:'2026-10|'+c.id,month:'2026-10',categoryId:c.id,limit:900}; S.budgets[b.key]=b; S.editingCat=c;})()`);
   await E5("deleteCat()");
   eq('deleted category → expenses move to Other', E5("S.expenses.filter(e=>e.note==='Pizza, extra cheese'||e.note==='Refund \"late\"').map(e=>catById(e.categoryId).name)"), ['Other','Other']);
   eq('deleted category budgets removed', E5("Object.values(S.budgets).filter(b=>b.categoryId!==TOTAL_KEY&&!S.categories.some(c=>c.id===b.categoryId)).length"), 0); }

 // ---------- O. Lent & borrowed, quick-add
 { const {E:E6,d:d6,errs:er}=await app(); allErrs.push(er);
   E6(`S.ious.push({id:'a',person:'A',amount:500,dir:'lent',date:'2026-10-01',createdAt:1},{id:'b',person:'B',amount:200,dir:'lent',date:'2026-10-01',settled:true,createdAt:2},{id:'c',person:'C',amount:1500,dir:'borrowed',date:'2026-10-01',due:'2026-10-05',createdAt:3})`);
   E6("go('home')"); const card=[...d6.querySelectorAll('#main .catcard')].find(c=>c.textContent.includes('You’ll get'))?.textContent.replace(/\s+/g,' ').trim();
   eq('IOU card: settled excluded, overdue flagged', card, 'You’ll get₹500You owe₹1,500 You owe C ₹1,500 — due 5 days ago');
   const n0=E6("S.expenses.length"); await E6("quickAdd(favorites()[0].id)"); const n1=E6("S.expenses.length"); const added=E6("S.expenses.at(-1)");
   d6.getElementById('toastAct').click(); await sleep(100); const n2=E6("S.expenses.length");
   eq('quick-add adds once, undo removes', [n1-n0, n2-n0], [1,0]);
   eq('quick-add uses today & preset', [added.amount, added.date, added.note], [20,'2026-10-10','Chai']); }

 // ---------- P. Cycle-day dashboard (salary day 25 → cycle 25 Sep – 24 Oct, 15 days left incl. today)
 { const {E:E7,d:d7,errs:er}=await app(); allErrs.push(er);
   E7("S.settings.cycleDay=25"); await X(E7,[{amount:2000,cat:0,date:'2026-09-24'},{amount:3000,cat:0,date:'2026-09-25'},{amount:1500,cat:1,date:'2026-10-09'}]);
   E7("(()=>{const m=curCycle(),b={key:m+'|'+TOTAL_KEY,month:m,categoryId:TOTAL_KEY,limit:20000}; S.budgets[b.key]=b;})()"); E7("go('home')");
   eq('cycle hero excludes day before payday', txt(d7,'.hero .amt'), '₹4,500');
   eq('cycle pace (15500 / 15 days)', txt(d7,'.hero .pace'), '15 days left · ~₹1,033/day');
   eq('cycle label', txt(d7,'.hero .lbl'), 'Spent this cycle · 25 Sept – 24 Oct'); }

 // ---------- Q. SMS amounts
 eq('SMS amounts & kind', E(`[parseSms('Rs.1,23,456.78 debited from A/c XX12 on 05-Oct-26 to VPA shop@okaxis').amount, parseSms('INR 99 spent on card at UBER on 2026-10-09').amount, parseSms('Rs 5,000 credited to your A/c by NEFT from ACME').kind]`), [123456.78, 99, 'income']);

 console.log(`\n${pass} passed, ${fail} failed`); if(fails.length) console.log(fails.join('\n'));
 const flat=allErrs.flat(); if(flat.length) console.log('runtime errors:',flat);
 process.exit(0);
})().catch(e=>{console.error('SUITE ERROR',e);process.exit(1)});
