// Open Library'den günlük/haftalık trend listelerini ve konu uçlarını çeker,
// zaman damgalı bir anlık görüntü (snapshot) olarak data/snapshots/ altına yazar.
// GitHub Actions tarafından zamanlanmış olarak çalıştırılır (bkz. .github/workflows/veri-cek.yml).
//
// Hız sınırı: istekler arasında en az 1,1 sn beklenir; eser ayrıntıları önbelleğe
// alınır (data/works.json), aynı eser için ikinci kez istek atılmaz.
// API anahtarı gerekmez.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { CATEGORIES, classify } from './categories.mjs';

const BASE = process.env.OL_BASE || 'https://openlibrary.org';
const DATA = process.env.DATA_DIR ? new URL(`file://${process.env.DATA_DIR}/`) : new URL('../data/', import.meta.url);
const REPO = process.env.GITHUB_REPOSITORY || 'kitap-egilim-panosu';
const UA = `KitapEgilimPanosu/1.0 (ogrenci projesi; +https://github.com/${REPO})`;
const LIMIT = 100;
const GAP_MS = Number(process.env.GAP_MS ?? 1100);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastCall = 0;

async function getJSON(path, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    const wait = lastCall + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    try {
      const res = await fetch(BASE + path, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        signal: AbortSignal.timeout(30000),
      });
      if (res.status === 429) { await sleep(10000 * i); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`);
      return await res.json();
    } catch (err) {
      if (i === tries) throw err;
      await sleep(3000 * i);
    }
  }
  throw new Error(`Yanıt alınamadı: ${path}`);
}

async function readJSON(url, fallback) {
  if (!existsSync(url)) return fallback;
  try { return JSON.parse(await readFile(url, 'utf8')); } catch { return fallback; }
}

const nfc = (x) => (x == null ? x : String(x).normalize('NFC').trim());
const workId = (key) => String(key || '').replace('/works/', '');

async function main() {
  const startedAt = process.env.FAKE_NOW ? new Date(process.env.FAKE_NOW) : new Date(); // FAKE_NOW yalnızca testler için
  await mkdir(new URL('snapshots/', DATA), { recursive: true });
  const works = await readJSON(new URL('works.json', DATA), {});

  // 1) Trend listeleri
  const periods = {};
  for (const period of ['daily', 'weekly']) {
    const json = await getJSON(`/trending/${period}.json?limit=${LIMIT}`);
    const list = (json.works || []).filter((w) => w && w.key);
    if (!list.length) throw new Error(`${period} listesi boş döndü`);
    periods[period] = list.map((w, i) => {
      const id = workId(w.key);
      const prev = works[id] || {};
      works[id] = {
        ...prev,
        title: nfc(w.title) || prev.title || '(başlıksız)',
        authors: [...new Set((w.author_name || prev.authors || []).map(nfc))].slice(0, 3),
        year: w.first_publish_year ?? prev.year ?? null,
        editions: w.edition_count ?? prev.editions ?? null,
        // Türkçe baskısı var mı: ilçe kütüphanesi için doğrudan satın alma sinyali
        tr: Array.isArray(w.language) ? w.language.includes('tur') : (prev.tr ?? null),
      };
      return { id, rank: i + 1 };
    });
  }

  // 2) Konu (subjects) uçları: toplam eser sayısı + üye eserler
  const subjects = {};
  const membership = {};
  for (const c of CATEGORIES) {
    try {
      const json = await getJSON(`/subjects/${c.slug}.json?limit=50`);
      subjects[c.id] = { work_count: json.work_count ?? null };
      for (const w of json.works || []) {
        const id = workId(w.key);
        (membership[id] ||= []).push(c.id);
      }
    } catch (err) {
      subjects[c.id] = { work_count: null, error: String(err.message || err) };
    }
  }

  // 3) Konu etiketi bilinmeyen yeni eserler (yalnızca bir kez).
  // Trend yanıtında "subject" alanı yok. Eser başına /works/{id}.json yerine search.json ile
  // 50'şerlik toplu sorgu: 100 yeni eser için 100 değil 2 istek (hız sınırına saygı).
  const needDetail = Object.keys(works).filter((id) => !works[id].tagged);
  const tags = {};
  for (let i = 0; i < needDetail.length; i += 50) {
    const batch = needDetail.slice(i, i + 50);
    const q = `key:(${batch.map((id) => `/works/${id}`).join(' OR ')})`;
    try {
      const json = await getJSON(`/search.json?q=${encodeURIComponent(q)}&fields=key,subject,first_publish_year&limit=50`);
      for (const d of json.docs || []) {
        const id = workId(d.key);
        if (!works[id]) continue;
        tags[id] = d.subject || []; // ham etiketler depoya yazılmaz (eser başına 100+ etiket); yalnızca sonuç saklanır
        works[id].year ??= d.first_publish_year ?? null;
      }
      for (const id of batch) { tags[id] ??= []; works[id].tagged = true; }
    } catch (err) {
      console.warn('Konu etiketleri alınamadı, sonraki çalıştırmada tekrar denenecek:', err.message);
    }
  }

  // 4) Sınıflandırma
  // Yeni etiketlenen eserler sınıflandırılır; eskiler için yalnızca konu ucu listesi (güçlü sinyal) değişiklik yapabilir.
  for (const [id, w] of Object.entries(works)) {
    if (tags[id]) Object.assign(w, classify(tags[id], membership[id] || []), { tag_count: tags[id].length });
    else if ((membership[id] || []).some((c) => c !== 'kurgu')) Object.assign(w, classify([], membership[id]));
    delete w.cover; delete w.subjects; // kapak görseli (telif) ve ham etiketler saklanmaz
  }

  const snapshot = {
    fetched_at: startedAt.toISOString(),
    source: BASE,
    periods,
    subjects,
  };
  const stamp = startedAt.toISOString().slice(0, 13).replace(':', '-'); // 2026-10-28T06
  await writeFile(new URL(`snapshots/${stamp}.json`, DATA), JSON.stringify(snapshot));
  await writeFile(new URL('works.json', DATA), JSON.stringify(works));
  console.log(`Snapshot yazıldı: ${stamp} · günlük ${periods.daily.length}, haftalık ${periods.weekly.length}, eser önbelleği ${Object.keys(works).length}`);
}

main()
  .then(() => writeFile(new URL('status.json', DATA), JSON.stringify({ ok: true, last_attempt: new Date().toISOString() })))
  .catch(async (err) => {
    console.error('Veri çekimi başarısız:', err);
    // Son başarılı veri (latest.json) korunur; yalnızca durum dosyası güncellenir.
    await writeFile(new URL('status.json', DATA), JSON.stringify({
      ok: false, last_attempt: new Date().toISOString(), error: String(err.message || err),
    }));
    process.exitCode = 2;
  });
