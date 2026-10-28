// Panoda kullanılan konu grupları.
// slug: Open Library /subjects/{slug}.json ucu
// kw:   eserin ham konu etiketlerinde aranan anahtar kelimeler
// Sıra önemlidir: ilk eşleşen grup kazanır (ör. "science fiction" bilim değil bilimkurgudur).
export const CATEGORIES = [
  { id: 'cocuk',      tr: 'Çocuk ve gençlik',  en: 'Children & YA',      slug: 'juvenile_fiction',
    kw: ['juvenile', 'children', "children's", 'picture book', 'young adult', 'fairy tale', 'nursery'] },
  { id: 'polisiye',   tr: 'Polisiye ve gerilim', en: 'Mystery & thriller', slug: 'mystery_and_detective_stories',
    kw: ['mystery', 'detective', 'crime', 'thriller', 'suspense', 'murder'] },
  { id: 'fantastik',  tr: 'Fantastik',         en: 'Fantasy',            slug: 'fantasy',
    kw: ['fantasy', 'magic', 'dragons', 'wizards', 'witches'] },
  { id: 'bilimkurgu', tr: 'Bilimkurgu',        en: 'Science fiction',    slug: 'science_fiction',
    kw: ['science fiction', 'dystopia', 'dystopias', 'space opera', 'time travel'] },
  { id: 'romantik',   tr: 'Romantik',          en: 'Romance',            slug: 'romance',
    kw: ['romance', 'love stories', 'love story'] },
  { id: 'klasik',     tr: 'Klasikler',         en: 'Classics',           slug: 'classic_literature',
    kw: ['classic literature', 'classics', 'english literature', 'russian literature', 'american literature'] },
  { id: 'biyografi',  tr: 'Biyografi ve anı',  en: 'Biography & memoir', slug: 'biography',
    kw: ['biography', 'autobiography', 'memoir', 'memoirs'] },
  { id: 'tarih',      tr: 'Tarih',             en: 'History',            slug: 'history',
    kw: ['history', 'world war', 'civilization', 'ancient'] },
  { id: 'kisisel',    tr: 'Kişisel gelişim ve psikoloji', en: 'Self-help & psychology', slug: 'self-help',
    kw: ['self-help', 'self help', 'success', 'personal development', 'self-actualization', 'habit', 'psychology', 'motivation'] },
  { id: 'bilim',      tr: 'Bilim ve doğa',     en: 'Science & nature',   slug: 'science',
    kw: ['science', 'physics', 'biology', 'mathematics', 'astronomy', 'nature', 'evolution', 'chemistry'] },
  { id: 'felsefe',    tr: 'Felsefe ve din',    en: 'Philosophy & religion', slug: 'philosophy',
    kw: ['philosophy', 'religion', 'ethics', 'theology', 'spirituality'] },
  { id: 'kurgu',      tr: 'Genel kurgu',       en: 'General fiction',    slug: 'fiction',
    kw: ['fiction', 'novel', 'novels', 'short stories'] },
];

export const OTHER = { id: 'diger', tr: 'Diğer', en: 'Other' };

const CHILD_KW = ['juvenile', 'children', "children's", 'picture book', 'young adult', 'nursery', 'fairy tale'];

/** Ham konu listesinden konu grubunu ve çocuk uygunluğunu çıkarır. */
export function classify(subjects = [], memberOf = []) {
  const s = subjects.map((x) => String(x).toLowerCase());
  const child = s.some((x) => CHILD_KW.some((k) => x.includes(k)));
  // 1) Konu ucunun listesinde açıkça yer alıyorsa o grubu kullan (CATEGORIES sırasına göre).
  for (const c of CATEGORIES) if (memberOf.includes(c.id)) return { category: c.id, child: child || c.id === 'cocuk' };
  // 2) Aksi halde anahtar kelime eşleşmesi.
  for (const c of CATEGORIES) {
    if (s.some((x) => c.kw.some((k) => x.includes(k)))) return { category: c.id, child: child || c.id === 'cocuk' };
  }
  return { category: OTHER.id, child };
}
