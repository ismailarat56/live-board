# 11.10.2026 Gün Sonu Özeti

> İstenen günlük dosya adı korunmuştur. Bu özet 15.10.2026 tarihinde mevcut kaynak kodu ve Git geçmişi incelenerek hazırlanmıştır; işlerin 11 Ekim'de yapıldığını veya kişisel öğrenme deneyimlerini belgeleyen bir kayıt değildir.

## PostgreSQL ile Kalıcı Depo

Bellek deposuna ek olarak `pg` kullanan PostgreSQL deposu var. `STORE=memory` geçici belleği, `STORE=postgres` veritabanını seçiyor. `DATABASE_URL` bağlantı adresini, `PORT` HTTP portunu belirliyor; ortam ayarı yoksa varsayılanlar bellek deposu ve `4000` portu.

`CardStore` arayüzündeki bütün metotlar `Promise` döndürüyor. Böylece HTTP katmanı aynı arayüz üzerinden iki depoyla da çalışabiliyor; depo işlemleri `await` ile bekleniyor.

## Bağlantı Havuzu

`createPool`, en fazla beş bağlantılı bir havuz oluşturuyor. Tek sorgularda `pool.query`, transaction gerektiren işlemlerde `pool.connect` ile alınan aynı bağlantı kullanılıyor. İş bitince `client.release` bağlantıyı havuza geri veriyor; bağımsız betiklerde `pool.end` havuzu kapatıyor.

`server/playground/07-pool.ts` alıştırması sekiz sorguyu aynı anda başlatıyor. Her sorgu PostgreSQL bağlantısının süreç kimliğini okuyor ve on saniye bekliyor; çıktı, havuz sınırının ve bağlantıların yeniden kullanımının gözlemlenmesini sağlıyor.

## Şema ve Migration

İlk SQL migration'ı `boards` ve `cards` tablolarını, kartları pano, durum ve pozisyona göre aramak için bir indeks ve başlangıç panosunu oluşturuyor. Kartların pano ilişkisi foreign key ile kuruluyor. Başlık uzunluğu, geçerli durum değerleri ve negatif olmayan pozisyon SQL `CHECK` kısıtlarıyla da denetleniyor.

Migration çalıştırıcısı SQL dosyalarını sıralayıp her birini transaction içinde uyguluyor. Başarıyla uygulanan dosyalar `schema_migrations` tablosuna kaydediliyor; sonraki çalıştırmada bu dosyalar atlanıyor.

## Kart Taşıma ve Transaction

PostgreSQL deposunda kart taşıma `BEGIN` ile başlıyor. Kartın panosu bulunuyor, panodaki mevcut kart satırları `FOR UPDATE` ile kilitleniyor ve saf `moveCard` fonksiyonu yeni sıralamayı hesaplıyor. Değişiklikler aynı bağlantı üzerinden yazılıp `COMMIT` ediliyor; bulunamayan kartta veya hatada `ROLLBACK` yapılıyor. Bağlantı `finally` içinde serbest bırakılıyor.

Sorgular değerleri `$1`, `$2` gibi parametrelerle alıyor. Veritabanındaki `board_id` ve `created_at` alanları uygulamada `boardId` ve ISO tarih metni olan `createdAt` alanlarına dönüştürülüyor.

## Test Kapsamı

- `move-card.test.ts`: Aynı sütunda sıralama, sütunlar arasında taşıma, pozisyonları yeniden numaralama, sınır dışı pozisyonlar, girdiyi değiştirmeme ve bulunamayan kart.
- `app.test.ts`: Sağlık ucu, kart oluşturma, listeleme, taşıma ve hatalı isteklerin durum/hata kodları. Bu testler bellek deposunu kullanıyor.
- `pg-store.integration.ts`: Kartın veritabanına yazılması, yeni bir depo örneğinin taşınmış kartı aynı sırada okuması, bulunamayan kartın veri değiştirmemesi ve SQL `CHECK` kısıtının geçersiz başlığı reddetmesi. Test panosu testlerden sonra siliniyor.

`server/` klasöründeki kontrol komutları:

```bash
npm run typecheck
npm test
npm run db:ping
npm run db:migrate
npm run test:db
```

Veritabanı komutları için Docker'daki PostgreSQL'in çalışması ve `server/.env` bağlantı ayarlarının doldurulması gerekiyor. `test:db` öncesinde migration uygulanmış olmalı. Bu liste komutları belgeliyor; geçmiş bir tarihe ait test sonucu bildirmiyor.

## Git ve v2 Etiketi

Bu belge hazırlanırken `HEAD`, `ce8db62` (`docs: add October 9 learning summary`) commit'indeydi ve toplam 20 commit vardı. `live-board-v1` etiketi `e8fdef1` commit'ini gösteriyor; bu noktaya kadar 11 commit, sonrasında dokuz commit bulunuyor.

README güncellemesi ve bu özet `docs: update readme and daily summary` mesajıyla tek commit'e alınacak, `live-board-v2` etiketi bu commit'e bağlanacak. Böylece toplam 21 commit olacak: v1'e kadar 11, sonrasında 10. Verilen 18 commit beklentisi mevcut geçmişle uyuşmuyor; sayıyı değiştirmek için geçmiş yeniden yazılmıyor.

Etiket bir commit'e sabit bir ad verir; sonraki commit'lerle birlikte ilerlemez. v2 sürümündeki dosyalar daha sonra `git show live-board-v2:README.md` ile incelenebilir.

## Sonraki Adımlar

- Elle yazılmış girdi doğrulamasını `zod` şemalarına taşıma.
- React ve TypeScript ile pano arayüzü.
- WebSocket ile değişiklikleri diğer kullanıcılara iletme.
- Eş zamanlı kart değişikliklerinde çakışma yönetimi.
