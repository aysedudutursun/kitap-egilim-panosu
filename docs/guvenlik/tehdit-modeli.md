# Okuma Pusulası — Tehdit Modeli (STRIDE)

Kapsam: canlı veri ürünü "Okuma Pusulası"nın veri hattı, depo, yayın ve tarayıcı tarafı.
Canlı adres: https://kitap-egilim-panosu.tayse1482.workers.dev

## Veri akış diyagramı (DFD)

Kesikli çerçeveler güven sınırlarıdır (GS). Diyagramın görseli: `dfd.png` (kaynak: `dfd.mmd`).

| Öğe | Tür | Açıklama |
|---|---|---|
| Open Library API | Dış varlık | Trend ve kitap verisinin kaynağı (HTTPS, anahtarsız) |
| Veri çek iş akışı | Süreç | GitHub Actions, 6 saatte bir: `scripts/fetch.mjs` + `build.mjs` |
| GitHub deposu | Veri deposu | Kod + `data/` (snapshot'lar, latest.json); git geçmişi = sürümleme |
| Cloudflare derleme | Süreç | Cloudflare GitHub uygulaması depoyu çeker, `_site` klasörünü üretir |
| Cloudflare kenar ağı | Süreç | Statik dosyaları güvenlik başlıklarıyla sunar |
| Tarayıcı + service worker | Süreç / veri deposu | Panoyu çizer; son başarılı veriyi önbellekte ve localStorage'da tutar |
| Geliştirici | Dış varlık | Kod değişikliklerini depoya gönderir |
| Ziyaretçi | Dış varlık | Kütüphaneci / herhangi bir internet kullanıcısı |

Güven sınırları:
- **GS1** İnternet ↔ GitHub Actions (dış API yanıtı güvenilmez veridir)
- **GS2** GitHub ↔ Cloudflare (yayın için depo erişimi)
- **GS3** Cloudflare ↔ Ziyaretçi tarayıcısı (herkese açık internet)
- **GS4** Geliştirici ↔ GitHub (hesap ve oturum güvenliği)

## Tehditler

Durum: **Uygulandı** = kanıtı depoda · **Kısmen** = bir kısmı uygulandı · **Planlandı** = ödev kapsamında yapılacak · **Kullanıcı** = Ayşe'nin hesap ayarında kontrol etmesi gereken

| # | STRIDE | Tehdit | Sınır | Önlem | Durum | Kanıt |
|---|---|---|---|---|---|---|
| T1 | Spoofing (Kimlik sahteciliği) | GitHub veya Cloudflare hesabının parolası çalınarak siteye sahte içerik yayınlanması | GS4, GS2 | İki adımlı doğrulama (2FA) | Kullanıcı | Hesap ayarları |
| T2 | Spoofing | Open Library'yi taklit eden sahte yanıt (araya girme) | GS1 | Veri yalnızca `https://openlibrary.org` üzerinden çekilir (TLS sunucu doğrulaması) | Uygulandı | `scripts/fetch.mjs` (BASE) |
| T3 | Tampering (Kurcalama) | `?veri=` parametresiyle panoya başka adresten sahte kitap listesi yükletilmesi | GS3 | İzin listesi (yalnız `data/*.json`) + CSP `connect-src 'self'` (iki katman) | Uygulandı | `js/app.js`, commit 1b7ae7e |
| T4 | Tampering | Open Library verisindeki kötü niyetli kitap adıyla saklı XSS | GS1→GS3 | Tüm metinler `esc()` ile kaçışlanır; CSP `script-src 'self'` satır içi script'i engeller; CodeQL taraması | Uygulandı | `js/app.js`, `_headers`, CodeQL |
| T5 | Tampering | Tedarik zinciri: üçüncü taraf GitHub Action'ın kötü niyetli güncellenmesi | GS4 | ZAP ve CodeQL action'ları commit hash ile sabit; Dependabot haftalık sürüm takibi | Kısmen (actions/* resmi action'ları sürüm etiketiyle) | `.github/workflows/`, `.github/dependabot.yml` |
| T6 | Repudiation (İnkâr) | Veri veya kod değişikliğinin kim tarafından yapıldığının izlenememesi | GS4 | Her değişiklik git commit'i; botlar ayrı kimlikle (veri-botu, guvenlik-botu) yazar; Actions ve Cloudflare yayın geçmişi tutulur | Uygulandı | `git log`, Actions çalıştırma kayıtları |
| T7 | Information disclosure (Bilgi ifşası) | Script'lerin, iş akışlarının, ham snapshot'ların ve tarama raporlarının siteden okunabilmesi | GS3 | Yalnızca `_site` yayınlanır; `_site` yoksa yayın başarısız olur | Uygulandı | `wrangler.jsonc`, `baslik-cloudflare.txt` (9/9 → 404) |
| T8 | Information disclosure | Gizli anahtarın depoya yanlışlıkla eklenmesi | GS4 | Depoda hiç gizli anahtar yok (Cloudflare, depoyu GitHub uygulamasıyla çeker); secret scanning + push protection açık | Uygulandı | Depo güvenlik ayarları |
| T9 | Information disclosure | Clickjacking ve başka sitelere adres sızması | GS3 | `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `Referrer-Policy`, COOP/CORP | Uygulandı | `_headers`, ZAP sonra raporu |
| T10 | Denial of service (Hizmet engelleme) | Open Library'nin yanıt vermemesi veya hız sınırı (429) | GS1 | Yeniden deneme + geri çekilme; hata olursa `latest.json` değişmez; tarayıcı son başarılı veriyi gösterir | Uygulandı | `scripts/fetch.mjs`, `sw.js` |
| T11 | Denial of service | Snapshot verisinin yanlışlıkla silinmesi veya fidye yazılımıyla şifrelenmesi (kişisel tehdit senaryosu) | GS4 | 3-2-1 yedek + otomatik geri yükleme script'i, RTO/RPO ölçümü | Planlandı | DR tatbikatı (yapılacak) |
| T12 | Elevation of privilege (Yetki yükseltme) | İş akışı girdisiyle komut enjeksiyonu veya Actions token'ının fazla yetkisi | GS4 | Girdiler `env:` üzerinden alınıp regex ile doğrulanır; her iş akışında en az `permissions` | Uygulandı | `zap-tarama.yml`, `baslik-kontrol.yml`, `puan-olc.yml` |
| T13 | Elevation of privilege | Cloudflare GitHub uygulamasının diğer depolara da erişmesi | GS2 | Uygulamaya yalnızca bu depo için izin verilir | Kullanıcı | GitHub → Settings → Applications |

## Kabul edilen riskler

- `http://` adresi HTTPS'e yönlendirmiyor. `.dev` alan adları tarayıcıların HSTS ön yükleme listesinde olduğundan tarayıcılar yalnızca HTTPS kullanır; Observatory yönlendirme testi geçti.
- Chart.js `vendor/` altında elle sabitlenmiştir (v4.6.1); Dependabot bunu izleyemez, sürüm elle kontrol edilir.
