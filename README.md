# Live Board

Canlı görev panosu: kartlar sütunlar (yapılacak, yapılıyor, bitti) arasında taşınır; bir kullanıcının yaptığı değişiklik diğer kullanıcıların ekranında anında görünecek.

Proje TypeScript ile, testleri ilk günden yazılarak geliştiriliyor.

## Klasörler

- `server/`: Node.js + Express API (TypeScript).
- `server/src/domain/`: Saf iş kuralları ve tipler; kart, pano, olaylar ve `moveCard`.
- `server/src/http/`: API yanıt tipi, hata sınıfı ve gelen veriyi doğrulama.
- `server/src/store/`: Veri deposu (şimdilik bellekte).
- `server/playground/`: TypeScript alıştırmaları.
- `compose.yaml`: PostgreSQL 18 (Docker), `127.0.0.1:5433`.

## Çalıştırma

Node.js 22.18 veya üstü gerekir: Node, `.ts` dosyalarını tiplerini silerek doğrudan çalıştırır.

```bash
cd server
npm install
npm run dev
```

Tip kontrolü ve testler de `server/` klasöründe çalıştırılır:

```bash
npm run typecheck
npm test
```

Node tipleri kontrol etmez; tip kontrolü yalnız `npm run typecheck` (`tsc`) ile yapılır.

## Veritabanı

PostgreSQL 18 Docker'da çalışır. Uygulama henüz bağlanmıyor (2. gün).

Projenin kök klasöründe:

```bash
cp .env.db.example .env.db
```

`.env.db` içinde `POSTGRES_PASSWORD` değerini doldur (`openssl rand -hex 16`); dosya git'e girmez.

```bash
docker compose up -d
docker compose exec db psql -U live_board -d live_board
```

Veri `db-data` volume'unda, konteynerin `/var/lib/postgresql` klasöründe durur (PostgreSQL 18 imajında yol bu; 17 ve öncesinde `/var/lib/postgresql/data`).

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

- Veri bellekte; sunucu yeniden başlayınca kartlar silinir. PostgreSQL açık ama uygulama henüz ona bağlı değil.
- Tek pano var (id `1`).
- Kart silme ve düzenleme yok.
- Gerçek zamanlı güncelleme yok.
- Yalnız `moveCard`'ın testi var; HTTP katmanının testi yok.

## Sonraki Adımlar (taslak)

- PostgreSQL ile kalıcı depo (`pg`), aynı `CardStore` arayüzüyle; migration; `zod` ile doğrulama; HTTP testleri.
- React + TypeScript arayüz.
- WebSocket ile canlı güncelleme.
- Redis: pub/sub ile birden fazla sunucu, önbellek.
- Arka plan işleri (kuyruk) ve bildirimler.
- Aynı kartın aynı anda taşınması: çakışma çözümü.
