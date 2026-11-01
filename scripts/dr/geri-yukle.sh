#!/usr/bin/env bash
# Otomatik geri yükleme: en yeni (ya da verilen) yedeği GitHub Releases'tan indirir,
# SHA-256 ile bütünlüğünü doğrular ve data/ klasörünü geri kurar.
# Kullanım: scripts/dr/geri-yukle.sh [yedek-etiketi]
# Gerekenler: gh (GH_TOKEN), tar, sha256sum, python3. Commit/push yapmaz; onu çağıran iş akışı yapar.
set -euo pipefail
REPO="${GITHUB_REPOSITORY:-aysedudutursun/kitap-egilim-panosu}"

TAG="${1:-}"
if [ -z "$TAG" ]; then
  # Sürümler en yeniden eskiye sıralı gelir; ilk "yedek-" etiketlisi en yeni yedektir.
  TAG=$(gh api "repos/$REPO/releases?per_page=100" --jq '[.[] | select(.tag_name | startswith("yedek-"))][0].tag_name')
fi
[ -n "$TAG" ] && [ "$TAG" != "null" ] || { echo "Yedek bulunamadı" >&2; exit 1; }
echo "Kullanılan yedek: $TAG"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
gh release download "$TAG" -R "$REPO" -D "$TMP" -p 'veri.tar.gz' -p 'veri.tar.gz.sha256' -p 'manifest.json'

# 1) Bütünlük: arşiv bozuk ya da değiştirilmişse geri yükleme yapılmaz.
( cd "$TMP" && sha256sum -c veri.tar.gz.sha256 )

# 2) Arşiv yalnızca data/ altında dosya içermeli (yol geçişi saldırısına karşı).
if tar -tzf "$TMP/veri.tar.gz" | grep -vE '^data(/|$)' | grep -q .; then
  echo "Arşivde data/ dışında yol var; reddedildi" >&2; exit 1
fi
if tar -tzf "$TMP/veri.tar.gz" | grep -q '\.\.'; then
  echo "Arşivde '..' içeren yol var; reddedildi" >&2; exit 1
fi

# 3) Geri kur
rm -rf data/snapshots data/latest.json data/works.json data/status.json
tar -xzf "$TMP/veri.tar.gz" -C .

# 4) Doğrula: snapshot sayısı manifestle aynı mı?
python3 - "$TMP/manifest.json" <<'PY'
import json, os, sys
m = json.load(open(sys.argv[1], encoding='utf-8'))
snaps = sorted(f for f in os.listdir('data/snapshots') if f.endswith('.json'))
assert snaps == m["snapshot_dosyalari"], "Snapshot listesi manifestle uyuşmuyor"
assert os.path.exists('data/latest.json'), "latest.json geri gelmedi"
print(f"Doğrulandı: {len(snaps)} snapshot, en yeni veri {m['en_yeni_veri_utc']}")
PY
cp "$TMP/manifest.json" "${GERI_YUKLEME_MANIFEST:-/dev/null}" 2>/dev/null || true
echo "yedek_etiketi=$TAG"
