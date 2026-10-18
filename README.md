# Live Board

Canlı görev panosu: kartlar sütunlar (yapılacak, yapılıyor, bitti) arasında taşınır; bir kullanıcının yaptığı değişiklik aynı panoyu açan diğer ekranlarda WebSocket ile anında görünür.

Proje TypeScript ile, testleri ilk günden yazılarak geliştiriliyor.

## Klasörler

- `package.json`: `shared`, `server` ve `web` paketlerini birleştiren npm workspaces tanımı.
- `shared/`: Sunucu ve arayüzün ortak paketi (`@live-board/shared`).
- `shared/src/`: Kart, API yanıtı, pano olayı ve WebSocket mesajı için zod şemaları ve tipleri; `moveCard`, `removeCard` ve `applyBoardEvent`.
- `server/`: Node.js + Express API (TypeScript).
- `server/src/domain/`: Pano tanımı, taşıma ve olay testleri; `moveCard` artık `shared` paketinde.
- `server/src/http/`: Hata sınıfı ve gelen verinin zod ile doğrulanması.
- `server/src/realtime/`: Aboneleri tutan hub ve WebSocket sunucusu (`ws`).
- `server/src/store/`: Ortak asenkron `CardStore` arayüzü; bellek ve PostgreSQL depoları; `diffCards` ile yalnız değişen satırlar yazılır.
- `server/src/db/`: Bağlantı havuzu, bağlantı kontrolü ve migration çalıştırıcısı.
- `server/migrations/`: Sıra numaralı SQL dosyaları.
- `server/playground/`: TypeScript, bağlantı havuzu, zod ve WebSocket alıştırmaları.
- `web/`: React + TypeScript arayüzü (Vite); saf fonksiyonların testleri `src/*.test.ts` dosyalarında.
- `compose.yaml`: PostgreSQL 18 (Docker), `127.0.0.1:5433`.

## Çalıştırma

Node.js 22.18 veya üstü gerekir: Node, `.ts` dosyalarını tiplerini silerek doğrudan çalıştırır.

Komutları kök klasörde çalıştır. Migration öncesinde aşağıdaki Veritabanı bölümündeki Docker kurulumunu tamamla ve `server/.env` içindeki bağlantı parolasını ayarla.

```bash
npm install
cp server/.env.example server/.env
npm run db:migrate -w @live-board/server
npm run dev:server
npm run dev:web # Başka bir terminalde; http://localhost:5173
```

Vite, `/api`, `/health` ve `/ws` (WebSocket) isteklerini `localhost:4000` üzerindeki sunucuya iletir.

`npm install` yalnız kökte çalıştırılır; bağımlılıklar kökteki `node_modules/` klasörüne, kilit dosyası kökteki `package-lock.json` dosyasına yazılır.

`server/.env` yoksa sunucu varsayılan olarak bellek deposunu ve `4000` portunu kullanır. Bellekteki kartlar sunucu kapanınca kaybolur.

Node tipleri kontrol etmez; tip kontrolü yalnız `npm run typecheck` (`tsc`) ile yapılır.

## Komutlar

Kök klasörde:

| Komut | Açıklama |
| --- | --- |
| `npm run dev:server` | Sunucuyu başlatır; `server/.env` varsa okunur. |
| `npm run dev:web` | Arayüzü Vite ile başlatır. |
| `npm run typecheck` | `shared`, `server` ve `web` için `tsc` çalıştırır. |
| `npm test` | Sunucu ve arayüz testleri (veritabanı gerekmez). |

Sunucu paketinde (`server/` klasöründe veya kökten komuta `-w @live-board/server` ekleyerek):

| Komut | Açıklama |
| --- | --- |
| `npm run test:db` | PostgreSQL deposunu test eder; veritabanı açık olmalı. |
| `npm run db:migrate` | Uygulanmamış migration'ları sırayla çalıştırır. |
| `npm run db:ping` | Veritabanına bağlanıp sürümünü yazar. |

Web paketinde (`web/` klasöründe veya kökten komuta `-w @live-board/web` ekleyerek):

| Komut | Açıklama |
| --- | --- |
| `npm run build` | Üretim çıktısını web paketinin `dist/` klasörüne yazar. |
| `npm test` | Reducer, taşıma hedefi ve yeniden bağlanma süresi testleri (`node:test`). |

## Veritabanı

PostgreSQL 18 Docker'da çalışır. Uygulama `pg` bağlantı havuzuyla veritabanına bağlanır; kullanılacak depo `STORE` değişkeniyle seçilir.

Projenin kök klasöründe:

```bash
cp .env.db.example .env.db
```

`.env.db` içinde `POSTGRES_PASSWORD` değerini doldur (`openssl rand -hex 16`); dosya git'e girmez.

```bash
docker compose up -d
```

Veri `db-data` volume'unda, konteynerin `/var/lib/postgresql` klasöründe durur (PostgreSQL 18 imajında yol bu; 17 ve öncesinde `/var/lib/postgresql/data`).

Sunucunun ortam dosyasını henüz oluşturmadıysan kök klasörde:

```bash
cp server/.env.example server/.env
```

`server/.env` içindeki `DATABASE_URL` değerinde `PAROLA` yerine `.env.db` dosyasındaki parolayı yaz. Örnek dosyada `STORE=postgres` ve `PORT=4000` hazırdır; `.env` dosyaları git'e girmez.

Kök klasörde bağlantıyı kontrol et, şemayı kur ve sunucuyu başlat:

```bash
npm run db:ping -w @live-board/server
npm run db:migrate -w @live-board/server
npm run dev:server
```

Migration, `boards` ve `cards` tablolarını ve başlangıç panosunu oluşturur. Uygulanan SQL dosyaları `schema_migrations` tablosunda tutulur; aynı migration yeniden çalıştırıldığında atlanır.

Veritabanını terminalden incelemek için projenin kökünde `docker compose exec db psql -U live_board -d live_board` çalıştırılabilir.

## Testler

Kök klasörde:

```bash
npm run typecheck
npm test
npm run test:db -w @live-board/server
```

- `npm test`: Sunucunun iş kuralı, HTTP ve WebSocket testleri ile web tarafındaki `boardReducer`, `cardsInColumn`, `moveTarget` ve yeniden bağlanma süresi kontrollerini çalıştırır. Sunucu ve web için ayrı test özetleri gösterilir; veritabanı gerektirmez.
- `npm run test:db`: PostgreSQL deposunda pano okuma, kart oluşturma, taşımanın kalıcılığı, kısmi düzenleme, silme sonrası sıralama, bulunamayan kart ve SQL `CHECK` kısıtı. PostgreSQL'in açık, `.env` dosyasının ayarlı ve migration'ın uygulanmış olması gerekir. Testler kendi panosunu oluşturup sonunda siler.

## Depolar

`STORE=memory` geliştirme için geçici bellek deposunu, `STORE=postgres` kalıcı PostgreSQL deposunu seçer. Her ikisi de aynı `Promise` döndüren `CardStore` arayüzünü uygular; HTTP katmanı depo çağrılarını `await` ile bekler.

PostgreSQL deposu parametreli sorgular kullanır. Kart taşıma ve silme, ortak `changeBoard` yardımcısında bir bağlantıda transaction açar ve panonun mevcut kart satırlarını `FOR UPDATE` ile kilitler. `moveCard` veya `removeCard` sonucunu önceki listeyle karşılaştıran `diffCards`, silinecek kartları ve yalnız `status` ya da `position` değeri değişen satırları seçer. Bu farklar yazılıp işlem `COMMIT` edilir; hata durumunda `ROLLBACK` yapılır. Bağlantı `finally` içinde havuza bırakılır.

Kart sorgularından dönen satırlar `CardRowSchema` ile çalışma anında doğrulanır. Şema, veritabanındaki `board_id` ve `created_at: Date` alanlarını kontrol edip `boardId` ve ISO tarih metni içeren `Card` biçimine dönüştürür. Beklenmeyen bir satır biçimi sunucuda `ZodError` oluşturur; HTTP yanıtı `500 INTERNAL_ERROR` olur.

## Uçlar

| Yöntem | Yol | Açıklama |
| --- | --- | --- |
| GET | `/health` | Sunucunun sağlık durumu. |
| GET | `/api/boards/:boardId/cards` | Panodaki kartlar, sütun ve pozisyon sırasıyla. |
| POST | `/api/boards/:boardId/cards` | `{ title, description?, status? }` ile kart oluşturur; `201` döner. |
| PATCH | `/api/cards/:cardId/move` | `{ status, position }` ile kartı taşır; panonun bütün kartlarını döner. |
| PATCH | `/api/cards/:cardId` | `{ title?, description? }` ile kartı düzenler ve kartı döner; en az bir alan gerekir, bilinmeyen alan `422` döndürür. |
| DELETE | `/api/cards/:cardId` | Kartı siler ve gövdesiz `204` döner; sütundaki sonraki kartlar bir sıra kayar. |

Düzenlemede gönderilmeyen alana dokunulmaz; `description: null` açıklamayı siler. Bu üç durum (yok, `null`, değer) SQL'de `CASE WHEN` ile ayrılır.

JSON yanıtları `{ success: true, data }` veya `{ success: false, error: { code, message } }` biçimindedir (`ApiResponse<T>`). Başarılı silme yanıtının gövdesi yoktur; silme hataları yine JSON döner.

## Canlı Güncelleme (WebSocket)

Bağlantı adresi: `ws://localhost:4000/ws?boardId=1`. El sıkışmada yol `/ws`, `boardId` pozitif bir tam sayı ve pano mevcut olmalıdır; geçersiz `boardId` için `400`, yanlış yol veya bulunamayan pano için `404` döner.

```text
sunucu --> istemci   { type: "welcome", boardId, clients }
                    { type: "event", event: BoardEvent }     card_created | card_moved | card_updated | card_deleted
                    { type: "pong" }
                    { type: "error", code, message }         INVALID_JSON | INVALID_MESSAGE | BINARY_NOT_SUPPORTED
istemci --> sunucu   { type: "ping" }

HTTP isteği --> store (kalıcı yazma) --> hub.publish(boardId, event) --> o panoya bağlı bütün soketler
```

- Olay yalnız kayıt başarılı olduktan sonra yayınlanır; reddedilen istek olay üretmez.
- `card_moved` olayı, sütun sonunu aşan `position` değerini sınırlandırılmış son konumuyla taşır.
- İstemci olayı `applyBoardEvent` ile uygular; aynı olay art arda iki kez gelirse ikinci uygulama durumu değiştirmez.
- Sunucu 30 saniyede bir ping gönderir; ilk turda ping gönderilen bağlantıdan ikinci tura kadar pong gelmezse bağlantıyı kapatır.
- Gelen mesaj 1 KB ile sınırlıdır; mesajlar `ClientMessageSchema` ile doğrulanır.
- Arayüz her `welcome` mesajında panoyu yeniden çeker: yayın, bağlantı kurulduktan sonraki olayları taşır, öncesini değil.
- `card_updated`, kart kimliği yanında yalnız başlığı ve açıklamayı taşır; geç gelse bile kartın sütununa ve sırasına dokunmaz.
- Bağlantı kapanınca arayüz otomatik yeniden dener. Bekleme üst sınırı 1 saniyeden başlayıp her başarısız denemede ikiye katlanır, 30 saniyede durur; gerçek bekleme bu sınırın yarısı ile tamamı arasında rastgele seçilir. Sayaç `welcome` geldiğinde sıfırlanır. `online` olayı veya “Şimdi dene” butonu beklemeyi iptal ederek hemen bağlantı başlatır.
- Sunucu `SIGTERM` veya `SIGINT` aldığında kalp atışını durdurur, WebSocket istemcilerini `1001` ve “Sunucu kapanıyor” açıklamasıyla kapatır; ardından HTTP sunucusunu ve veritabanı havuzunu kapatıp `0` ile çıkar. Kapanış 5 saniyede tamamlanamazsa `1` ile zorla çıkar. Tekrarlanan sinyaller kapanışı yeniden başlatmaz.

## Doğrulama

| Veri girişi | Dosya | Şema ve hata sonucu |
| --- | --- | --- |
| İstek gövdesi | `server/src/http/validate.ts` | `NewCardSchema`, `MoveCardSchema`, `UpdateCardSchema` → `400` / `422`. |
| Veritabanı satırı | `server/src/store/pg-store.ts` | `CardRowSchema`, `BoardRowSchema`, `BoardIdRowSchema` → beklenmeyen satırda `500`. |
| API yanıtı | `web/src/api.ts` | `apiResponseSchema(...)` → `UNEXPECTED_RESPONSE`. |

Ortak şemalar `shared/src/` içinde bir kez yazılır; tipler `z.infer` ile şemadan çıkarılır. Bir alan değiştiğinde `npm run typecheck`, o alanı eski biçimiyle kullanan kod için hem sunucuda hem arayüzde hata verir.

## TypeScript Ayarları

Sunucunun temel ayarları:

| Ayar | Anlamı |
| --- | --- |
| `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` | Sıkı tip kontrolü. |
| `noEmit`, `allowImportingTsExtensions` | `tsc` dosya üretmez; importlar `.ts` uzantılıdır. |
| `erasableSyntaxOnly` | Yalnız silinebilir sözdizimi; enum ve parameter property yok. |
| `verbatimModuleSyntax` | Tipler `import type` ile alınır. |
| `types: ["node"]` | Node tipleri (`@types/node`). |
| `lib: ["esnext"]` | JavaScript standart kütüphanesi; tarayıcı tipleri yüklenmez. |

`shared` paketi de `lib: ["esnext"]` kullanır; `types: []` ile Node veya tarayıcı ortamına özgü global tiplere bağlı kalmaz.

Web paketinde `tsconfig.json` yalnız diğer iki ayar dosyasını `references` ile gösterir. `tsconfig.app.json` tarayıcı kodunu DOM ve `vite/client` tipleriyle kontrol eder; Node tiplerini içermez ve testleri hariç tutar. `tsconfig.node.json`, `vite.config.ts` ve testleri `types: ["node"]` ile, DOM olmadan kontrol eder. `typecheck` scripti iki ayarı da çalıştırır; böylece tarayıcı kodundaki yanlış `process` kullanımı tip kontrolünde yakalanır.

## Bilinen Sınırlamalar

- Sunucu kapanmadan donarsa (`kill -STOP`) arayüz bunu fark etmez, “Canlı” görünür; istemci tarafında kalp atışı yoktur.
- Kopukluk sırasında oluşan olaylar sonradan tekrarlanmaz; yeniden bağlanınca pano baştan çekilir.
- Olayların sıra numarası yoktur; iki kişi aynı anda kart taşırsa iki ekrandaki sıralama farklı bitebilir (8. gün).
- İki kişi aynı kartın aynı alanını düzenlerse son kaydeden kazanır; farklı alanlar korunur (8. gün).
- Hub yalnız tek sunucu sürecinin belleğindedir; ikinci sunucuya bağlı istemciler olayı almaz (Redis, 6. gün).
- WebSocket bağlantısı için kimlik doğrulama yoktur; adresi bilen her istemci panoyu dinleyebilir.
- Taşıma ve silme sürerken bütün kart butonları kilitlidir; sonuç sunucudan dönünce ekran güncellenir (iyimser güncelleme yoktur).
- Arayüzde yalnız saf fonksiyonların testi vardır; bileşenler tarayıcıda elle denenir.
- Tek pano vardır (id `1`).

## Sonraki Adımlar (taslak)

- Redis: pub/sub ile birden fazla sunucu, önbellek.
- Arka plan işleri (kuyruk) ve bildirimler.
- Aynı kartın aynı anda değişmesi: sıra numarası ve çakışma çözümü.
- İstemci tarafı kalp atışı: donmuş sunucuyu fark edip yeniden bağlanmak.
