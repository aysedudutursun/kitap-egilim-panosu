#!/usr/bin/env bash
# Yedek al: data/ klasörünü (snapshot'lar + üretilmiş dosyalar) arşivler, SHA-256 özeti ve manifest üretir.
# Kullanım: scripts/dr/yedek-al.sh <çıktı-klasörü>
# Çıktı: veri.tar.gz · veri.tar.gz.sha256 · manifest.json
set -euo pipefail
OUT="${1:?çıktı klasörü gerekli}"
mkdir -p "$OUT"

[ -d data/snapshots ] || { echo "data/snapshots yok; yedeklenecek veri bulunamadı" >&2; exit 1; }
ADET=$(find data/snapshots -name '*.json' | wc -l)
[ "$ADET" -gt 0 ] || { echo "Hiç snapshot yok" >&2; exit 1; }

tar -czf "$OUT/veri.tar.gz" data/
( cd "$OUT" && sha256sum veri.tar.gz > veri.tar.gz.sha256 )

python3 - "$OUT" <<'PY'
import json, os, sys, datetime
out = sys.argv[1]
snaps = sorted(f for f in os.listdir('data/snapshots') if f.endswith('.json'))
newest = json.load(open(os.path.join('data/snapshots', snaps[-1]), encoding='utf-8'))
latest = json.load(open('data/latest.json', encoding='utf-8')) if os.path.exists('data/latest.json') else {}
manifest = {
    "olusturma_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
    "kaynak_commit": os.environ.get("GITHUB_SHA", "yerel"),
    "snapshot_sayisi": len(snaps),
    "snapshot_dosyalari": snaps,
    "en_yeni_veri_utc": newest.get("fetched_at"),
    "latest_data_at": latest.get("data_at"),
    "sha256": open(os.path.join(out, "veri.tar.gz.sha256")).read().split()[0],
}
json.dump(manifest, open(os.path.join(out, "manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"Yedek hazır: {len(snaps)} snapshot, en yeni veri {manifest['en_yeni_veri_utc']}")
PY
