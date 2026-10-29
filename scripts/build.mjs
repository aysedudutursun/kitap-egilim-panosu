// Biriken snapshot'lardan arayüzün okuduğu tek dosyayı (data/latest.json) üretir.
// Hesaplananlar: her kitabın sıra geçmişi (sparkline), trend listesinde kaldığı gün sayısı,
// durum (yeni / yükseliyor / düşüyor / sabit / listeden çıktı) ve konu uçlarının eser sayısı serisi.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { CATEGORIES, OTHER } from './categories.mjs';

const DATA = process.env.DATA_DIR ? new URL(`file://${process.env.DATA_DIR}/`) : new URL('../data/', import.meta.url);
const SERIES_POINTS = 28;   // sparkline'da gösterilen son ölçüm sayısı (6 saatte bir → ~7 gün)
const RECENT_DAYS = 7;      // listeden çıkan kitaplar bu kadar gün tabloda kalır
const MOVE = 3;             // "yükseliyor/düşüyor" için gereken en az sıra değişimi

// Gün sayımı kütüphanenin saat dilimine göre yapılır.
const dayOf = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date(iso));

async function main() {
  const files = (await readdir(new URL('snapshots/', DATA))).filter((f) => f.endsWith('.json')).sort();
  if (!files.length) throw new Error('Hiç snapshot yok; önce scripts/fetch.mjs çalıştırılmalı.');
  const snaps = [];
  for (const f of files) {
    try { snaps.push(JSON.parse(await readFile(new URL(`snapshots/${f}`, DATA), 'utf8'))); } catch { /* bozuk dosya atlanır */ }
  }
  snaps.sort((a, b) => a.fetched_at.localeCompare(b.fetched_at));
  const works = JSON.parse(await readFile(new URL('works.json', DATA), 'utf8'));
  const last = snaps.at(-1);

  // Her snapshot için id → sıra haritaları
  const rankMaps = snaps.map((s) => ({
    t: s.fetched_at,
    day: dayOf(s.fetched_at),
    daily: new Map((s.periods.daily || []).map((x) => [x.id, x.rank])),
    weekly: new Map((s.periods.weekly || []).map((x) => [x.id, x.rank])),
  }));
  const lastMap = rankMaps.at(-1);

  // Karşılaştırma noktası: son ölçümden ~24 saat önceki ölçüm (yoksa bir önceki)
  const dayAgo = Date.parse(last.fetched_at) - 20 * 3600 * 1000;
  let cmp = null;
  for (let i = rankMaps.length - 2; i >= 0; i--) {
    cmp = rankMaps[i];
    if (Date.parse(rankMaps[i].t) <= dayAgo) break;
  }

  // Tabloya girecek kitaplar
  const cutoff = Date.parse(last.fetched_at) - RECENT_DAYS * 86400000;
  const ids = new Set([...lastMap.daily.keys(), ...lastMap.weekly.keys()]);
  for (const r of rankMaps) if (Date.parse(r.t) >= cutoff) for (const id of r.daily.keys()) ids.add(id);

  const window = rankMaps.slice(-SERIES_POINTS);
  const books = [];
  for (const id of ids) {
    const w = works[id] || {};
    const days = new Set(), weekDays = new Set();
    let firstSeen = null;
    for (const r of rankMaps) {
      if (r.daily.has(id)) { days.add(r.day); firstSeen ??= r.t; }
      if (r.weekly.has(id)) weekDays.add(r.day);
    }
    const daily = lastMap.daily.get(id) ?? null;
    const prev = cmp ? cmp.daily.get(id) ?? null : null;
    let status;
    if (snaps.length === 1) status = daily ? 'ilk' : 'haftalik';
    else if (daily == null) status = lastMap.weekly.has(id) ? 'haftalik' : 'cikti';
    else if (firstSeen === last.fetched_at || prev == null) status = 'yeni';
    else if (prev - daily >= MOVE) status = 'yukseliyor';
    else if (daily - prev >= MOVE) status = 'dusuyor';
    else status = 'sabit';

    books.push({
      id,
      title: w.title || id,
      authors: w.authors || [],
      year: w.year ?? null,
      editions: w.editions ?? null,
      category: w.category || OTHER.id,
      child: !!w.child,
      tr: w.tr ?? null,
      daily,
      weekly: lastMap.weekly.get(id) ?? null,
      prev,
      days: days.size,
      week_days: weekDays.size,
      first_seen: firstSeen,
      status,
      series: window.map((r) => r.daily.get(id) ?? null),
    });
  }
  books.sort((a, b) => (a.daily ?? 999) - (b.daily ?? 999) || (a.weekly ?? 999) - (b.weekly ?? 999));

  const categories = [...CATEGORIES, OTHER].map((c) => ({
    id: c.id, tr: c.tr, en: c.en, slug: c.slug || null,
    work_count: last.subjects?.[c.id]?.work_count ?? null,
    work_count_series: c.slug ? snaps.map((s) => ({ t: s.fetched_at, v: s.subjects?.[c.id]?.work_count ?? null })).filter((p) => p.v != null).slice(-60) : [],
  }));

  const out = {
    schema: 1,
    generated_at: new Date().toISOString(),
    data_at: last.fetched_at,
    source: { name: 'Open Library', url: 'https://openlibrary.org/trending/daily', license: 'https://openlibrary.org/developers/licensing' },
    snapshot_count: snaps.length,
    first_snapshot_at: snaps[0].fetched_at,
    days_tracked: new Set(rankMaps.map((r) => r.day)).size,
    series_times: window.map((r) => r.t),
    compare_at: cmp?.t ?? null,
    categories,
    books,
  };
  await writeFile(new URL('latest.json', DATA), JSON.stringify(out));
  console.log(`latest.json: ${books.length} kitap, ${snaps.length} snapshot, ${out.days_tracked} gün`);
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
