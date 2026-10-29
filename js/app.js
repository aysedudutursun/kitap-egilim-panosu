/* Okuma Pusulası — kitap eğilim panosu
   Veri: data/latest.json (GitHub Actions ile 6 saatte bir Open Library'den üretilir).
   Dayanıklılık: veri alınamazsa bu cihazdaki son başarılı kopya (localStorage / service worker önbelleği) açılır.

   Demo için test parametreleri:
     ?test=hata   → veri adresini bozar (hata durumu + son başarılı veri)
     ?test=yavas  → yanıtı 2,5 sn geciktirir (iskelet/yükleniyor durumu)
     ?test=bos    → sonuç döndürmeyen filtre uygular (boş durum)
*/
(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const TEST = params.get('test');
  const DATA_URL = TEST === 'hata' ? 'data/BOZUK-adres.json' : (params.get('veri') || 'data/latest.json');
  const STATUS_URL = 'data/status.json';
  const TIMEOUT_MS = 8000;
  const PAGE = 25;
  const STORE_KEY = 'op:last-good';
  const PREF_KEY = 'op:prefs';
  const TZ = 'Europe/Istanbul';
  const RECENT_FROM = new Date().getFullYear() - 9;   // "son 10 yıl" (bu yıl dahil)
  const STATUS_ICON = { yeni: '★', yukseliyor: '▲', dusuyor: '▼', sabit: '●', ilk: '◆', haftalik: '◇', cikti: '○' };
  const PERIODS = [
    ['p0', (y) => y < 1900], ['p1', (y) => y < 1950], ['p2', (y) => y < 1980], ['p3', (y) => y < 2000],
    ['p4', (y) => y < 2010], ['p5', (y) => y < 2020], ['p6', () => true],
  ];

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Durum ----------
  const prefs = readPrefs();
  const state = {
    data: null,
    stale: null,               // null | 'net' | 'src' | 'old'
    lang: params.get('lang') || prefs.lang || 'tr',
    mode: params.get('mod') || prefs.mode || 'yetiskin',
    f: { list: 'daily', cat: '', ymin: null, ymax: null, q: '', stay: false, tr: false },
    sort: { key: 'daily', dir: 'asc' },
    shown: PAGE,
    charts: {},
  };
  if (TEST === 'bos') Object.assign(state.f, { ymin: 2099, ymax: 2100 });

  const T = () => window.I18N[state.lang] || window.I18N.tr;

  function readPrefs() { try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch { return {}; } }
  function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify({ lang: state.lang, mode: state.mode })); } catch { /* yok say */ } }

  // ---------- Biçimlendirme ----------
  const loc = () => (state.lang === 'en' ? 'en-GB' : 'tr-TR');
  const fmtNum = (n) => (n == null ? '—' : new Intl.NumberFormat(loc()).format(n));
  const fmtPct = (x) => new Intl.NumberFormat(loc(), { style: 'percent', maximumFractionDigits: 0 }).format(x);
  const fmtDate = (iso) => new Intl.DateTimeFormat(loc(), { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) + (state.lang === 'en' ? ' (Istanbul)' : ' (TSİ)');
  const catLabel = (id) => { const c = state.data?.categories.find((x) => x.id === id); return c ? c[state.lang] || c.tr : id; };

  // ---------- Veri yükleme ----------
  async function fetchJSON(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      if (TEST === 'yavas') await new Promise((r) => setTimeout(r, 2500));
      const res = await fetch(url, { cache: 'no-cache', signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
      const json = await res.json();
      return { json, fromCache: res.headers.get('x-sw-cache') === '1' };
    } finally { clearTimeout(timer); }
  }

  function valid(d) { return d && Array.isArray(d.books) && Array.isArray(d.categories) && d.data_at; }

  async function load() {
    showLoading();
    try {
      const { json, fromCache } = await fetchJSON(DATA_URL);
      if (!valid(json)) throw new Error('Beklenmeyen veri biçimi');
      state.data = json;
      state.stale = fromCache || !navigator.onLine ? 'net' : null;
      if (!fromCache) { try { localStorage.setItem(STORE_KEY, JSON.stringify(json)); } catch { /* kota */ } }
      checkSourceStatus();
    } catch (err) {
      let cached = null;
      try { cached = JSON.parse(localStorage.getItem(STORE_KEY)); } catch { /* yok */ }
      if (valid(cached)) { state.data = cached; state.stale = 'net'; }
      else { showFatal(err); return; }
    }
    if (!state.stale) {
      const hours = (Date.now() - Date.parse(state.data.data_at)) / 3.6e6;
      if (hours > 30) state.stale = 'old';
    }
    $('#fatal').hidden = true;
    $('#icerik').hidden = false;
    setupCategories();
    renderAll();
  }

  async function checkSourceStatus() {
    try {
      const { json } = await fetchJSON(STATUS_URL);
      if (json && json.ok === false && Date.parse(json.last_attempt) > Date.parse(state.data.data_at)) {
        state.stale = 'src'; state.srcAttempt = json.last_attempt; renderNotice();
      }
    } catch { /* durum dosyası isteğe bağlı */ }
  }

  function showLoading() {
    $('#kpis').innerHTML = '<div class="kpi skel"></div>'.repeat(4);
    $$('.chart__canvas').forEach((el) => el.classList.remove('is-ready'));
    $('#tbody').innerHTML = Array.from({ length: 6 }, () => `<tr class="skel-row" aria-hidden="true">${'<td><div class="skel skel-line"></div></td>'.repeat(8)}</tr>`).join('');
    $('#result-count').textContent = '';
    $('#c1-summary').textContent = ''; $('#c2-summary').textContent = '';
    document.body.setAttribute('aria-busy', 'true');
  }

  function showFatal(err) {
    document.body.removeAttribute('aria-busy');
    $('#icerik').hidden = true;
    $('#notice').hidden = true;
    $('#fatal').hidden = false;
    $('#fatal-detail').textContent = String(err && err.message ? err.message : err);
    $('#retry').focus();
  }

  // ---------- Filtreleme ----------
  function base() {
    let b = state.data.books;
    if (state.mode === 'cocuk') b = b.filter((x) => x.child);
    const { ymin, ymax, q, stay, tr } = state.f;
    if (ymin != null) b = b.filter((x) => x.year != null && x.year >= ymin);
    if (ymax != null) b = b.filter((x) => x.year != null && x.year <= ymax);
    if (stay) b = b.filter((x) => x.days >= 3);
    if (tr) b = b.filter((x) => x.tr === true);
    if (q) {
      const n = q.toLocaleLowerCase('tr');
      b = b.filter((x) => (x.title + ' ' + x.authors.join(' ')).toLocaleLowerCase('tr').includes(n));
    }
    return b;
  }
  const inList = (b, list) => (list === 'daily' ? b.daily != null : list === 'weekly' ? b.weekly != null : true);
  function filtered() {
    return base().filter((b) => inList(b, state.f.list) && (!state.f.cat || b.category === state.f.cat));
  }

  // ---------- Sıralama ----------
  const STATUS_ORDER = ['yukseliyor', 'yeni', 'sabit', 'ilk', 'dusuyor', 'haftalik', 'cikti'];
  function sortVal(b, key) {
    switch (key) {
      case 'title': return b.title;
      case 'category': return catLabel(b.category);
      case 'tr': return b.tr === true ? 0 : b.tr === false ? 1 : 2; // önce Türkçe baskısı olanlar
      case 'trend': return b.daily != null && b.prev != null ? -(b.prev - b.daily) : 1000 + STATUS_ORDER.indexOf(b.status);
      default: return b[key];
    }
  }
  function sorted(rows) {
    const { key, dir } = state.sort;
    const m = dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = sortVal(a, key), y = sortVal(b, key);
      if (x == null && y == null) return 0;
      if (x == null) return 1;          // boş değerler her zaman sonda
      if (y == null) return -1;
      if (typeof x === 'string') return m * x.localeCompare(y, loc());
      return m * (x - y) || (a.daily ?? 999) - (b.daily ?? 999);
    });
  }

  // ---------- Çizim ----------
  function renderAll() {
    document.body.removeAttribute('aria-busy');
    applyI18n();
    renderMeta();
    renderNotice();
    const rows = filtered();
    renderKPIs(rows);
    renderCharts();
    renderTable(rows);
    renderStatusHelp();
  }

  function applyI18n() {
    const t = T();
    document.documentElement.lang = state.lang;
    document.documentElement.dataset.mode = state.mode;
    $$('[data-i18n]').forEach((el) => { const v = t[el.dataset.i18n]; if (typeof v === 'string') el.textContent = v; });
    $$('[data-i18n-html]').forEach((el) => { const v = t[el.dataset.i18nHtml]; if (typeof v === 'string') el.innerHTML = v; });
    $$('[data-i18n-aria]').forEach((el) => { const v = t[el.dataset.i18nAria]; if (typeof v === 'string') el.setAttribute('aria-label', v); });
    $$('[data-mode]', $('.toggles')).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)));
    $$('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
    $('#mode-chip').textContent = state.mode === 'cocuk' ? t.chipChild : '';
    $('#f-q').placeholder = state.lang === 'en' ? 'e.g. Orwell' : 'ör. Sabahattin Ali';
    $('#f-ymin').placeholder = state.lang === 'en' ? 'from' : 'en erken';
    $('#f-ymax').placeholder = state.lang === 'en' ? 'to' : 'en geç';
    $$('#f-cat option').forEach((o) => { if (o.value) o.textContent = catLabel(o.value); });
    $('#sort-select') && syncSortSelect();
    document.title = state.lang === 'en' ? 'Okuma Pusulası · Book trend board' : 'Okuma Pusulası · Kitap eğilim panosu';
  }

  function renderMeta() {
    const d = state.data, t = T();
    const time = $('#updated-at');
    time.dateTime = d.data_at;
    time.textContent = fmtDate(d.data_at);
    $('#tracked').textContent = t.tracked(d.days_tracked, d.snapshot_count);
  }

  function renderNotice() {
    const el = $('#notice'), t = T();
    if (!state.stale) { el.hidden = true; el.innerHTML = ''; return; }
    let msg;
    if (state.stale === 'net') msg = t.staleNet(fmtDate(state.data.data_at));
    else if (state.stale === 'src') msg = t.staleSrc(fmtDate(state.srcAttempt));
    else msg = t.staleOld(Math.round((Date.now() - Date.parse(state.data.data_at)) / 3.6e6));
    el.className = 'notice' + (state.stale === 'net' ? ' notice--error' : '');
    el.innerHTML = `<span class="notice__icon" aria-hidden="true">⚠</span><span>${esc(msg)}</span>` +
      (state.stale === 'net' ? `<button type="button" class="btn btn--ghost" id="notice-retry">${esc(t.retry)}</button>` : '');
    el.hidden = false;
    $('#notice-retry')?.addEventListener('click', load);
  }

  function setupCategories() {
    const sel = $('#f-cat');
    const present = new Set(state.data.books.map((b) => b.category));
    sel.innerHTML = `<option value="">${esc(T().allCats)}</option>` +
      state.data.categories.filter((c) => present.has(c.id)).map((c) => `<option value="${esc(c.id)}">${esc(c[state.lang] || c.tr)}</option>`).join('');
    sel.value = state.f.cat;
    syncForm();
  }

  function kpi(label, value, foot, isText = false) {
    return `<div class="kpi"><p class="kpi__label">${esc(label)}</p><p class="kpi__value${isText ? ' kpi__value--text' : ''}">${value}</p><p class="kpi__foot">${esc(foot)}</p></div>`;
  }

  function renderKPIs(rows) {
    const t = T();
    const listed = rows.filter((b) => inList(b, state.f.list === 'all' ? 'daily' : state.f.list));
    const newCount = listed.filter((b) => b.status === 'yeni').length;
    const long = [...rows].filter((b) => b.days > 0).sort((a, b) => b.days - a.days || (a.daily ?? 999) - (b.daily ?? 999))[0];
    const withYear = rows.filter((b) => b.year != null);
    const recent = withYear.filter((b) => b.year >= RECENT_FROM).length;
    const rising = rows.filter((b) => b.status === 'yukseliyor').length;
    const enough = state.data.days_tracked >= 2;

    $('#kpis').innerHTML = [
      kpi(state.f.list === 'weekly' ? t.k1weekly : t.k1, fmtNum(listed.length), t.k1foot(newCount)),
      long && enough
        ? kpi(t.k2, esc(long.title), t.k2foot(long.days, long.authors[0] || t.unknown), true)
        : kpi(t.k2, long ? esc(long.title) : '—', long ? t.k2foot(long.days, long.authors[0] || t.unknown) + ' · ' + t.k2none : t.k2none, true),
      kpi(t.k3, withYear.length ? fmtPct(recent / withYear.length) : '—', t.k3foot(recent, withYear.length)),
      kpi(t.k4, fmtNum(rising), t.k4foot(enough)),
    ].join('');
  }

  // ---------- Grafikler ----------
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  function hatch(color, bg) {
    const c = document.createElement('canvas'); c.width = c.height = 8;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 8, 8);
    g.strokeStyle = color; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(0, 8); g.lineTo(8, 0); g.moveTo(-2, 2); g.lineTo(2, -2); g.moveTo(6, 10); g.lineTo(10, 6); g.stroke();
    return g.createPattern(c, 'repeat');
  }

  // Dar ekranda uzun konu adlarını satırlara böl (Chart.js dizi etiketlerini çok satır çizer)
  function wrapLabel(text, max) {
    if (text.length <= max) return text;
    const lines = [''];
    for (const w of text.split(' ')) {
      if ((lines.at(-1) + ' ' + w).trim().length > max && lines.at(-1)) lines.push(w);
      else lines[lines.length - 1] = (lines.at(-1) + ' ' + w).trim();
    }
    return lines;
  }

  function miniTable(head, rows) {
    return `<table class="mini-table"><thead><tr>${head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>` +
      rows.map((r) => `<tr><th scope="row">${esc(r[0])}</th>${r.slice(1).map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('') + '</tbody></table>';
  }

  function chartBase() {
    const ink = cssVar('--ink'), muted = cssVar('--muted'), grid = cssVar('--grid');
    const font = { family: getComputedStyle(document.body).getPropertyValue('--font-ui') || 'system-ui', size: state.mode === 'cocuk' ? 14 : 12 };
    return { ink, muted, grid, font };
  }

  function renderCharts() {
    if (!window.Chart) { setTimeout(renderCharts, 60); return; }
    const t = T();
    const { ink, muted, grid, font } = chartBase();
    Chart.defaults.font = font;
    Chart.defaults.color = muted;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Grafik 1: konu başına günlük / haftalık listedeki kitap sayısı (konu ve liste filtresinden bağımsız)
    const b = base();
    const cats = state.data.categories.map((c) => ({
      id: c.id, label: c[state.lang] || c.tr,
      d: b.filter((x) => x.category === c.id && x.daily != null).length,
      w: b.filter((x) => x.category === c.id && x.weekly != null).length,
    })).filter((c) => c.d || c.w).sort((a, z) => z.d - a.d || z.w - a.w);

    const c1 = cssVar('--chart-1'), c2 = cssVar('--chart-2'), surf = cssVar('--surface');
    const sel = state.f.cat;
    const dailyColors = cats.map((c) => (sel && c.id !== sel ? c1 + '55' : c1));
    $('#c1-legend').innerHTML = `<span><i class="legend-solid" aria-hidden="true"></i>${esc(t.legendDaily)}</span><span><i class="legend-hatch" aria-hidden="true"></i>${esc(t.legendWeekly)}</span>`;
    const topD = [...cats].sort((a, z) => z.d - a.d)[0], topW = [...cats].sort((a, z) => z.w - a.w)[0];
    $('#c1-summary').textContent = cats.length ? t.c1sum(topD.label, topD.d, topW.label) : t.noData;
    $('#c1').setAttribute('aria-label', `${t.c1Title}. ${$('#c1-summary').textContent}`);
    $('#c1-table').innerHTML = miniTable([t.colCatShort, t.colDailyN, t.colWeeklyN], cats.map((c) => [c.label, fmtNum(c.d), fmtNum(c.w)]));
    $('#c1').parentElement.style.height = Math.max(220, cats.length * (state.mode === 'cocuk' ? 44 : 36) * ($('#c1').parentElement.clientWidth < 520 ? 1.3 : 1) + 40) + 'px';

    state.charts.c1?.destroy();
    state.charts.c1 = new Chart($('#c1'), {
      type: 'bar',
      data: {
        labels: cats.map((c) => wrapLabel(c.label, $('#c1').parentElement.clientWidth < 520 ? 14 : 40)),
        datasets: [
          { label: t.legendDaily, data: cats.map((c) => c.d), backgroundColor: dailyColors, borderColor: c1, borderWidth: 0, borderRadius: 3 },
          { label: t.legendWeekly, data: cats.map((c) => c.w), backgroundColor: hatch(c2, surf), borderColor: c2, borderWidth: 1.5, borderRadius: 3 },
        ],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: reduce ? false : { duration: 400 },
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: grid } },
          y: { ticks: { color: ink }, grid: { display: false } },
        },
        onClick: (_e, els) => {
          if (!els.length) return;
          const id = cats[els[0].index].id;
          state.f.cat = state.f.cat === id ? '' : id;
          syncForm(); update();
        },
        onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; },
      },
    });

    // Grafik 2: yayın dönemi dağılımı (tüm filtreler uygulanır)
    const rows = filtered();
    const buckets = PERIODS.map(([k]) => ({ k, label: t.periods[k], n: 0 }));
    let unknown = 0;
    for (const r of rows) {
      if (r.year == null) { unknown++; continue; }
      buckets[PERIODS.findIndex(([, test]) => test(r.year))].n++;
    }
    const total = rows.length;
    const top = [...buckets].sort((a, z) => z.n - a.n)[0];
    $('#c2-summary').textContent = total && top.n ? t.c2sum(top.label, fmtPct(top.n / total)) : t.noData;
    $('#c2').setAttribute('aria-label', `${t.c2Title}. ${$('#c2-summary').textContent}`);
    const tableRows = buckets.map((x) => [x.label, fmtNum(x.n), total ? fmtPct(x.n / total) : '—']);
    if (unknown) tableRows.push([t.periods.p7, fmtNum(unknown), fmtPct(unknown / total)]);
    $('#c2-table').innerHTML = miniTable([t.colPeriod, t.colCount, t.colShare], tableRows);

    state.charts.c2?.destroy();
    state.charts.c2 = new Chart($('#c2'), {
      type: 'bar',
      data: { labels: buckets.map((x) => x.label), datasets: [{ label: t.colCount, data: buckets.map((x) => x.n), backgroundColor: buckets.map((x) => (x.k === 'p5' || x.k === 'p6' ? c1 : c2)), borderRadius: 3 }] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: reduce ? false : { duration: 400 },
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: grid } },
          x: { ticks: { color: ink, maxRotation: 45, autoSkip: false }, grid: { display: false } },
        },
      },
    });
    $$('.chart__canvas').forEach((el) => el.classList.add('is-ready'));
  }

  // ---------- Sparkline ----------
  function sparkline(b) {
    const t = T();
    const s = b.series || [];
    const pts = s.map((v, i) => [i, v]).filter(([, v]) => v != null);
    const stLabel = t.st[b.status] || b.status;
    if (!pts.length) {
      return `<svg class="spark" viewBox="0 0 104 34" role="img" aria-label="${esc(t.spark(0, 0, 0, 0, stLabel))}"><line class="sb" x1="2" y1="17" x2="102" y2="17"/></svg>`;
    }
    const vals = pts.map(([, v]) => v);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (hi - lo < 10) { const mid = (hi + lo) / 2; lo = Math.max(1, Math.floor(mid - 5)); hi = lo + 10; }
    const W = 104, H = 34, P = 4, n = Math.max(s.length - 1, 1);
    const x = (i) => P + (i / n) * (W - 2 * P);
    const y = (v) => P + ((v - lo) / (hi - lo)) * (H - 2 * P);  // 1. sıra en üstte
    let d = '', prevI = -2;
    for (const [i, v] of pts) { d += (i === prevI + 1 ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); prevI = i; }
    const lone = pts.filter(([i]) => !pts.some(([j]) => Math.abs(j - i) === 1));
    const [li, lv] = pts[pts.length - 1];
    const label = t.spark(vals[0], vals[vals.length - 1], Math.min(...vals), vals.length, stLabel);
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">` +
      `<line class="sb" x1="${P}" y1="${H - 1}" x2="${W - P}" y2="${H - 1}"/>` +
      `<path class="sl" d="${d}"/>` +
      lone.map(([i, v]) => `<circle class="so" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.5"/>`).join('') +
      `<circle class="sd" cx="${x(li).toFixed(1)}" cy="${y(lv).toFixed(1)}" r="3.2"/></svg>`;
  }

  // ---------- Tablo ----------
  function renderTable(rows) {
    const t = T();
    const all = sorted(rows);
    const visible = all.slice(0, state.shown);
    const maxDays = Math.max(1, ...all.map((b) => b.days));
    const childTag = state.mode !== 'cocuk';

    $('#tbody').innerHTML = visible.map((b) => {
      const st = t.st[b.status] || b.status;
      const daily = b.daily != null ? `<span class="rank">${b.daily}</span>` : `<span class="rank--none">— <span class="sr-only">${esc(t.notInList)}</span></span>`;
      return `<tr>
        <td class="num" data-label="${esc(t.colDaily)}">${daily}</td>
        <td data-label="${esc(t.colTitle)}"><span class="book__title"><a href="https://openlibrary.org/works/${esc(b.id)}" rel="noopener">${esc(b.title)}</a></span><span class="book__author">${esc(b.authors.join(', ') || t.unknown)}</span></td>
        <td data-label="${esc(t.colCat)}"><span class="tag">${esc(catLabel(b.category))}</span>${b.child && childTag ? `<span class="tag tag--child">${esc(t.childTag)}</span>` : ''}</td>
        <td class="num" data-label="${esc(t.colYear)}">${b.year ?? '—'}</td>
        <td data-label="${esc(t.colTrend)}"><span class="trend">${sparkline(b)}<span class="status status--${b.status}"><span aria-hidden="true">${STATUS_ICON[b.status] || ''}</span>${esc(st)}</span></span></td>
        <td data-label="${esc(t.colDays)}"><span class="days"><span class="days__bar" style="width:${Math.round((b.days / maxDays) * 48)}px" aria-hidden="true"></span>${esc(t.days(b.days))}</span></td>
        <td class="num" data-label="${esc(t.colWeekly)}">${b.weekly ?? '—'}</td>
        <td class="num" data-label="${esc(t.colEd)}">${fmtNum(b.editions)}</td>
        <td data-label="${esc(t.colTr)}">${b.tr === true ? `<span class="trflag trflag--yes"><span aria-hidden="true">✓</span> ${esc(t.trYes)}</span>` : b.tr === false ? `<span class="trflag">${esc(t.trNo)}</span>` : '—'}</td>
      </tr>`;
    }).join('');

    const empty = all.length === 0;
    $('#empty').hidden = !empty;
    $('.table-scroll').hidden = empty;
    const rest = all.length - visible.length;
    const more = $('#more');
    more.hidden = rest <= 0;
    more.textContent = t.more(Math.min(rest, PAGE));

    $('#result-count').textContent = t.count(all.length, state.data.books.length);
    $$('.books th').forEach((th) => th.setAttribute('aria-sort', th.dataset.key === state.sort.key ? (state.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'));
    const thName = $(`.books th[data-key="${state.sort.key}"] [data-i18n]`)?.textContent || '';
    $('#t-caption').textContent = t.caption(all.length) + thName;
  }

  function renderStatusHelp() {
    const t = T();
    $('#status-help').innerHTML = Object.keys(t.st).map((k) =>
      `<li><span class="status status--${k}"><span aria-hidden="true">${STATUS_ICON[k]}</span>${esc(t.st[k])}</span><span>${esc(t.stHelp[k])}</span></li>`).join('');
  }

  // ---------- Form ve olaylar ----------
  function syncForm() {
    const f = state.f;
    $('#f-list').value = f.list; $('#f-cat').value = f.cat;
    $('#f-ymin').value = f.ymin ?? ''; $('#f-ymax').value = f.ymax ?? '';
    $('#f-q').value = f.q; $('#f-stay').checked = f.stay; $('#f-tr').checked = !!f.tr;
    $$('.quick .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.range === rangeKey())));
  }
  const rangeKey = () => `${state.f.ymin ?? ''}-${state.f.ymax ?? ''}`.replace(/^-$/, '');

  function readForm() {
    const num = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };
    state.f = {
      list: $('#f-list').value, cat: $('#f-cat').value,
      ymin: num($('#f-ymin').value), ymax: num($('#f-ymax').value),
      q: $('#f-q').value.trim(), stay: $('#f-stay').checked, tr: $('#f-tr').checked,
    };
  }

  function update() {
    state.shown = PAGE;
    const rows = filtered();
    renderKPIs(rows);
    renderCharts();
    renderTable(rows);
    $$('.quick .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.range === rangeKey())));
  }

  function addSortSelect() {
    const head = $('.table-head');
    const wrap = document.createElement('div');
    wrap.className = 'sort-mobile field';
    wrap.innerHTML = `<label for="sort-select"></label><select id="sort-select"></select>`;
    head.appendChild(wrap);
    $('#sort-select').addEventListener('change', (e) => {
      const [key, dir] = e.target.value.split(':');
      state.sort = { key, dir }; renderTable(filtered());
    });
  }
  function syncSortSelect() {
    const t = T();
    $('label[for="sort-select"]').textContent = t.sortBy;
    const keys = $$('.books th').map((th) => [th.dataset.key, th.querySelector('[data-i18n]').textContent]);
    const up = state.lang === 'en' ? 'ascending' : 'artan', down = state.lang === 'en' ? 'descending' : 'azalan';
    $('#sort-select').innerHTML = keys.flatMap(([k, l]) => [`<option value="${k}:asc">${esc(l)} (${up})</option>`, `<option value="${k}:desc">${esc(l)} (${down})</option>`]).join('');
    $('#sort-select').value = `${state.sort.key}:${state.sort.dir}`;
  }

  function bind() {
    let qTimer;
    $('#filters').addEventListener('input', (e) => {
      if (e.target.id === 'f-q') { clearTimeout(qTimer); qTimer = setTimeout(() => { readForm(); update(); }, 200); return; }
      if (e.target.type === 'number') { clearTimeout(qTimer); qTimer = setTimeout(() => { readForm(); update(); }, 350); return; }
    });
    $('#filters').addEventListener('change', (e) => { if (e.target.id !== 'f-q') { readForm(); update(); } });
    $('#filters').addEventListener('submit', (e) => e.preventDefault());
    $('#filters').addEventListener('reset', (e) => { e.preventDefault(); resetFilters(); });
    $('#empty-reset').addEventListener('click', () => { resetFilters(); $('#f-list').focus(); });
    $$('.quick .chip').forEach((c) => c.addEventListener('click', () => {
      const [a, b] = c.dataset.range.split('-');
      const same = c.getAttribute('aria-pressed') === 'true';
      state.f.ymin = same || !a ? null : +a;
      state.f.ymax = same || !b ? null : +b;
      syncForm(); update();
    }));

    $$('.books th button').forEach((btn) => btn.addEventListener('click', () => {
      const key = btn.parentElement.dataset.key;
      const textual = key === 'title' || key === 'category';
      const defaultDir = ['days', 'editions', 'year'].includes(key) ? 'desc' : 'asc';
      state.sort = state.sort.key === key ? { key, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: textual ? 'asc' : defaultDir };
      renderTable(filtered());
      syncSortSelect();
    }));
    $('#more').addEventListener('click', () => {
      const firstNew = state.shown;
      state.shown += PAGE; renderTable(filtered());
      $$('#tbody tr')[firstNew]?.querySelector('a')?.focus();
    });

    $$('.toggles [data-mode]').forEach((b) => b.addEventListener('click', () => {
      state.mode = b.dataset.mode; savePrefs(); state.shown = PAGE;
      if (state.data) renderAll(); else applyI18n();
    }));
    $$('[data-lang]').forEach((b) => b.addEventListener('click', () => {
      state.lang = b.dataset.lang; savePrefs();
      if (state.data) { setupCategories(); renderAll(); } else applyI18n();
    }));
    $('#retry').addEventListener('click', load);
    let rTimer, lastW = innerWidth;
    addEventListener('resize', () => {
      if (!state.data || Math.abs(innerWidth - lastW) < 40) return;
      clearTimeout(rTimer); rTimer = setTimeout(() => { lastW = innerWidth; renderCharts(); }, 250);
    });
    addEventListener('online', () => { if (state.stale === 'net') load(); });
    addEventListener('offline', () => { if (state.data && !state.stale) { state.stale = 'net'; renderNotice(); } });
  }

  function resetFilters() {
    state.f = { list: 'daily', cat: '', ymin: null, ymax: null, q: '', stay: false, tr: false };
    syncForm(); update();
  }

  // ---------- Başlat ----------
  function init() {
    const repo = document.querySelector('meta[name="repo"]')?.content;
    if (repo) $('#repo-link').href = repo;
    $('.quick [data-range="2016-"]')?.setAttribute('data-range', `${RECENT_FROM}-`);
    addSortSelect();
    bind();
    applyI18n();
    syncForm();
    load();
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
