#!/usr/bin/env bash
# Cloudflare derleme adımı (wrangler.jsonc → build.command): yalnızca yayınlanacak dosyaları _site klasörüne kopyalar.
# Yayınlanan klasör: _site (wrangler.jsonc → assets.directory)
# Not: data/ silinmişse (felaket senaryosu) site verisiz yayınlanır; kesinti böylece canlıda görünür ve ölçülebilir.
set -euo pipefail
rm -rf _site
mkdir -p _site
for oge in index.html vaka-calismasi.html manifest.webmanifest sw.js _headers css js fonts vendor icons docs; do
  cp -r "$oge" _site/
done
if [ -d data ]; then cp -r data _site/; else echo "UYARI: data/ yok — site verisiz yayınlanıyor"; fi
rm -rf _site/data/snapshots   # ham snapshot'lar yedekte ve depoda tutulur, siteye gerekmez
rm -rf _site/docs/guvenlik    # tarama raporları depoda kanıt olarak durur, siteye gerekmez
echo "Yayın klasörü hazır: $(find _site -type f | wc -l) dosya"
