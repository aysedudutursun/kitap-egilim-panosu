// Panoda kullanılan konu grupları.
// slug: Open Library /subjects/{slug}.json ucu
// kw:   eserin ham konu etiketlerinde aranan anahtar kelimeler
// not:  bu ifadeyi içeren etiket o grup için sayılmaz (ör. "history and criticism" tarih kitabı değildir)
//
// Gerçek veriyle (29 Eki 2026, günlük trend ilk 200) görülen durum: bir eserde 20–200 arası,
// birçok dilde, gürültülü etiket var. Bu yüzden "ilk eşleşen kazanır" yerine her grup için
// eşleşen etiket SAYISI puanlanır; en yüksek puanlı grup seçilir (eşitlikte listedeki sıra).
export const CATEGORIES = [
  { id: 'cocuk',      tr: 'Çocuk ve gençlik',  en: 'Children & YA',      slug: 'juvenile_fiction',
    kw: ['juvenile', 'children', 'picture book', 'young adult', 'nursery', 'jeunesse', 'infantil'] },
  { id: 'polisiye',   tr: 'Polisiye ve gerilim', en: 'Mystery & thriller', slug: 'mystery_and_detective_stories',
    kw: ['mystery', 'mysteries', 'detective', 'crime', 'thriller', 'suspense', 'murder'] },
  { id: 'fantastik',  tr: 'Fantastik',         en: 'Fantasy',            slug: 'fantasy',
    kw: ['fantasy', 'magic', 'dragons', 'wizards', 'witches', 'fantastique'] },
  { id: 'bilimkurgu', tr: 'Bilimkurgu',        en: 'Science fiction',    slug: 'science_fiction',
    kw: ['science fiction', 'dystopia', 'space opera', 'time travel'] },
  { id: 'romantik',   tr: 'Romantik',          en: 'Romance',            slug: 'romance',
    kw: ['romance', 'love stories', 'love story', 'romantic'] },
  { id: 'klasik',     tr: 'Klasikler',         en: 'Classics',           slug: 'classic_literature',
    kw: ['classic literature', 'classics', 'fiction classics'] },
  { id: 'biyografi',  tr: 'Biyografi ve anı',  en: 'Biography & memoir', slug: 'biography',
    kw: ['biography', 'autobiography', 'memoir'] },
  { id: 'tarih',      tr: 'Tarih',             en: 'History',            slug: 'history',
    kw: ['history', 'world war', 'civilization', 'historical fiction'], not: ['criticism', 'interpretation'] },
  { id: 'kisisel',    tr: 'Kişisel gelişim ve psikoloji', en: 'Self-help & psychology', slug: 'self-help',
    kw: ['self-help', 'self help', 'success', 'personal development', 'self-actualization', 'habit', 'psychology', 'motivation', 'conduct of life', 'happiness'] },
  { id: 'bilim',      tr: 'Bilim ve doğa',     en: 'Science & nature',   slug: 'science',
    kw: ['science', 'physics', 'biology', 'mathematics', 'astronomy', 'nature', 'evolution', 'chemistry'], not: ['fiction'] },
  { id: 'felsefe',    tr: 'Felsefe ve din',    en: 'Philosophy & religion', slug: 'philosophy',
    kw: ['philosophy', 'religion', 'ethics', 'theology', 'spirituality', 'stoic'] },
  { id: 'kurgu',      tr: 'Genel kurgu',       en: 'General fiction',    slug: 'fiction',
    kw: ['fiction', 'novel', 'short stories'] },
];

export const OTHER = { id: 'diger', tr: 'Diğer', en: 'Other' };

const CHILD = CATEGORIES[0];
const hits = (subs, c) => subs.filter((x) => c.kw.some((k) => x.includes(k)) && !(c.not || []).some((n) => x.includes(n))).length;

/**
 * Ham konu listesinden konu grubunu ve çocuk uygunluğunu çıkarır.
 * memberOf: eserin göründüğü /subjects/{slug} listeleri (konu ucundan gelen güçlü sinyal).
 */
export function classify(subjects = [], memberOf = []) {
  const s = subjects.map((x) => String(x).toLowerCase());
  // Çocuk: klasiklerin okul baskıları da "juvenile" etiketi taşıyor (Wuthering Heights 120 etiketin 3'ü).
  // Bu yüzden hem mutlak sayı hem oran eşiği aranır.
  const c = hits(s, CHILD);
  const ratio = s.length ? c / s.length : 0;
  // juvenile_fiction konu ucunun ilk 50'si bile Jane Eyre gibi klasikleri içeriyor; orada da asgari oran aranır.
  const child = (memberOf.includes('cocuk') && c >= 2 && ratio >= 0.03) || (c >= 4 && ratio >= 0.05) || (c >= 2 && ratio >= 0.12);
  if (child) return { category: 'cocuk', child: true };

  // Konu ucunun listesinde açıkça yer alıyorsa o grubu kullan (CATEGORIES sırasına göre).
  // ("fiction" ucu çok geniş olduğu için güçlü sinyal sayılmaz.)
  for (const cat of CATEGORIES) if (cat.id !== 'cocuk' && cat.id !== 'kurgu' && memberOf.includes(cat.id)) return { category: cat.id, child: false };

  // Puanlama: "Genel kurgu" yalnızca başka hiçbir grup eşleşmezse.
  let best = null, bestScore = 0;
  for (const cat of CATEGORIES) {
    if (cat.id === 'cocuk' || cat.id === 'kurgu') continue;
    const n = hits(s, cat);
    if (n > bestScore) { best = cat.id; bestScore = n; }
  }
  if (best) return { category: best, child: false };
  if (hits(s, CATEGORIES.at(-1)) > 0) return { category: 'kurgu', child: false };
  return { category: OTHER.id, child: false };
}
