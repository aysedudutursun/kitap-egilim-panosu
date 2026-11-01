#!/usr/bin/env bash
# Cloudflare Pages derleme adımı: yalnızca yayınlanacak dosyaları _site klasörüne kopyalar.
# Pages ayarı → Build command: bash scripts/pages-build.sh   ·   Output directory: _site
set -euo pipefail
rm -rf _site
mkdir -p _site
cp -r index.html vaka-calismasi.html manifest.webmanifest sw.js _headers css js fonts vendor icons data docs _site/
rm -rf _site/data/snapshots   # ham snapshot'lar R2'de ve depoda tutulur, siteye gerekmez
rm -rf _site/docs/guvenlik    # tarama raporları depoda kanıt olarak durur, siteye gerekmez
echo "Yayın klasörü hazır: $(find _site -type f | wc -l) dosya"
