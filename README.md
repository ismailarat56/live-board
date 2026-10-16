# Live Board

Canlı görev panosu: kartlar sütunlar (yapılacak, yapılıyor, bitti) arasında taşınır; bir kullanıcının yaptığı değişiklik aynı panoyu açan diğer ekranlarda WebSocket ile anında görünür.

Proje TypeScript ile, testleri ilk günden yazılarak geliştiriliyor.

## Klasörler

- `package.json`: `shared`, `server` ve `web` paketlerini birleştiren npm workspaces tanımı.
- `shared/`: Sunucu ve arayüzün ortak paketi (`@live-board/shared`).
- `shared/src/`: Kart, API yanıtı, pano olayı ve WebSocket mesajı için zod şemaları ve tipleri; `moveCard` ve `applyBoardEvent`.
- `server/`: Node.js + Express API (TypeScript).
- `server/src/domain/`: Pano tanımı, taşıma ve olay testleri; `moveCard` artık `shared` paketinde.
- `server/src/http/`: Hata sınıfı ve gelen verinin zod ile doğrulanması.
- `server/src/realtime/`: Aboneleri tutan hub ve WebSocket sunucusu (`ws`).
- `server/src/store/`: Ortak asenkron `CardStore` arayüzü; bellek ve PostgreSQL depoları.
- `server/src/db/`: Bağlantı havuzu, bağlantı kontrolü ve migration çalıştırıcısı.
- `server/migrations/`: Sıra numaralı SQL dosyaları.
- `server/playground/`: TypeScript, bağlantı havuzu, zod ve WebSocket alıştırmaları.
- `web/`: React + TypeScript arayüzü (Vite).
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
| `npm test` | İş kuralı, HTTP ve WebSocket testlerini çalıştırır; veritabanı gerekmez. |

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

- `npm test`: İş kuralı, HTTP ve WebSocket testleri; ortak olay uygulama, hub ve bağlantı davranışları da denetlenir, veritabanı gerektirmez.
- `npm run test:db`: PostgreSQL deposunda kart oluşturma, taşımanın kalıcılığı, bulunamayan kart ve SQL `CHECK` kısıtı. PostgreSQL'in açık, `.env` dosyasının ayarlı ve migration'ın uygulanmış olması gerekir. Testler kendi panosunu oluşturup sonunda siler.

## Depolar

`STORE=memory` geliştirme için geçici bellek deposunu, `STORE=postgres` kalıcı PostgreSQL deposunu seçer. Her ikisi de aynı `Promise` döndüren `CardStore` arayüzünü uygular; HTTP katmanı depo çağrılarını `await` ile bekler.

PostgreSQL deposu parametreli sorgular kullanır. Kart taşıma sırasında bir bağlantıda transaction açılır, panonun mevcut kart satırları `FOR UPDATE` ile kilitlenir, `moveCard` sonucuna göre sıralar yazılır ve işlem `COMMIT` edilir; hata durumunda `ROLLBACK` yapılır. Bağlantı `finally` içinde havuza bırakılır.

Kart sorgularından dönen satırlar `CardRowSchema` ile çalışma anında doğrulanır. Şema, veritabanındaki `board_id` ve `created_at: Date` alanlarını kontrol edip `boardId` ve ISO tarih metni içeren `Card` biçimine dönüştürür. Beklenmeyen bir satır biçimi sunucuda `ZodError` oluşturur; HTTP yanıtı `500 INTERNAL_ERROR` olur.

## Uçlar

| Yöntem | Yol | Açıklama |
| --- | --- | --- |
| GET | `/health` | Sunucunun sağlık durumu. |
| GET | `/api/boards/:boardId/cards` | Panodaki kartlar, sütun ve pozisyon sırasıyla. |
| POST | `/api/boards/:boardId/cards` | `{ title, description?, status? }` ile kart oluşturur; `201` döner. |
| PATCH | `/api/cards/:cardId/move` | `{ status, position }` ile kartı taşır; panonun bütün kartlarını döner. |

Yanıtlar `{ success: true, data }` veya `{ success: false, error: { code, message } }` biçimindedir (`ApiResponse<T>`).

## Canlı Güncelleme (WebSocket)

Bağlantı adresi: `ws://localhost:4000/ws?boardId=1`. El sıkışmada yol `/ws`, `boardId` pozitif bir tam sayı ve pano mevcut olmalıdır; geçersiz `boardId` için `400`, yanlış yol veya bulunamayan pano için `404` döner.

```text
sunucu --> istemci   { type: "welcome", boardId, clients }
                    { type: "event", event: BoardEvent }     card_created | card_moved | card_deleted
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

## Doğrulama

| Veri girişi | Dosya | Şema ve hata sonucu |
| --- | --- | --- |
| İstek gövdesi | `server/src/http/validate.ts` | `NewCardSchema`, `MoveCardSchema` → `400` / `422`. |
| Veritabanı satırı | `server/src/store/pg-store.ts` | `CardRowSchema` → beklenmeyen satırda `500`. |
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

`shared` paketi de `lib: ["esnext"]` kullanır; `types: []` ile Node veya tarayıcı ortamına özgü global tiplere bağlı kalmaz. `web` paketinin `lib` listesi DOM tiplerini içerir; `moduleResolution: "bundler"`, `jsx: "react-jsx"` ve `types: ["vite/client"]` ayarları Vite ve React ortamına uygundur.

## Bilinen Sınırlamalar

- Taşıma sırasında panonun bütün kartları tek tek güncelleniyor; yüzlerce kart olduğunda yalnız değişen kartlar seçilmeli.
- Pano ve `board_id` sorguları hâlâ `pool.query<Board>` ve `client.query<{ board_id: number }>` ile TypeScript'e verilen sözlere dayanıyor; yalnız kart satırları zod'dan geçiyor.
- Bağlantı koparsa arayüz kendiliğinden yeniden bağlanmaz; "Yeniden bağlan" butonu kullanılır. Kopukluk sırasında oluşan olaylar sonradan tekrarlanmaz, pano yeniden çekilir.
- Olayların sıra numarası yoktur; iki kişi aynı anda kart taşırsa iki ekrandaki sıralama farklı bitebilir (7. gün).
- Hub yalnız tek sunucu sürecinin belleğindedir; ikinci sunucuya bağlı istemciler olayı almaz (Redis, 5. gün).
- Kart silme ucu yoktur; `card_deleted` olayı tanımlıdır ancak hiçbir yerde yayınlanmaz.
- WebSocket bağlantısı için kimlik doğrulama yoktur; adresi bilen her istemci panoyu dinleyebilir.
- Taşıma sürerken bütün taşıma butonları kilitlidir; ekran, sonuç sunucudan dönünce güncellenir. İyimser güncelleme yoktur.
- Arayüzde test yok; doğrulama tarayıcıda elle yapılıyor.
- Tek pano var (id `1`); kart silme ve düzenleme yok.

## Sonraki Adımlar (taslak)

- Redis: pub/sub ile birden fazla sunucu, önbellek.
- Arka plan işleri (kuyruk) ve bildirimler.
- Aynı kartın aynı anda taşınması: çakışma çözümü.
