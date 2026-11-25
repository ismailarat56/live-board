<div align="center">

# Live Board

**Canlı görev panosu: bir ekranda yapılan kart değişikliği, aynı panoyu açan diğer ekranlarda WebSocket ile anında görünür.**

![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22.18%2B-5FA04E?logo=nodedotjs&logoColor=white)
![Lisans](https://img.shields.io/badge/lisans-MIT-2ea44f)

[Öne çıkanlar](#öne-çıkanlar) · [Kurulum](#kurulum-ve-çalıştırma) · [API özeti](#api-özeti) · [Mimari](#mimari) · [Testler](#testler)

</div>

Kartlar sütunlar (yapılacak, yapılıyor, bitti) arasında taşınır; değişiklikler aynı panoya bağlı bütün ekranlara iletilir. Sunucu Node.js ve Express ile, arayüz React ile yazıldı; kartlar PostgreSQL'de saklanır, Redis birden fazla sunucu arasında olayları taşır. Proje TypeScript ile, testleri ilk günden yazılarak geliştiriliyor.

## Öne çıkanlar

- **Canlı güncelleme:** kart oluşturma, taşıma, düzenleme ve silme olayları panoya bağlı soketlere WebSocket ile yayınlanır.
- **Sürüm kontrolü:** her kartta `version` bulunur; eski sürümle gelen düzenleme ve silme `409 VERSION_CONFLICT` alır.
- **Çakışmada taslak korunur:** arayüz `409` gelince taslağı silmez, kartın güncel halini gösterir.
- **İki depo, tek arayüz:** `CardStore` bellekte ve PostgreSQL'de uygulanır; depo `STORE` değişkeniyle seçilir.
- **Birden fazla sunucu:** `PUBSUB=redis` ile olaylar Redis üzerinden bütün sunuculara dağıtılır.
- **Panodakiler:** panoya bağlı bağlantılar adlarıyla listelenir; kayıtlar 15 saniye sürelidir, 5 saniyede bir tazelenir.
- **Otomatik yeniden bağlanma:** bağlantı kopunca arayüz 1 saniyeden 30 saniyeye çıkan beklemeyle yeniden dener ve panoyu baştan çeker.
- **Ortak şemalar:** kart, olay ve mesaj şemaları `shared` paketinde zod ile bir kez yazılır; tipler `z.infer` ile çıkarılır.
- **Çalışma anında doğrulama:** istek gövdesi, bağlantı adresi, veritabanı satırı, API yanıtı ve Redis mesajı şemayla doğrulanır.
- **Sözleşme testleri:** sürüm ve üye deposu sözleşmeleri hem bellekteki depoda hem PostgreSQL ve Redis'te koşar.
- **Düzgün kapanış:** `SIGTERM` veya `SIGINT` alınca soketler `1001` ile, ardından HTTP sunucusu, havuz ve Redis bağlantıları kapatılır.

## Gereksinimler

- Node.js 22.18 veya üstü. Node, `.ts` dosyalarını tiplerini silerek doğrudan çalıştırır.
- npm (workspaces). `npm install` yalnız kökte çalıştırılır.
- Kalıcı depo ve birden fazla sunucu için Docker: `compose.yaml` PostgreSQL 18 (`127.0.0.1:5433`) ve Redis 8.8 (`127.0.0.1:6380`) başlatır.

## Kurulum ve çalıştırma

Komutlar kök klasörde çalıştırılır.

**Veritabanı olmadan.** `server/.env` yoksa sunucu bellek deposunu ve `4000` portunu kullanır; kartlar sunucu kapanınca kaybolur.

```bash
npm install
npm run dev:server
npm run dev:web # Başka bir terminalde; http://localhost:5173
```

**PostgreSQL ve Redis ile.** Önce ortam dosyalarını oluştur:

```bash
cp .env.db.example .env.db
cp server/.env.example server/.env
```

`.env.db` içinde `POSTGRES_PASSWORD` değerini doldur (`openssl rand -hex 16`). `server/.env` içindeki `DATABASE_URL` değerinde `PAROLA` yerine aynı parolayı yaz. `.env` dosyaları git'e girmez. Sonra:

```bash
docker compose up -d
npm run db:migrate -w @live-board/server
npm run dev:server
npm run dev:web # Başka bir terminalde; http://localhost:5173
```

Vite, `/api`, `/health` ve `/ws` isteklerini `localhost:4000` üzerindeki sunucuya iletir; `API_PORT` ile hedef port değiştirilebilir.

İki sunucu ve iki arayüzle çalıştırma, bütün komutlar ve veritabanı ayrıntıları: [docs/KURULUM.md](docs/KURULUM.md)

## API özeti

| Yöntem | Yol | Açıklama |
| --- | --- | --- |
| GET | `/health` | Sunucunun sağlık durumu. |
| GET | `/api/boards/:boardId/cards` | Panodaki kartlar, sütun ve pozisyon sırasıyla. |
| GET | `/api/boards/:boardId/members` | Panodaki bağlantılar, ada göre sıralı. |
| POST | `/api/boards/:boardId/cards` | Kart oluşturur; `201` döner. |
| PATCH | `/api/cards/:cardId/move` | Kartı taşır; panonun bütün kartlarını döner. |
| PATCH | `/api/cards/:cardId` | Kartı düzenler; `expectedVersion` gerekir. |
| DELETE | `/api/cards/:cardId?expectedVersion=N` | Kartı siler; gövdesiz `204` döner. |

JSON yanıtları `{ success: true, data }` veya `{ success: false, error: { code, message } }` biçimindedir.

WebSocket bağlantı adresi: `ws://localhost:4000/ws?boardId=1&name=Ali`. Sunucu `welcome`, `event`, `pong` ve `error` mesajları gönderir; istemci `ping` gönderir.

İstek gövdeleri, mesaj biçimleri ve sürüm çakışması kuralları: [docs/API.md](docs/API.md)

## Mimari

Olay yalnız kayıt başarılı olduktan sonra yayınlanır; reddedilen istek olay üretmez.

```text
PUBSUB=local: HTTP isteği --> store (kalıcı yazma) --> hub.publish(boardId, event) --> o sunucuda o panoya bağlı soketler

PUBSUB=redis: HTTP isteği --> store (kalıcı yazma) --> relay.publish --> Redis: PUBLISH board:<id> <olay JSON>
              Redis --> her sunucunun abone bağlantısı (PSUBSCRIBE board:*) --> JSON + BoardEventSchema --> hub.publish --> o sunucunun soketleri
```

- `STORE=memory` geçici bellek deposunu, `STORE=postgres` kalıcı PostgreSQL deposunu seçer.
- PostgreSQL deposu parametreli sorgular kullanır; taşıma ve silme bir transaction içinde, satırlar `FOR UPDATE` ile kilitlenerek yapılır.
- `PUBSUB=redis` ile sunucu kendi olayını da Redis'ten geri alarak dağıtır; bütün sekmeler olayları aynı sırayla görür.
- Redis olayları taşır ve süreli üye kayıtlarını tutar; kartlar PostgreSQL'de kalır.

Depolar, Redis köprüsü, üye listesi, doğrulama noktaları ve TypeScript ayarları: [docs/MIMARI.md](docs/MIMARI.md)

## Klasör yapısı

```text
package.json         shared, server ve web paketlerini birleştiren npm workspaces tanımı
compose.yaml         PostgreSQL 18 ve Redis 8.8 (Docker)
shared/src/          zod şemaları ve tipleri; moveCard, removeCard, applyBoardEvent
server/
  src/domain/        pano tanımı, taşıma ve olay testleri
  src/http/          hata sınıfı ve gelen verinin zod ile doğrulanması
  src/realtime/      hub, WebSocket sunucusu, Redis bağlantıları ve köprüsü, üye depoları
  src/store/         CardStore arayüzü, bellek ve PostgreSQL depoları, diffCards
  src/db/            bağlantı havuzu, bağlantı kontrolü, migration çalıştırıcısı
  migrations/        sıra numaralı SQL dosyaları
  playground/        TypeScript, bağlantı havuzu, zod ve WebSocket alıştırmaları
web/src/             React arayüzü (Vite); saf fonksiyonların testleri *.test.ts dosyalarında
notes/               geliştirme günlükleri ve uygulama rehberi
docs/                kurulum, API, mimari ve bilinen eksikler
```

## Testler

Kök klasörde:

```bash
npm run typecheck
npm test
npm run test:db -w @live-board/server
npm run test:redis -w @live-board/server
```

- `npm test`: sunucunun iş kuralı, HTTP ve WebSocket testleri ile web tarafındaki saf fonksiyon testleri. Veritabanı gerektirmez.
- `npm run test:db`: PostgreSQL deposunu test eder. PostgreSQL açık, `server/.env` ayarlı ve migration uygulanmış olmalıdır.
- `npm run test:redis`: üye deposunun sözleşmesini gerçek Redis'te çalıştırır. Redis'in 1 numaralı veritabanını kullanır.

Testler Node'un kendi test çalıştırıcısıyla (`node --test`) koşar. Ayrıntı: [docs/KURULUM.md](docs/KURULUM.md#testler)

## Bilinen eksikler

- Kimlik doğrulama yoktur; adresi bilen her istemci panoyu dinleyebilir ve istediği adı yazabilir.
- Tek pano vardır (id `1`).
- Olayların sıra numarası yoktur; iki kişi aynı anda kart taşırsa iki ekrandaki sıralama farklı bitebilir.
- Redis kopukken yayınlanan olay kaybolur; abone geri gelince istemciler yeniden eşitlenir.
- Arayüzde yalnız saf fonksiyonların testi vardır; bileşenler tarayıcıda elle denenir.

Tam liste ve sonraki adımlar: [docs/BILINEN_EKSIKLER.md](docs/BILINEN_EKSIKLER.md)

## Lisans

Kod [MIT lisansı](LICENSE) ile sunulur.
