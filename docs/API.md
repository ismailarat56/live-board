[← README'ye dön](../README.tr.md)

# API ve WebSocket

## Uçlar

| Yöntem | Yol | Açıklama |
| --- | --- | --- |
| GET | `/health` | Sunucunun sağlık durumu. |
| GET | `/api/boards/:boardId/cards` | Panodaki kartlar, sütun ve pozisyon sırasıyla. |
| GET | `/api/boards/:boardId/members` | Panodaki bağlantılar: `[{ connectionId, name }]`, ada göre sıralı. |
| POST | `/api/boards/:boardId/cards` | `{ title, description?, status? }` ile kart oluşturur; `201` döner. |
| PATCH | `/api/cards/:cardId/move` | `{ status, position }` ile kartı taşır; panonun bütün kartlarını döner. |
| PATCH | `/api/cards/:cardId` | `{ title?, description?, expectedVersion }` ile kartı düzenler ve kartı döner; en az bir içerik alanı gerekir, bilinmeyen alan `422` döndürür. |
| DELETE | `/api/cards/:cardId?expectedVersion=N` | Kartı siler ve gövdesiz `204` döner; sütundaki sonraki kartlar bir sıra kayar. |

`expectedVersion` uymazsa `409 VERSION_CONFLICT` döner ve kart değişmez (ayrıntı: [Sürüm ve Çakışma](#sürüm-ve-çakışma)).

Düzenlemede gönderilmeyen alana dokunulmaz; `description: null` açıklamayı siler. Bu üç durum (yok, `null`, değer) SQL'de `CASE WHEN` ile ayrılır.

JSON yanıtları `{ success: true, data }` veya `{ success: false, error: { code, message } }` biçimindedir (`ApiResponse<T>`). Başarılı silme yanıtının gövdesi yoktur; silme hataları yine JSON döner.

## Canlı Güncelleme (WebSocket)

Bağlantı adresi: `ws://localhost:4000/ws?boardId=1&name=Ali`. El sıkışmada yol `/ws`, `boardId` pozitif bir tam sayı ve pano mevcut olmalıdır. Adın başındaki ve sonundaki boşluklar kırpılır; kalan ad 1–30 karakter olmalıdır. Geçersiz `boardId` veya ad için `400`, yanlış yol veya bulunamayan pano için `404` döner.

```text
sunucu --> istemci   { type: "welcome", boardId, connectionId }
                    { type: "event", event: BoardEvent }     card_created | card_moved | card_updated | card_deleted | members_changed
                    { type: "pong" }
                    { type: "error", code, message }         INVALID_JSON | INVALID_MESSAGE | BINARY_NOT_SUPPORTED
istemci --> sunucu   { type: "ping" }

PUBSUB=local: HTTP isteği --> store (kalıcı yazma) --> hub.publish(boardId, event) --> o sunucuda o panoya bağlı soketler
```

- Olay yalnız kayıt başarılı olduktan sonra yayınlanır; reddedilen istek olay üretmez.
- `card_moved` olayı, sütun sonunu aşan `position` değerini sınırlandırılmış son konumuyla taşır.
- İstemci olayı `applyBoardEvent` ile uygular; aynı olay art arda iki kez gelirse ikinci uygulama durumu değiştirmez.
- Sunucu 30 saniyede bir ping gönderir; ilk turda ping gönderilen bağlantıdan ikinci tura kadar pong gelmezse bağlantıyı kapatır.
- Gelen mesaj 1 KB ile sınırlıdır; mesajlar `ClientMessageSchema` ile doğrulanır.
- Arayüz her `welcome` mesajında panoyu yeniden çeker: yayın, bağlantı kurulduktan sonraki olayları taşır, öncesini değil.
- `card_updated` başlığı, açıklamayı ve sürümü taşır; geç gelse bile kartın sütununa ve sırasına dokunmaz, sürümü eldekinden büyük değilse yok sayılır.
- Bağlantı kapanınca arayüz otomatik yeniden dener. Bekleme üst sınırı 1 saniyeden başlayıp her başarısız denemede ikiye katlanır, 30 saniyede durur; gerçek bekleme bu sınırın yarısı ile tamamı arasında rastgele seçilir. Sayaç `welcome` geldiğinde sıfırlanır. `online` olayı veya “Şimdi dene” butonu beklemeyi iptal ederek hemen bağlantı başlatır.
- Sunucu `SIGTERM` veya `SIGINT` aldığında kalp atışını durdurur, WebSocket istemcilerini `1001` ve “Sunucu kapanıyor” açıklamasıyla kapatır; ardından HTTP sunucusunu, veritabanı havuzunu ve Redis bağlantılarını kapatıp `0` ile çıkar. Kapanış 5 saniyede tamamlanamazsa `1` ile zorla çıkar. Tekrarlanan sinyaller kapanışı yeniden başlatmaz.

## Sürüm ve Çakışma

| Alan veya durum | Anlamı |
| --- | --- |
| `version` | Her kartta bulunur; 1'den başlar, başlık ya da açıklama değişince bir artar. |
| `expectedVersion` | İstemcinin gördüğü sürüm; PATCH gövdesinde, DELETE adresinde gönderilir. |
| `409` | Sürüm uymuyor: kart bu arada değişti; hiçbir şey yazılmaz. |

- Kontrol ve yazma tek SQL komutunda yapılır: `UPDATE ... WHERE id = $1 AND version = $6`. Önce okuyup sonra yazmak aynı sürümle gelen iki isteği birden geçirebilir; `test:db` içindeki yarış testi bunu yakalar. Silmede kontrol, `changeBoard` yardımcısının `FOR UPDATE` kilidinden sonra yapılır.
- Sürüm sözleşmesi (`server/src/store/version-contract.ts`) iki depoda da koşar: `npm test` bellekteki depoda, `test:db` PostgreSQL'de.
- Arayüz, düzenleme formu açıldığı andaki sürümü gönderir. `409` gelince taslak silinmez, panoyu yeniden çeker ve kartın güncel halini gösterir; “Benimkini yine de kaydet” yalnız değiştirilen alanları güncel sürümle yeniden yollar.
- Taşıma sürüme bakmaz ve sürümü değiştirmez: sıra içerik değildir, son taşıyan kazanır.
- İstemci, sürümü eldekinden büyük olmayan `card_updated` olayını ve kart düzenleme HTTP yanıtını yok sayar: geç gelen eski veri yeni hali ezmez.
