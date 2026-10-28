# Demo videosu senaryosu (≈75 sn) ve 2 dakikalık sunum

Ekran kaydı: Windows `Win + Alt + R` (Xbox Game Bar) ya da macOS `Cmd + Shift + 5`. Tarayıcıyı 1440 px genişlikte açın.
Altyazı dosyası hazır: `docs/demo-altyazi.vtt` (zamanlamayı kendi kaydınıza göre ±birkaç saniye kaydırın).

| Süre | Ekranda | Söylenecek / altyazı |
|---|---|---|
| 0–8 | Pano açık, üst şerit | “Okuma Pusulası; bir ilçe kütüphanesinin kütüphanecisi için kitap eğilim panosu.” |
| 8–18 | “Son güncelleme” ve kaynak bağlantısına imleç | “Veri Open Library'den GitHub Actions ile 6 saatte bir otomatik çekiliyor ve her seferinde bir snapshot birikiyor.” |
| 18–28 | KPI kartları → konu grafiği | “Üstte dört gösterge, altında hangi konuların günlük ve haftalık listede öne çıktığı.” |
| 28–42 | Konu: Polisiye, “Son 10 yıl” çipi, “3+ gün” kutusu | “Konu ve yayın yılına göre süzüyorum; yalnızca listede kalıcı olan kitapları bırakıyorum.” |
| 42–52 | Tabloda *Listede (gün)* başlığına tıklama, sparkline'a imleç | “Tablo sıralanabilir; mini grafik kitabın sıra geçmişini, bu sütun listede kaldığı gün sayısını gösteriyor.” |
| 52–60 | Çocuk moduna geçiş | “Çocuk modu yazıyı büyütüyor ve yalnızca çocuk kitaplarını gösteriyor.” |
| 60–72 | DevTools → Network → Offline, sayfayı yenile | “Bağlantı kesilse de pano son başarılı veriyle açılıyor ve bunu açıkça söylüyor.” |
| 72–78 | Vaka çalışması sayfası | “Süreç ve test bulguları vaka çalışmasında.” |

## Canlı demo (2 dk) — hazırlık listesi

- [ ] Panoyu demodan önce **bir kez açın** (son başarılı veri tarayıcıya kaydedilsin).
- [ ] Hata testi: hoca ağı kapatırsa → sarı/kırmızı uyarı bandı. API adresini bozmak isterse → `?test=hata` ya da `js/app.js` içindeki `DATA_URL` sabiti.
- [ ] Boş durum: `?test=bos` ya da yayın yılı 2099–2100.
- [ ] Yükleniyor: `?test=yavas` ya da DevTools → Network → Slow 3G.
- [ ] Olası canlı değişiklik soruları ve yeri:
  - Renk değiştir → `css/tokens.css` (`--accent`)
  - Sayfa başına satır → `js/app.js` `PAGE = 25`
  - “Yükseliyor” eşiği → `scripts/build.mjs` `MOVE = 3`
  - Çekim sıklığı → `.github/workflows/veri-cek.yml` `cron`
  - Yeni konu grubu → `scripts/categories.mjs`
  - Metinler / çeviri → `js/i18n.js`
