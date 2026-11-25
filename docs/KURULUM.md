[← README'ye dön](../README.tr.md)

# Kurulum, komutlar ve testler

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

İki sunucu ve iki arayüz (dört terminal):

```text
Kök klasörde:
npm run dev:server                       birinci sunucu (server/.env'deki PORT, 4000)
PORT=4001 npm run dev:server             ikinci sunucu; komutun önündeki değişken .env'dekini ezer
npm run dev:web                          localhost:5173 --> 4000

web klasöründe:
API_PORT=4001 npm run dev -- --port 5174  localhost:5174 --> 4001
```

Kökte `npm run dev:web -- --port 5174` çalışmaz: npm `--port`'u kendi ayarı sanar, seçenek Vite'a ulaşmaz.

İki sunucunun aynı veriyi ve olayları paylaşması için `server/.env` içinde `STORE=postgres`, `PUBSUB=redis`, ortak `DATABASE_URL` ve `REDIS_URL` ayarlı olmalıdır; örnek ortam dosyası bu düzeni kullanır.

Vite, `/api`, `/health` ve `/ws` (WebSocket) isteklerini varsayılan olarak `localhost:4000` üzerindeki sunucuya iletir; `API_PORT` ile hedef port değiştirilebilir.

`npm install` yalnız kökte çalıştırılır; bağımlılıklar kökteki `node_modules/` klasörüne, kilit dosyası kökteki `package-lock.json` dosyasına yazılır.

`server/.env` yoksa sunucu varsayılan olarak bellek deposunu ve `4000` portunu kullanır. Bellekteki kartlar sunucu kapanınca kaybolur. `PUBSUB=local` ile Redis olmadan tek sunucu olarak çalışır (olaylar yalnız o sürecin içinde dağıtılır).

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
| `npm run test:redis` | Redis üye deposunu test eder; Redis açık olmalı, 1 numaralı veritabanını kullanır. |
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
npm run test:redis -w @live-board/server
npm run build -w @live-board/web
```

- `npm test`: Sunucunun iş kuralı, HTTP ve WebSocket testleri ile web tarafındaki `boardReducer`, `cardsInColumn`, `moveTarget` ve yeniden bağlanma süresi kontrollerini çalıştırır. Sunucu ve web için ayrı test özetleri gösterilir; veritabanı gerektirmez.
- `npm run test:db`: PostgreSQL deposunda pano okuma, kart oluşturma, taşımanın kalıcılığı, kısmi düzenleme, silme sonrası sıralama, bulunamayan kart ve SQL `CHECK` kısıtı. PostgreSQL'in açık, `.env` dosyasının ayarlı ve migration'ın uygulanmış olması gerekir. Testler kendi panosunu oluşturup sonunda siler.
- `npm run test:redis`: Üye deposunun ortak sözleşmesini gerçek Redis'te çalıştırır; Redis açık ve `server/.env` içindeki `REDIS_URL` ayarlı olmalıdır. Testler 1 numaralı veritabanındaki `presence:board:1` ve `presence:board:2` anahtarlarını her test öncesinde temizler; bu veritabanını testlere ayır.
