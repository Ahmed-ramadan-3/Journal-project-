(() => {
'use strict';
const KEY = 'accounting-journal:v1', PKEY = 'accounting-journal:prefs:v1', AR = '٠١٢٣٤٥٦٧٨٩';
const $ = s => document.querySelector(s);
const S = { entries: [], prefs: { mode: 'simple', sort: 'desc', digits: false } };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const n = x => S.prefs.digits ? String(x).replace(/\d/g, d => AR[d]) : String(x);
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const blank = () => ({ account: '', amount: '' });
const validDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
const norm = s => s.toLowerCase().replace(/[\u064B-\u065F\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[٠-٩]/g, d => AR.indexOf(d));

function el(t, a = {}, ...k) {
  const e = document.createElement(t);
  for (const [x, v] of Object.entries(a)) {
    if (x === 'class') e.className = v;
    else if (x.startsWith('on')) e.addEventListener(x.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(x, v === true ? '' : v);
  }
  for (const c of k.flat()) if (c != null) e.append(c);
  return e;
}

/* ---------- money: integer minor units (1/100), never floats ---------- */
function parseMinor(s) {
  if (s == null) return null;
  let t = String(s).trim();
  if (!t) return null;
  t = t.replace(/[٠-٩]/g, d => AR.indexOf(d)).replace(/٫/g, '.').replace(/[٬,\s]/g, '');
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(t)) return NaN;
  const [a, b = ''] = t.split('.');
  return Number(a) * 100 + Number((b + '00').slice(0, 2));
}
const fmt = m => new Intl.NumberFormat(S.prefs.digits ? 'ar-EG' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(m / 100);
const fdate = iso => { const [y, m, d] = iso.split('-'); return n(`${d}/${m}/${y}`); };

function evaluate(e) {
  let invalid = false, incomplete = false;
  const scan = ls => {
    let cnt = 0, tot = 0;
    for (const l of ls) {
      const m = parseMinor(l.amount), a = l.account.trim();
      if (!a && m === null) continue;
      if (Number.isNaN(m)) { invalid = true; incomplete = true; continue; }
      if (!a || m === null) { incomplete = true; continue; }
      cnt++; tot += m;
    }
    if (!cnt) incomplete = true;
    return tot;
  };
  const d = scan(e.debits), c = scan(e.credits);
  if (d === 0 && c === 0) incomplete = true;
  return { d, c, diff: d - c, invalid, incomplete, balanced: !invalid && !incomplete && d === c };
}

/* ---------- validation of stored / imported data ---------- */
function validate(x) {
  if (!x || typeof x !== 'object') return null;
  const side = a => Array.isArray(a) && a.length >= 1 && a.length <= 50
    ? a.map(l => l && typeof l === 'object' ? { account: String(l.account ?? '').slice(0, 80), amount: String(l.amount ?? '').slice(0, 20) } : null) : null;
  const debits = side(x.debits), credits = side(x.credits);
  if (!debits || !credits || debits.includes(null) || credits.includes(null) || !validDate(x.date)) return null;
  if ([...debits, ...credits].some(l => Number.isNaN(parseMinor(l.amount)))) return null;
  const e = {
    id: typeof x.id === 'string' && x.id ? x.id.slice(0, 40) : uid(),
    mode: x.mode === 'compound' || debits.length > 1 || credits.length > 1 ? 'compound' : 'simple',
    status: x.status === 'complete' ? 'complete' : 'draft',
    date: x.date, desc: String(x.desc ?? '').slice(0, 300), debits, credits,
    created: Number.isFinite(x.created) ? x.created : Date.now()
  };
  if (e.status === 'complete' && !evaluate(e).balanced) e.status = 'draft';
  return e;
}
function uniq(list) { const seen = new Set(); return list.map(e => { if (seen.has(e.id)) e.id = uid(); seen.add(e.id); return e; }); }

function load() {
  try { const a = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(a)) S.entries = uniq(a.map(validate).filter(Boolean)); } catch (_) {}
  try { Object.assign(S.prefs, JSON.parse(localStorage.getItem(PKEY)) || {}); } catch (_) {}
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S.entries)); localStorage.setItem(PKEY, JSON.stringify(S.prefs)); return true; }
  catch (_) { toast('تعذّر الحفظ في المتصفح. قد يكون التخزين معطّلًا أو ممتلئًا. صدّر نسخة احتياطية الآن.', 'err'); return false; }
}

/* ---------- ui helpers ---------- */
function toast(msg, type = '') {
  const t = $('#toast'); t.textContent = msg; t.className = 'show ' + type;
  clearTimeout(toast.h); toast.h = setTimeout(() => { t.className = ''; }, 4500);
}
function ask(msg, ok = 'تأكيد') {
  return new Promise(res => {
    const d = $('#confirm'); $('#cmsg').textContent = msg; $('#cok').textContent = ok;
    const done = v => { d.close(); res(v); };
    $('#cok').onclick = () => done(true); $('#ccancel').onclick = () => done(false);
    d.oncancel = () => res(false); d.showModal(); $('#ccancel').focus();
  });
}
const badgeOf = ev => ev.incomplete ? ['مسودة', 'b-draft'] : ev.balanced ? ['متوازن', 'b-ok'] : ['غير متوازن', 'b-bad'];
function totalsNodes(ev) {
  const [txt, cls] = badgeOf(ev);
  return [el('span', { class: 'badge ' + cls }, txt),
    el('span', {}, 'إجمالي المدين: ' + n(fmt(ev.d))), el('span', {}, 'إجمالي الدائن: ' + n(fmt(ev.c))),
    el('span', {}, 'الفرق: ' + n(fmt(Math.abs(ev.diff))))];
}

/* ---------- ledger ---------- */
function visible() {
  const q = norm($('#q').value.trim()), f = $('#from').value, t = $('#to').value;
  const k = S.prefs.sort === 'asc' ? 1 : -1;
  return S.entries.filter(e => (!f || e.date >= f) && (!t || e.date <= t) &&
    (!q || norm([e.desc, ...e.debits.map(l => l.account), ...e.credits.map(l => l.account)].join(' ')).includes(q)))
    .sort((a, b) => k * (a.date.localeCompare(b.date) || a.created - b.created));
}
function entryBody(e) {
  const ev = evaluate(e);
  const used = l => l.account.trim() || l.amount.trim();
  let rows = [...e.debits.filter(used).map(l => ['d', l]), ...e.credits.filter(used).map(l => ['c', l])];
  if (!rows.length) rows = [['d', blank()]];
  const tb = el('tbody', { class: 'entry' + (e.status === 'draft' ? ' is-draft' : '') });
  rows.forEach(([t, l], i) => {
    const m = parseMinor(l.amount), a = l.amount.trim() ? (Number.isNaN(m) ? l.amount : fmt(m)) : '';
    tb.append(el('tr', {},
      el('td', { class: 'amt' }, t === 'd' ? n(a) : ''), el('td', { class: 'amt' }, t === 'c' ? n(a) : ''),
      el('td', { class: 'bayan ' + (t === 'd' ? 'from' : 'to') }, (t === 'd' ? 'من حـ/ ' : 'إلى حـ/ ') + l.account),
      i === 0 ? el('td', { class: 'date', rowspan: rows.length + 1 }, fdate(e.date)) : null));
  });
  tb.append(el('tr', {}, el('td', { class: 'amt' }), el('td', { class: 'amt' }), el('td', { class: 'desc' }, e.desc)));
  tb.append(el('tr', {}, el('td', { class: 'foot', colspan: 4 }, el('div', { class: 'foot-in' },
    totalsNodes(ev), e.status === 'draft' && !ev.incomplete ? el('span', { class: 'b-draft' }, '(محفوظ كمسودة)') : null,
    el('span', { class: 'fa noprint' },
      el('button', { type: 'button', class: 'btn', onclick: () => openEditor(e) }, 'تعديل'),
      el('button', { type: 'button', class: 'btn', onclick: () => dup(e) }, 'نسخ'),
      el('button', { type: 'button', class: 'btn danger', onclick: () => del(e) }, 'حذف'))))));
  return tb;
}
function render() {
  const list = visible(), tbl = $('#ledger');
  tbl.querySelectorAll('tbody.entry').forEach(x => x.remove());
  list.forEach(e => tbl.append(entryBody(e)));
  $('#ledgerWrap').hidden = !list.length; $('#empty').hidden = !!list.length;
  $('#emptyMsg').textContent = S.entries.length ? 'لا توجد قيود تطابق البحث أو التاريخ المحدد.' : 'الدفتر فارغ. اضغط «إضافة قيد» لتسجيل أول عملية.';
  $('#sum').textContent = `عدد القيود المعروضة: ${n(list.length)} من ${n(S.entries.length)}`;
  $('#sortBtn').textContent = S.prefs.sort === 'asc' ? 'الترتيب: الأقدم أولًا' : 'الترتيب: الأحدث أولًا';
  $('#digits').checked = S.prefs.digits;
  document.querySelectorAll('.top .mode').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === S.prefs.mode));
}
async function del(e) {
  if (!await ask('هل تريد حذف هذا القيد نهائيًا؟', 'حذف')) return;
  S.entries = S.entries.filter(x => x.id !== e.id); save(); render(); toast('تم حذف القيد');
}
function dup(e) {
  const c = structuredClone(e); c.id = uid(); c.created = Date.now(); c.status = 'draft';
  S.entries.push(c); save(); render(); toast('تم نسخ القيد كمسودة');
}

/* ---------- editor ---------- */
let ed = null;
function openEditor(e) {
  ed = e ? structuredClone(e) : { id: null, mode: S.prefs.mode, status: 'draft', date: today(), desc: '', debits: [blank()], credits: [blank()], created: Date.now() };
  $('#etitle').textContent = e ? 'تعديل قيد' : 'إضافة قيد';
  $('#edate').value = ed.date; $('#edesc').value = ed.desc; $('#eerr').textContent = '';
  renderLines(); $('#editor').showModal(); $('#dl input')?.focus();
}
function renderLines() {
  [['debits', '#dl', 'مدين', 'الصندوق'], ['credits', '#cl', 'دائن', 'رأس المال']].forEach(([side, sel, nm, ph]) => {
    const box = $(sel); box.replaceChildren();
    ed[side].forEach((l, i) => box.append(el('div', { class: 'line' },
      el('input', { type: 'text', maxlength: 80, value: l.account, placeholder: 'مثال: ' + ph, 'aria-label': `اسم الحساب ${nm} ${n(i + 1)}`, oninput: x => { l.account = x.target.value; totals(); } }),
      el('input', { type: 'text', inputmode: 'decimal', value: l.amount, placeholder: '0.00', 'aria-label': `المبلغ ${nm} ${n(i + 1)}`, oninput: x => { l.amount = x.target.value; totals(); } }),
      ed.mode === 'compound' && ed[side].length > 1 ? el('button', { type: 'button', class: 'x', 'aria-label': 'حذف هذا السطر', onclick: () => { ed[side].splice(i, 1); renderLines(); } }, '×') : el('span'))));
  });
  $('#addD').hidden = $('#addC').hidden = ed.mode !== 'compound';
  document.querySelectorAll('#emodes .mode').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === ed.mode));
  totals();
}
function totals() { $('#etotals').replaceChildren(...totalsNodes(evaluate(ed))); }
function setEMode(m) {
  if (m === 'simple' && (ed.debits.length > 1 || ed.credits.length > 1)) { $('#eerr').textContent = 'لا يمكن التحويل إلى قيد بسيط ما دام للقيد أكثر من سطر مدين أو دائن. احذف الأسطر الزائدة أولًا.'; return; }
  $('#eerr').textContent = ''; ed.mode = m; renderLines();
}
function saveEntry(kind) {
  const err = $('#eerr'); ed.date = $('#edate').value; ed.desc = $('#edesc').value.trim();
  if (!validDate(ed.date)) { err.textContent = 'اختر تاريخًا صحيحًا.'; return; }
  const ev = evaluate(ed);
  if (ev.invalid) { err.textContent = 'يوجد مبلغ غير صالح. استخدم أرقامًا غير سالبة بحد أقصى خانتين عشريتين.'; return; }
  if (kind === 'complete') {
    if (ev.incomplete) { err.textContent = 'القيد غير مكتمل: أدخل اسم الحساب والمبلغ لكل سطر، وسطرًا مدينًا ودائنًا على الأقل، وبمجموع أكبر من صفر.'; return; }
    if (!ev.balanced) { err.textContent = `القيد غير متوازن. الفرق ${n(fmt(Math.abs(ev.diff)))}. عدّل المبالغ أو احفظه كمسودة.`; return; }
  }
  const out = { ...ed, status: kind, debits: ed.debits.map(l => ({ account: l.account.trim(), amount: l.amount.trim() })), credits: ed.credits.map(l => ({ account: l.account.trim(), amount: l.amount.trim() })) };
  if (out.id) S.entries = S.entries.map(x => x.id === out.id ? out : x);
  else { out.id = uid(); out.created = Date.now(); S.entries.push(out); }
  if (save()) { $('#editor').close(); render(); toast(kind === 'complete' ? 'تم حفظ القيد' : 'تم حفظ المسودة'); }
}

/* ---------- export / import ---------- */
function download(name, type, text) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = el('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const stamp = () => today().replace(/-/g, '');
function expJson() {
  if (!S.entries.length) return toast('لا توجد قيود للتصدير', 'err');
  download(`journal-backup-${stamp()}.json`, 'application/json', JSON.stringify({ app: 'accounting-journal', version: 1, exportedAt: new Date().toISOString(), entries: S.entries }, null, 2));
  toast('تم تصدير النسخة الاحتياطية');
}
function expCsv() {
  if (!S.entries.length) return toast('لا توجد قيود للتصدير', 'err');
  const q = v => { v = String(v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
  const rows = [['التاريخ', 'نوع القيد', 'الحالة', 'الجانب', 'الحساب', 'المبلغ', 'البيان']];
  [...S.entries].sort((a, b) => a.date.localeCompare(b.date) || a.created - b.created).forEach(e => {
    const st = e.status === 'complete' ? 'مكتمل' : 'مسودة', md = e.mode === 'compound' ? 'متعدد' : 'بسيط';
    e.debits.forEach(l => rows.push([e.date, md, st, 'من حـ/ (مدين)', l.account, l.amount, e.desc]));
    e.credits.forEach(l => rows.push([e.date, md, st, 'له حـ/ (دائن)', l.account, l.amount, e.desc]));
  });
  download(`journal-${stamp()}.csv`, 'text/csv;charset=utf-8', '\ufeff' + rows.map(r => r.map(q).join(',')).join('\r\n'));
  toast('تم تصدير ملف CSV');
}
async function onImport(ev) {
  const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
  try {
    if (f.size > 5e6) throw new Error('الملف كبير جدًا');
    const j = JSON.parse(await f.text()), arr = Array.isArray(j) ? j : j && j.entries;
    if (!Array.isArray(arr)) throw new Error('بنية الملف غير صحيحة');
    if (arr.length > 5000) throw new Error('عدد القيود في الملف كبير جدًا');
    const out = uniq(arr.map((x, i) => { const v = validate(x); if (!v) throw new Error(`القيد رقم ${n(i + 1)} غير صالح`); return v; }));
    if (!await ask(`سيتم استبدال ${n(S.entries.length)} قيد حالي بـ ${n(out.length)} قيد من الملف. هل تريد المتابعة؟`, 'استبدال')) return;
    const old = S.entries; S.entries = out;
    if (save()) { render(); toast('تم استيراد النسخة الاحتياطية'); } else S.entries = old;
  } catch (err) {
    toast('تعذّر الاستيراد: ' + (err instanceof SyntaxError ? 'الملف ليس بصيغة JSON صالحة' : err.message) + '. لم يتم تغيير بياناتك.', 'err');
  }
}

/* ---------- print ---------- */
function printMeta() {
  const f = $('#from').value, t = $('#to').value;
  $('#printRange').textContent = f || t ? `الفترة: ${f ? 'من ' + fdate(f) : ''} ${t ? 'إلى ' + fdate(t) : ''}`.trim() : 'جميع القيود';
}

/* ---------- init ---------- */
function init() {
  load();
  document.querySelectorAll('.top .mode').forEach(b => b.onclick = () => { S.prefs.mode = b.dataset.mode; save(); render(); });
  document.querySelectorAll('#emodes .mode').forEach(b => b.onclick = () => setEMode(b.dataset.mode));
  $('#addBtn').onclick = () => openEditor(null);
  $('#addD').onclick = () => { if (ed.debits.length < 20) { ed.debits.push(blank()); renderLines(); } };
  $('#addC').onclick = () => { if (ed.credits.length < 20) { ed.credits.push(blank()); renderLines(); } };
  $('#saveC').onclick = () => saveEntry('complete'); $('#saveD').onclick = () => saveEntry('draft');
  $('#cancelE').onclick = () => $('#editor').close();
  $('#eform').addEventListener('submit', e => e.preventDefault());
  ['#q', '#from', '#to'].forEach(s => $(s).addEventListener('input', render));
  $('#clearF').onclick = () => { $('#q').value = $('#from').value = $('#to').value = ''; render(); };
  $('#sortBtn').onclick = () => { S.prefs.sort = S.prefs.sort === 'asc' ? 'desc' : 'asc'; save(); render(); };
  $('#digits').onchange = e => { S.prefs.digits = e.target.checked; save(); render(); };
  $('#expJson').onclick = expJson; $('#expCsv').onclick = expCsv;
  $('#impBtn').onclick = () => $('#file').click(); $('#file').onchange = onImport;
  $('#printBtn').onclick = () => { printMeta(); window.print(); };
  window.addEventListener('beforeprint', printMeta);
  $('#wipe').onclick = async () => {
    if (!S.entries.length) return toast('لا توجد بيانات لحذفها');
    if (!await ask(`سيتم حذف جميع القيود (${n(S.entries.length)}) نهائيًا من هذا المتصفح. يُنصح بتصدير نسخة احتياطية أولًا. هل أنت متأكد؟`, 'حذف الكل')) return;
    S.entries = []; save(); render(); toast('تم حذف كل بيانات الدفتر');
  };
  render();
}
init();
})();
