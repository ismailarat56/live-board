# Live Board

Canlı görev panosu: kartlar sütunlar (yapılacak, yapılıyor, bitti) arasında taşınır; bir kullanıcının yaptığı değişiklik diğer kullanıcıların ekranında anında görünecek.

Proje TypeScript ile, testleri ilk günden yazılarak geliştiriliyor.

## Klasörler

- `server/`: Node.js + Express API (TypeScript).
- `server/src/domain/`: Saf iş kuralları ve tipler; kart, pano, olaylar ve `moveCard`.
- `server/src/http/`: API yanıt tipi, hata sınıfı ve gelen veriyi doğrulama.
- `server/src/store/`: Ortak asenkron `CardStore` arayüzü; bellek ve PostgreSQL depoları.
- `server/src/db/`: Bağlantı havuzu, bağlantı kontrolü ve migration çalıştırıcısı.
- `server/migrations/`: Veritabanı şemasını kuran SQL dosyaları.
- `server/playground/`: TypeScript alıştırmaları.
- `compose.yaml`: PostgreSQL 18 (Docker), `127.0.0.1:5433`.

## Çalıştırma

Node.js 22.18 veya üstü gerekir: Node, `.ts` dosyalarını tiplerini silerek doğrudan çalıştırır.

```bash
cd server
npm install
npm run dev
```

`.env` yoksa uygulama varsayılan olarak bellek deposunu ve `4000` portunu kullanır. Bellekteki kartlar sunucu kapanınca kaybolur. PostgreSQL ile kalıcılık için aşağıdaki kurulumu tamamla.

Tip kontrolü ve testler de `server/` klasöründe çalıştırılır:

```bash
npm run typecheck
npm test
```

Node tipleri kontrol etmez; tip kontrolü yalnız `npm run typecheck` (`tsc`) ile yapılır.

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

Ardından sunucunun ortam dosyasını oluştur:

```bash
cd server
cp .env.example .env
```

`server/.env` içindeki `DATABASE_URL` değerinde `PAROLA` yerine `.env.db` dosyasındaki parolayı yaz. Örnek dosyada `STORE=postgres` ve `PORT=4000` hazırdır; `.env` dosyaları git'e girmez.

`server/` klasöründe bağlantıyı kontrol et, şemayı kur ve sunucuyu başlat:

```bash
npm run db:ping
npm run db:migrate
npm run dev
```

Migration, `boards` ve `cards` tablolarını ve başlangıç panosunu oluşturur. Uygulanan SQL dosyaları `schema_migrations` tablosunda tutulur; aynı migration yeniden çalıştırıldığında atlanır.

Veritabanını terminalden incelemek için projenin kökünde `docker compose exec db psql -U live_board -d live_board` çalıştırılabilir.

## Testler

`server/` klasöründe:

```bash
npm run typecheck
npm test
npm run test:db
```

- `npm test`: `moveCard` iş kuralları ve bellek deposuyla HTTP uçları; veritabanı gerektirmez.
- `npm run test:db`: PostgreSQL deposunda kart oluşturma, taşımanın kalıcılığı, bulunamayan kart ve SQL `CHECK` kısıtı. PostgreSQL'in açık, `.env` dosyasının ayarlı ve migration'ın uygulanmış olması gerekir. Testler kendi panosunu oluşturup sonunda siler.

## Depolar

`STORE=memory` geliştirme için geçici bellek deposunu, `STORE=postgres` kalıcı PostgreSQL deposunu seçer. Her ikisi de aynı `Promise` döndüren `CardStore` arayüzünü uygular; HTTP katmanı depo çağrılarını `await` ile bekler.

PostgreSQL deposu parametreli sorgular kullanır. Kart taşıma sırasında bir bağlantıda transaction açılır, panonun mevcut kart satırları `FOR UPDATE` ile kilitlenir, `moveCard` sonucuna göre sıralar yazılır ve işlem `COMMIT` edilir; hata durumunda `ROLLBACK` yapılır. Bağlantı `finally` içinde havuza bırakılır.

## Uçlar

| Yöntem | Yol | Açıklama |
| --- | --- | --- |
| GET | `/health` | Sunucunun sağlık durumu. |
| GET | `/api/boards/:boardId/cards` | Panodaki kartlar, sütun ve pozisyon sırasıyla. |
| POST | `/api/boards/:boardId/cards` | `{ title, description?, status? }` ile kart oluşturur; `201` döner. |
| PATCH | `/api/cards/:cardId/move` | `{ status, position }` ile kartı taşır; panonun bütün kartlarını döner. |

Yanıtlar `{ success: true, data }` veya `{ success: false, error: { code, message } }` biçimindedir (`ApiResponse<T>`).

## TypeScript Ayarları

| Ayar | Anlamı |
| --- | --- |
| `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` | Sıkı tip kontrolü. |
| `noEmit`, `allowImportingTsExtensions` | `tsc` dosya üretmez; importlar `.ts` uzantılıdır. |
| `erasableSyntaxOnly` | Yalnız silinebilir sözdizimi; enum ve parameter property yok. |
| `verbatimModuleSyntax` | Tipler `import type` ile alınır. |
| `types: ["node"]` | Node tipleri (`@types/node`). |

## Bilinen Sınırlamalar

- `STORE=memory` kullanıldığında sunucu yeniden başlayınca kartlar silinir; kalıcılık için `STORE=postgres` gerekir.
- Başlangıç panosu var (id `1`); pano oluşturma ucu yok.
- Kart silme ve düzenleme yok.
- Gerçek zamanlı güncelleme yok.

## Sonraki Adımlar (taslak)

- Girdi doğrulamasını `zod` ile şemalara taşıma (şu an elle doğrulanıyor).
- React + TypeScript arayüz.
- WebSocket ile canlı güncelleme.
- Redis: pub/sub ile birden fazla sunucu, önbellek.
- Arka plan işleri (kuyruk) ve bildirimler.
- Aynı kartın aynı anda taşınması: çakışma çözümü.
