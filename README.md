# Live Board

Canlı görev panosu: kartlar sütunlar (yapılacak, yapılıyor, bitti) arasında taşınır; bir kullanıcının yaptığı değişiklik diğer kullanıcıların ekranında anında görünecek.

Proje TypeScript ile, testleri ilk günden yazılarak geliştiriliyor.

## Klasörler

- `package.json`: `shared`, `server` ve `web` paketlerini birleştiren npm workspaces tanımı.
- `shared/`: Sunucu ve arayüzün ortak paketi (`@live-board/shared`).
- `shared/src/`: Kart ve API yanıtı için zod şemaları ve tipleri; `statusLabel` ve `assertNever`.
- `server/`: Node.js + Express API (TypeScript).
- `server/src/domain/`: Saf iş kuralları; pano, olaylar ve `moveCard`.
- `server/src/http/`: Hata sınıfı ve gelen verinin zod ile doğrulanması.
- `server/src/store/`: Ortak asenkron `CardStore` arayüzü; bellek ve PostgreSQL depoları.
- `server/src/db/`: Bağlantı havuzu, bağlantı kontrolü ve migration çalıştırıcısı.
- `server/migrations/`: Sıra numaralı SQL dosyaları.
- `server/playground/`: TypeScript, bağlantı havuzu ve zod alıştırmaları.
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
| `npm test` | İş kuralı ve HTTP testlerini çalıştırır; veritabanı gerekmez. |

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

- `npm test`: `moveCard` iş kuralları ve bellek deposuyla HTTP uçları; veritabanı gerektirmez.
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
- Arayüz başka bir ekranın yaptığı değişikliği görmez; silinmiş bir kartın taşıma butonuna tıklanınca "Kart bulunamadı." çıkar.
- Taşıma sürerken bütün taşıma butonları kilitlidir; ekran, sonuç sunucudan dönünce güncellenir. İyimser güncelleme yoktur.
- Arayüzde test yok; doğrulama tarayıcıda elle yapılıyor.
- Tek pano var (id `1`); kart silme ve düzenleme yok.

## Sonraki Adımlar (taslak)

- WebSocket ile canlı güncelleme; `BoardEvent` tiplerinin `shared` paketine taşınması.
- Redis: pub/sub ile birden fazla sunucu, önbellek.
- Arka plan işleri (kuyruk) ve bildirimler.
- Aynı kartın aynı anda taşınması: çakışma çözümü.
