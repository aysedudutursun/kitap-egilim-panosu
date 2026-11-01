#!/usr/bin/env bash
# Cloudflare derleme adımı (wrangler.jsonc → build.command): yalnızca yayınlanacak dosyaları _site klasörüne kopyalar.
# Yayınlanan klasör: _site (wrangler.jsonc → assets.directory)
set -euo pipefail
rm -rf _site
mkdir -p _site
cp -r index.html vaka-calismasi.html manifest.webmanifest sw.js _headers css js fonts vendor icons data docs _site/
rm -rf _site/data/snapshots   # ham snapshot'lar R2'de ve depoda tutulur, siteye gerekmez
rm -rf _site/docs/guvenlik    # tarama raporları depoda kanıt olarak durur, siteye gerekmez
echo "Yayın klasörü hazır: $(find _site -type f | wc -l) dosya"
