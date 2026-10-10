/* Expense Tracker — Storage, icons, India defaults, state, helpers, budget cycle, theme, toast. Loaded in order: core → views → features → forms → main. */
'use strict';

/* ================= On-device storage (IndexedDB) =================
   Nothing leaves this device. No network calls, no analytics. */
const DB_NAME = 'expense-tracker', DB_VERSION = 3, STORES = ['categories', 'expenses', 'budgets', 'settings', 'goals', 'recurring', 'ious'];
let db;
function openDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const d = r.result; // v1: core stores · v2: savings goals · v3: recurring rules, lent/borrowed
      for (const [s, keyPath] of [['categories', 'id'], ['expenses', 'id'], ['budgets', 'key'], ['settings', 'key'], ['goals', 'id'], ['recurring', 'id'], ['ious', 'id']])
        if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
const done = t => new Promise((res, rej) => { t.oncomplete = res; t.onerror = t.onabort = () => rej(t.error); });
const dbAll = s => new Promise((res, rej) => { const r = db.transaction(s).objectStore(s).getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
function dbPut(s, ...items) { const t = db.transaction(s, 'readwrite'); items.forEach(i => t.objectStore(s).put(i)); return done(t); }
function dbDel(s, key) { const t = db.transaction(s, 'readwrite'); t.objectStore(s).delete(key); return done(t); }
function dbClearAll() { const t = db.transaction(STORES, 'readwrite'); STORES.forEach(s => t.objectStore(s).clear()); return done(t); }

/* ================= Icons (line style, 24px grid) ================= */
const ICONS = {
  // categories
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.2A2 2 0 0 0 9.6 17h7.7a2 2 0 0 0 2-1.5L21 8H6"/>',
  utensils: '<path d="M4 3v7a3 3 0 0 0 3 3v8M10 3v7a3 3 0 0 1-3 3M7 3v7"/><path d="M18 21V3c-2.3 1.2-3.6 3.9-3.6 7v4H18"/>',
  scooter: '<circle cx="5.5" cy="17.5" r="2.5"/><circle cx="18.5" cy="17.5" r="2.5"/><path d="M8 17.5h7.6L13.5 7H11M13.5 7H16M15 12.5H9.5L8 10H4"/>',
  coffee: '<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 2.5v2.5M12 2.5v2.5"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v12h14V9"/><path d="M10 21v-6h4v6"/>',
  fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M3 21h13M4 11h11"/><path d="M15 8h2a2 2 0 0 1 2 2v7a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
  car: '<path d="M5 17H3v-5l2.2-5h13.6L21 12v5h-2"/><path d="M3 12h18"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M9.5 17h5"/>',
  train: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M9 21l1.5-4M15 21l-1.5-4M8.5 14h.01M15.5 14h.01"/>',
  plane: '<path d="M10.5 13.5 3 11l1.5-1.5 7.5 1 4-4.5a2.1 2.1 0 0 1 3 3l-4.5 4 1 7.5L14 22l-2.5-7.5"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><path d="M12 19.5h.01"/>',
  sparkles: '<path d="M11 3l1.8 4.7 4.7 1.8-4.7 1.8L11 16l-1.8-4.7-4.7-1.8 4.7-1.8z"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  bank: '<path d="M3 10h18L12 4z"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18"/>',
  bag: '<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  shirt: '<path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3a4 4 0 0 1-8 0z"/>',
  heart: '<path d="M12 21s-8-4.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.5-8 11-8 11z"/><path d="M7.5 12h2.5l1.5-2.5 2 5 1.5-2.5h1.5"/>',
  dumbbell: '<path d="M6.5 7v10M17.5 7v10M3.5 10v4M20.5 10v4M6.5 12h11"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7.5 4v16M16.5 4v16M3 9h4.5M3 15h4.5M16.5 9H21M16.5 15H21"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8S10.5 3 8 3a2.5 2.5 0 0 0 0 5M12 8s1.5-5 4-5a2.5 2.5 0 0 1 0 5"/>',
  book: '<path d="M4 19V5a2 2 0 0 1 2-2h14v14H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h14"/>',
  rupee: '<path d="M6 4h12M6 9h12M14 20 7 13h2.5a4.5 4.5 0 0 0 0-9"/>',
  tag: '<path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  // payments
  qr: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3h-3zM20.5 14v.01M14 20.5h.01M17.5 20.5H21V17"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20M6 15h4"/>',
  // ui
  chart: '<path d="M4 20V11M10 20V5M16 20v-6M21 20H3"/>',
  wallet: '<path d="M19 7V5.5A1.5 1.5 0 0 0 17.5 4H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6"/><path d="M16 14h2"/>',
  user: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="10" r="3"/><path d="M6.5 18.5a7 7 0 0 1 11 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  chevR: '<path d="m9 6 6 6-6 6"/>', chevL: '<path d="m15 6-6 6 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pencil: '<path d="M16.5 3.5a2.5 2.5 0 0 1 3.5 3.5L7.5 19.5 3 21l1.5-4.5z"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="17" rx="3"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4.5M12 16h.01"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  tick: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  up: '<path d="M7 17 17 7M8 7h9v9"/>', down: '<path d="M7 7l10 10M17 8v9H8"/>',
  bulb: '<path d="M9 18h6M10 21.5h4M12 2.5a6.5 6.5 0 0 0-3.8 11.8c.5.4.8 1 .8 1.7v.5h6V16c0-.7.3-1.3.8-1.7A6.5 6.5 0 0 0 12 2.5z"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', upload: '<path d="M12 16V4M7 9l5-5 5 5M5 21h14"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  trash: '<path d="M3.5 6h17M9 6V4h6v2M6 6l1 15h10l1-15M10 10.5v6M14 10.5v6"/>',
  shield: '<path d="M12 3 4.5 6v6c0 4.8 3.2 7.8 7.5 9 4.3-1.2 7.5-4.2 7.5-9V6z"/><path d="m9 12 2 2 4-4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  lock: '<rect x="4.5" y="11" width="15" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  flag: '<path d="M5 21V4M5 4h12l-2.5 4L17 12H5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
  clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  handshake: '<path d="m11 17 2 2a1.4 1.4 0 0 0 2-2"/><path d="m14 14 2.5 2.5a1.4 1.4 0 0 0 2-2L15 11l-3 1-3-3 3.5-3.5L17 7l4 4M3 11l4-4 3 1"/><path d="m7 13 3 3a1.4 1.4 0 0 1-2 2l-3-3"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  zapIn: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
  piggy: '<path d="M19 9.6c1 .6 1.5 1.4 1.6 2.4h1.4v3.2h-1.7a6.2 6.2 0 0 1-2.3 2.4V20h-3v-1.4h-4V20H8v-2.6A6 6 0 0 1 10 6h4l3.5-2v4.2"/><path d="M15.5 11h.01"/>',
  laptop: '<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2 20h20"/>',
  grad: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6"/>',
  ring: '<circle cx="12" cy="15" r="6"/><path d="m9 4 3 4 3-4z"/>',
  more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  minus: '<path d="M5 12h14"/>',
  share: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M7 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1"/>',
  plusSquare: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8.5v7M8.5 12h7"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/>',
  monitor: '<rect x="2.5" y="4" width="19" height="13" rx="2.5"/><path d="M8 21h8M12 17v4"/>',
  receipt: '<path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5-2 1.5-2.5-1.5L5 21z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
};
const icon = (name, size = 22, sw = 1.8) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.tag}</svg>`;
const CAT_ICONS = ['cart', 'utensils', 'scooter', 'coffee', 'home', 'fuel', 'car', 'train', 'plane', 'zap', 'phone', 'wifi', 'sparkles', 'bank', 'bag', 'shirt', 'heart', 'dumbbell', 'film', 'gift', 'book', 'rupee', 'tag', 'box'];
const PALETTE = ['#3B82F6', '#22C55E', '#F97316', '#EF4444', '#EAB308', '#A855F7', '#EC4899', '#14B8A6', '#06B6D4', '#6366F1', '#F59E0B', '#94A3B8'];

/* ================= India defaults ================= */
const SEED_VERSION = 2;
const DEFAULT_CATEGORIES = [
  ['Groceries & Kirana', 'cart', '#22C55E'], ['Food & Chai', 'utensils', '#F97316'], ['Food Delivery', 'scooter', '#EF4444'],
  ['Rent', 'home', '#6366F1'], ['Petrol & Fuel', 'fuel', '#0EA5E9'], ['Auto, Cab & Metro', 'car', '#EAB308'],
  ['Electricity & Gas', 'zap', '#F59E0B'], ['Mobile & Internet', 'phone', '#3B82F6'], ['House Help', 'sparkles', '#14B8A6'],
  ['EMI & Loans', 'bank', '#94A3B8'], ['Shopping', 'bag', '#EC4899'], ['Medical', 'heart', '#10B981'],
  ['Entertainment & OTT', 'film', '#A855F7'], ['Festivals & Gifts', 'gift', '#FB923C'], ['Travel', 'train', '#06B6D4'],
  ['Education', 'book', '#8B5CF6'], ['Other', 'box', '#64748B'],
];
const LEGACY_ICON = Object.fromEntries([...DEFAULT_CATEGORIES.map(([n, i]) => [n, i]),
  ['Food & Dining', 'utensils'], ['Groceries', 'cart'], ['Rent & Home', 'home'], ['Transport', 'car'], ['Bills & Utilities', 'zap'],
  ['Entertainment', 'film'], ['Health', 'heart'], ['Travel', 'plane']]);
const PAYMENT_MODES = [['UPI', 'qr', '#3B82F6'], ['Cash', 'cash', '#22C55E'], ['Card', 'card', '#F59E0B'], ['Net Banking', 'bank', '#A855F7']];
const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];
const INCOME_SOURCES = [['Salary', 'rupee'], ['Freelance', 'laptop'], ['Business', 'bag'], ['Interest', 'bank'], ['Gift', 'gift'], ['Other', 'tag']];
const DEFAULT_FAVS = [['Chai', 20, 'utensils'], ['Metro', 40, 'car'], ['Lunch', 150, 'utensils']];
const GOAL_ICONS = ['piggy', 'shield', 'home', 'car', 'scooter', 'plane', 'train', 'phone', 'laptop', 'grad', 'ring', 'gift', 'heart', 'sparkles', 'bag', 'rupee', 'flag', 'book'];
const GOAL_SUGGESTIONS = [['Emergency Fund', 'shield', '#22C55E', 100000], ['Goa Trip', 'plane', '#06B6D4', 40000], ['New Phone', 'phone', '#3B82F6', 60000],
  ['Diwali Shopping', 'gift', '#F97316', 25000], ['New Bike', 'scooter', '#EF4444', 120000], ['Higher Studies', 'grad', '#8B5CF6', 300000]];
const SAVE_AMOUNTS = [500, 1000, 2000, 5000, 10000];
const LOCALE = 'en-IN';

/* ================= State ================= */
const S = {
  categories: [], expenses: [], budgets: {}, settings: {}, goals: [], recurring: [], ious: [], txKind: 'expense', splitN: 2, calDay: null, editingGoal: null, goalId: null, contribSign: 1,
  view: 'home', sub: null, homePeriod: 'month', period: 'week', statsOffset: 0, month: '',
  txFilter: '', txSearch: '', txAdv: { min: '', max: '', from: '', to: '' }, txPanel: false, budgetEdit: false, editingExpense: null, editingCat: null, sheet: null,
};

/* ================= Helpers ================= */
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, '0');
const round2 = n => Math.round(n * 100) / 100;
const sum = a => round2(a.reduce((x, y) => x + y, 0));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ds = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => ds(new Date());
const thisMonth = () => todayStr().slice(0, 7);
const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const diffDays = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 864e5);
function shiftMonth(m, delta) { let [y, mo] = m.split('-').map(Number); mo += delta; while (mo < 1) { mo += 12; y--; } while (mo > 12) { mo -= 12; y++; } return `${y}-${pad(mo)}`; }
function monthLabel(m, style = 'long') { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 1, 1); return style === 'name' ? d.toLocaleDateString(LOCALE, { month: 'long' }) : d.toLocaleDateString(LOCALE, { month: style, year: 'numeric' }); }
const daysInMonth = m => { const [y, mo] = m.split('-').map(Number); return new Date(y, mo, 0).getDate(); };
function mondayOf(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; }
function dayLabel(s) {
  if (s === todayStr()) return 'Today';
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (s === ds(y)) return 'Yesterday';
  const d = parseDate(s);
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric', weekday: 'short' });
}

/* Indian Rupee formatting with lakh/crore grouping: ₹1,25,000 */
const INR0 = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const INR2 = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = n => (Math.abs(n - Math.round(n)) < 0.005 ? INR0 : INR2).format(n);
function fmtShort(n) {
  const a = Math.abs(n), s = n < 0 ? '-' : '', trim = x => x.toFixed(2).replace(/\.?0+$/, '');
  const r2 = x => Math.round(x * 100) / 100;   // choose the unit from the rounded display, so ₹99,999 reads ₹1L (not ₹100K)
  if (Math.round(a) < 1e4) return INR0.format(Math.round(n));
  if (r2(a / 1e3) < 100) return `${s}₹${trim(a / 1e3)}K`;
  if (r2(a / 1e5) < 100) return `${s}₹${trim(a / 1e5)}L`;
  return `${s}₹${trim(a / 1e7)}Cr`;
}
function parseAmount(v) {
  v = String(v).replace(/[\s ]/g, '').replace(/[^\d.,-]/g, '');
  if (v.includes(',') && v.includes('.')) v = v.replace(/,/g, '');
  else if (/,\d{1,2}$/.test(v)) v = v.replace(',', '.');
  else v = v.replace(/,/g, '');
  const n = parseFloat(v);
  return Number.isFinite(n) ? round2(n) : NaN;
}
const catById = id => S.categories.find(c => c.id === id) || { id, name: 'Deleted category', icon: 'tag', color: '#94A3B8' };
const tint = (c, size = 46, r = 15) => `<span class="ic" style="background:${c.color}22;color:${c.color};width:${size}px;height:${size}px;border-radius:${r}px">${icon(c.icon, Math.round(size * .48))}</span>`;
/* Transaction kinds: 'expense' (default), 'credit' (refund — reduces spending), 'income' (kept out of spending). */
const isIncome = e => e.kind === 'income';
const sv = e => e.kind === 'credit' ? -e.amount : e.amount;           // signed spend value
const expensesIn = (a, b) => S.expenses.filter(e => !isIncome(e) && e.date >= a && e.date <= b);  // spending (expenses + refunds)
const incomeIn = (a, b) => S.expenses.filter(e => isIncome(e) && e.date >= a && e.date <= b);
const spendSum = list => sum(list.map(sv));
function totalsByCat(list) { const o = {}; for (const e of list) o[e.categoryId] = round2((o[e.categoryId] || 0) + sv(e)); for (const k in o) if (o[k] <= 0) delete o[k]; return o; }

/* Budget cycle: starts on a chosen day (e.g. salary day 25 → 25 Oct – 24 Nov). Keyed by the month it starts in. */
const cycleDay = () => Math.min(28, Math.max(1, +S.settings.cycleDay || 1));
function cycleKey(dstr) { const [y, m, d] = dstr.split('-').map(Number), k = `${y}-${pad(m)}`; return d >= cycleDay() ? k : shiftMonth(k, -1); }
function cycleRange(key) {
  const cd = cycleDay();
  if (cd === 1) return { start: `${key}-01`, end: `${key}-${pad(daysInMonth(key))}` };
  const [y, m] = key.split('-').map(Number);
  return { start: `${key}-${pad(cd)}`, end: ds(new Date(y, m, cd - 1)) };
}
function cycleLabel(key, short) {
  if (cycleDay() === 1) return short ? monthLabel(key, 'short') : monthLabel(key);
  const r = cycleRange(key), f = s => parseDate(s).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
  return `${f(r.start)} – ${f(r.end)}`;
}
const cycleName = key => cycleDay() === 1 ? monthLabel(key, 'name') : 'this cycle';
const curCycle = () => cycleKey(todayStr());

/* App mode: 'basic' (add expenses, budget, stats) or 'advanced' (everything). Hiding never deletes data.
   Existing users with data default to advanced so nothing disappears; brand-new users default to basic. */
const hasUserData = () => !!(S.expenses.length || S.goals.length || S.recurring.length || S.ious.length);
const appMode = () => S.settings.mode || (S.settings.onboarded || hasUserData() ? 'advanced' : 'basic');
const isAdvanced = () => appMode() === 'advanced';
const BASIC_VIEWS = ['home', 'stats', 'budget', 'profile', 'transactions', 'categories'];
const budgetStatus = (spent, limit) => !limit ? 'none' : spent > limit ? 'over' : spent / limit >= .75 ? 'warn' : 'ok';
const STATUS_COLOR = { over: 'var(--red)', warn: 'var(--amber)', ok: 'var(--accent)', none: 'var(--faint)' };

/* A month's target = value set for that month, else the most recent earlier month's value (carried over). */
function budgetFor(catId, m) {
  const exact = S.budgets[`${m}|${catId}`];
  if (exact) return { limit: exact.limit, inherited: false };
  let best = null;
  for (const b of Object.values(S.budgets)) if (b.categoryId === catId && b.month < m && (!best || b.month > best.month)) best = b;
  return best ? { limit: best.limit, inherited: best.limit > 0, from: best.month } : { limit: 0, inherited: false };
}
const totalBudget = m => sum(S.categories.map(c => budgetFor(c.id, m).limit)); // sum of category limits
/* Overall monthly budget: one number for everything. Category limits are optional sub-limits inside it.
   Stored like a category budget under a reserved id, so it carries over month to month the same way. */
const TOTAL_KEY = '__overall__';
const overallBudget = m => budgetFor(TOTAL_KEY, m).limit;
const effectiveBudget = m => overallBudget(m) || totalBudget(m);
function allocLine(m) {
  const o = overallBudget(m), c = totalBudget(m);
  if (!o && !c) return 'Tip: just set this one number. Category limits below are optional.';
  if (!o) return `No overall budget — your budget is the total of category limits (${fmt(c)}).`;
  if (!c) return `All ${fmt(o)} covers every category. Add limits below only where you want extra control.`;
  return o >= c ? `${fmt(c)} set aside in category limits · <b style="color:var(--text)">${fmt(round2(o - c))}</b> left for everything else.`
    : `<span class="red">Category limits add up to ${fmt(c)}, which is ${fmt(round2(c - o))} more than your overall budget.</span>`;
}

/* Period ranges for stats: week (Mon–Sun), month, year. offset 0 = current. */
function rangeOf(period, offset = 0) {
  const now = new Date(), today = todayStr();
  if (period === 'day') {
    const d = new Date(now); d.setDate(d.getDate() + offset); const k = ds(d);
    const label = offset === 0 ? 'Today' : offset === -1 ? 'Yesterday' : d.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });
    return { start: k, end: k, label, buckets: [{ label: '', full: label, start: k, end: k, cur: k === today }], noun: 'day' };
  }
  if (period === 'week') {
    const s = mondayOf(now); s.setDate(s.getDate() + offset * 7);
    const e = new Date(s); e.setDate(s.getDate() + 6);
    const buckets = [...Array(7)].map((_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); const k = ds(d);
      return { label: d.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase(), full: d.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'short' }), start: k, end: k, cur: k === today }; });
    const mo = d => d.toLocaleDateString(LOCALE, { month: 'short' });
    const label = offset === 0 ? 'This week' : offset === -1 ? 'Last week' : `${s.getDate()}${s.getMonth() === e.getMonth() ? '' : ' ' + mo(s)} – ${e.getDate()} ${mo(e)} ${e.getFullYear()}`;
    return { start: ds(s), end: ds(e), label, buckets, noun: 'week' };
  }
  if (period === 'month') {
    const m = shiftMonth(curCycle(), offset), cr = cycleRange(m), n = diffDays(cr.start, cr.end) + 1, s0 = parseDate(cr.start);
    const buckets = [...Array(n)].map((_, i) => { const d = new Date(s0); d.setDate(s0.getDate() + i); const k = ds(d);
      return { label: i % 7 === 0 ? String(d.getDate()) : '', full: d.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' }), start: k, end: k, cur: k === today }; });
    return { start: cr.start, end: cr.end, label: cycleLabel(m), buckets, noun: cycleDay() === 1 ? 'month' : 'cycle', key: m };
  }
  const y = now.getFullYear() + offset;
  const buckets = [...Array(12)].map((_, i) => { const m = `${y}-${pad(i + 1)}`;
    return { label: new Date(y, i, 1).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(), full: monthLabel(m), start: `${m}-01`, end: `${m}-${pad(daysInMonth(m))}`, cur: m === thisMonth() }; });
  return { start: `${y}-01-01`, end: `${y}-12-31`, label: String(y), buckets, noun: 'year' };
}
function daysElapsed(r) { const t = todayStr(); if (t < r.start) return 0; return diffDays(r.start, t < r.end ? t : r.end) + 1; }

/* ================= Theme: system / light / dark ================= */
const THEMES = [['system', 'monitor', 'System', 'Match your phone setting'], ['light', 'sun', 'Light', 'Bright background'], ['dark', 'moon', 'Dark', 'Easy on the eyes at night']];
const sysDark = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : { matches: true };
const effectiveTheme = () => { const t = S.settings.theme || 'system'; return t === 'system' ? (sysDark.matches ? 'dark' : 'light') : t; };
function applyTheme() {
  const t = S.settings.theme || 'system', root = document.documentElement;
  if (t === 'system') delete root.dataset.theme; else root.dataset.theme = t;
  $('themeColor').setAttribute('content', effectiveTheme() === 'dark' ? '#09090B' : '#F3F4F7');
  try { localStorage.setItem('theme', t); } catch {}
}
async function setTheme(t) { await setSetting('theme', t); applyTheme(); render(); }
sysDark.addEventListener?.('change', () => { if ((S.settings.theme || 'system') === 'system') { applyTheme(); render(); } });

let toastTimer;
function toast(msg, actionLabel, onAction) {
  const t = $('toast'); t.innerHTML = esc(msg) + (actionLabel ? `<button class="toast-act" id="toastAct">${esc(actionLabel)}</button>` : '');
  t.classList.toggle('act', !!actionLabel); t.classList.add('show'); clearTimeout(toastTimer);
  if (actionLabel) $('toastAct').onclick = () => { t.classList.remove('show'); onAction(); };
  toastTimer = setTimeout(() => t.classList.remove('show'), actionLabel ? 5000 : 2400);
}
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

