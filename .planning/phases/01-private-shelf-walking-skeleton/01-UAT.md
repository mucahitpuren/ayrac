---
status: testing
phase: 01-private-shelf-walking-skeleton
source: [01-VERIFICATION.md, 01-REVIEW-FIX.md]
started: 2026-10-02T16:00:00Z
updated: 2026-10-02T16:00:00Z
---

## Current Test

number: 1
name: Elle kitap ekleme (telefon ve masaüstü)
expected: |
  Tek bir kutucuk görünür; detay sayfasında başlık alanı, eser bilgileri ve not kartı vardır;
  doğrulama hatalarında odak ilk hatalı alana gider; "Kaydet"e çift dokunmak tek eser oluşturur.
awaiting: user response

## Tests

### 1. Elle kitap ekleme (telefon ve masaüstü)
Tüm alanları doldurup kaydet, kitaplıkta bul, detay sayfasını aç.
expected: Tek kutucuk; detayda başlık alanı, eser bilgileri ve not kartı; hatada odak ilk hatalı alana gider; çift dokunuş tek eser oluşturur.
result: [pending]

### 2. İkinci kopya ekleme (iki yol)
Detay sayfasındaki kesikli "Yeni nüsha ekle" kartı ve /kitap/yeni'de Başlık alanının altındaki öneriyi seçmek.
expected: Kopya aynı esere bağlanır; üst satır "Bu eserin 2 nüshası sende" der; kitaplıkta format etiketli iki ayrı kutucuk görünür; öneri listesi klavyeyle (Yukarı/Aşağı, Enter, Escape) çalışır.
result: [pending]

### 3. Düzenleme ve silme
Eser ve kopya alanlarını düzenle, sayfayı yenile; sonra bir kopyayı, ardından bütün eseri onay diyaloglarıyla sil.
expected: Değerler yenilemeden sonra kalır; "Evet, sil" demeden hiçbir şey silinmez; son kopya / çok kopya diyalog metinleri doğrudur; yönlendirme en eski kardeş kopyaya ya da / adresine gider.
result: [pending]

### 4. Not otomatik kaydı
Kopya sayfasında not yaz (Kaydedilmedi → Kaydediliyor → Kaydedildi); düzenleme sırasında interneti kes; yazdıktan hemen sonra sayfadan çık.
expected: Durumlar sırayla görünür; çevrimdışı hata bildirimi çıkar ve metin kaybolmaz; sayfadan hemen çıkınca not kaydedilmiş olur (çıkışta hata olursa bildirim görünür — WR-03 düzeltmesi).
result: [pending]

### 5. 375px düzen, tek elle kullanım
/, /kitap/yeni, /kitap/:id, /kitap/:id/duzenle, /eser/:id/nusha-ekle, diyaloglar ve menüler.
expected: Yatay kaydırma yok; kontroller en az 44px; üst çubuk tek satıra sığar; başlık kırpılmadan alt satıra geçer.
result: [pending]

### 6. İki hesapla izolasyon (arayüzden)
A ile giriş yapıp kitap ekle, çıkış yap, aynı tarayıcıda B ile gir, A'nın bir /kitap/<id> bağlantısını aç.
expected: B boş kitaplık ve A'nın bağlantısı için "bulunamadı" mesajı görür.
result: [pending]

### 7. Masaüstünde oturumun kalıcılığı
Giriş yap, tarayıcıyı tamamen kapat, canlı adresi tekrar aç.
expected: Hâlâ giriş yapılmış durumdadır; giriş ekranı yanıp sönmeden kitaplık açılır.
result: [pending]

### 8. Tema titremesi yok
Koyu tema kayıtlıyken soğuk açılış; "Sistem" seçiliyken işletim sistemi temasını değiştirmek.
expected: İlk boyamadan önce açık renk parlaması olmaz; sayfa işletim sistemi değişikliğini izler.
result: [pending]

### 9. Deploy Preview dev projesini kullanıyor
Bir Netlify Deploy Preview aç ve kitap ekle.
expected: Önizleme dev projesine bağlanır, asla prod'a değil.
result: [pending]

### 10. CSP ihlali yok (WR-06 düzeltmesi, yayından sonra)
Canlı sitede tarayıcı konsolunu açıp giriş, ekleme, detay ve tema değiştirme akışlarını gez.
expected: Konsolda "Content Security Policy" ihlali yok; tema/dil önyükleme betiği çalışıyor (titreme yok).
result: [pending]

## Already verified by the user

- Telefonda prod'a karşı (01-07 sonrası): e-posta onayı olmadan kayıt → boş "Kütüphanem", TR/EN ve açık/koyu geçişi, çıkış ve tekrar giriş.

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps
