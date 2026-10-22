# Live Board

Canlı görev panosu: kartlar sütunlar (yapılacak, yapılıyor, bitti) arasında taşınır; bir kullanıcının yaptığı değişiklik aynı panoyu açan diğer ekranlarda WebSocket ile anında görünür.

Proje TypeScript ile, testleri ilk günden yazılarak geliştiriliyor.

## Klasörler

- `package.json`: `shared`, `server` ve `web` paketlerini birleştiren npm workspaces tanımı.
- `shared/`: Sunucu ve arayüzün ortak paketi (`@live-board/shared`).
- `shared/src/`: Kart, üye, API yanıtı, pano olayı ve WebSocket mesajı için zod şemaları ve tipleri; `moveCard`, `removeCard` ve `applyBoardEvent`.
- `server/`: Node.js + Express API (TypeScript).
- `server/src/domain/`: Pano tanımı, taşıma ve olay testleri; `moveCard` artık `shared` paketinde.
- `server/src/http/`: Hata sınıfı ve gelen verinin zod ile doğrulanması.
- `server/src/realtime/`: Hub (aboneler), WebSocket sunucusu (`ws`), Redis bağlantıları ve köprüsü (`redis-relay`); üye listesi için bellekte ve Redis'te iki depo, iki depoda koşan sözleşme (`presence-contract`).
- `server/src/store/`: `CardStore` arayüzü; bellekte ve PostgreSQL'de iki depo; iki depoda koşan sürüm sözleşmesi (`version-contract`); `diffCards`.
- `server/src/db/`: Bağlantı havuzu, bağlantı kontrolü ve migration çalıştırıcısı.
- `server/migrations/`: Sıra numaralı SQL dosyaları.
- `server/playground/`: TypeScript, bağlantı havuzu, zod ve WebSocket alıştırmaları.
- `web/`: React + TypeScript arayüzü (Vite); saf fonksiyonların testleri `src/*.test.ts` dosyalarında.
- `compose.yaml`: PostgreSQL 18 (`127.0.0.1:5433`) ve Redis 8.8 (`127.0.0.1:6380`), Docker.

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

## Depolar

`STORE=memory` geliştirme için geçici bellek deposunu, `STORE=postgres` kalıcı PostgreSQL deposunu seçer. Her ikisi de aynı `Promise` döndüren `CardStore` arayüzünü uygular; HTTP katmanı depo çağrılarını `await` ile bekler.

PostgreSQL deposu parametreli sorgular kullanır. Kart taşıma ve silme, ortak `changeBoard` yardımcısında bir bağlantıda transaction açar ve panonun mevcut kart satırlarını `FOR UPDATE` ile kilitler. `moveCard` veya `removeCard` sonucunu önceki listeyle karşılaştıran `diffCards`, silinecek kartları ve yalnız `status` ya da `position` değeri değişen satırları seçer. Bu farklar yazılıp işlem `COMMIT` edilir; hata durumunda `ROLLBACK` yapılır. Bağlantı `finally` içinde havuza bırakılır.

Kart sorgularından dönen satırlar `CardRowSchema` ile çalışma anında doğrulanır. Şema, veritabanındaki `board_id` ve `created_at: Date` alanlarını kontrol edip `boardId` ve ISO tarih metni içeren `Card` biçimine dönüştürür. Beklenmeyen bir satır biçimi sunucuda `ZodError` oluşturur; HTTP yanıtı `500 INTERNAL_ERROR` olur.

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

## Redis ile Birden Fazla Sunucu

`PUBSUB=redis` seçildiğinde olayın yolu:

```text
HTTP isteği --> store (kalıcı yazma) --> relay.publish --> Redis: PUBLISH board:<id> <olay JSON>
Redis --> her sunucunun abone bağlantısı (PSUBSCRIBE board:*) --> JSON + BoardEventSchema --> hub.publish --> o sunucunun soketleri
```

- Yayın tek yoldan gider: sunucu kendi olayını da Redis'ten geri alarak dağıtır. Redis komutları sırayla işlediği için bütün sekmeler olayları aynı sırayla görür.
- Her sunucuda iki Redis bağlantısı vardır: yayın bağlantısı (`disableOfflineQueue`: Redis yokken komutu bekletmez, hemen hata verir) ve abone bağlantısı (`duplicate()` ile aynı ayarlardan).
- Redis'ten gelen mesaj dışarıdan gelen veridir: JSON'a ve `BoardEventSchema`'ya uymayan mesaj kaydedilip atılır.
- Redis koparsa HTTP yazmaları sürer, olaylar kaybolur (“Redis'e yayınlanamadı”). Abone bağlantısı geri gelince her sunucu soketlerini `1012` “Yeniden eşitleme” ile kapatır; arayüz yeniden bağlanır ve panoyu baştan çeker.
- Redis kapalıyken sunucu açılmaz: bağlanana kadar yaklaşık 2 saniyede bir yeniden dener.
- Redis'te kalıcılık kapalıdır (`--save ""`, `--appendonly no`): yeniden başlayınca içi boştur. Redis olayları taşır ve süreli üye kayıtlarını tutar; kartlar PostgreSQL'de kalır. Aktif bağlantıların üyelikleri tazeleme ve yeniden eşitlemeyle tekrar oluşur.

## Panodakiler (Üye Listesi)

| Kavram | Anlamı |
| --- | --- |
| Üye | Bir WebSocket bağlantısı: `{ connectionId, name }`; aynı kişinin iki sekmesi iki üyedir. |
| `presence:board:<id>` | Redis hash'i; alan `connectionId`, değer ad, her alanın kendi süresi 15 saniyedir. |
| Tazeleme | Her sunucu 5 saniyede bir kendi bağlantılarının süresini `HSETEX` ile baştan başlatır. |
| `members_changed` | Katılma ve ayrılmada yayınlanan olay; arayüz listeyi `GET /api/boards/:boardId/members` ile yeniden çeker. |

- Sunucu düzgün kapanırsa (`SIGTERM`, `SIGINT`) kendi üyelerini siler ve değişikliği duyurur; liste diğer sekmelerde hemen güncellenir.
- Sunucu çökerse (`kill -KILL`) ayrılışı duyuramaz. Tazelenmeyen kayıtlar en geç 15 saniyede Redis'ten kendiliğinden düşer; süre dolması bir olay üretmez. Bu yüzden arayüz listeyi 5 saniyede bir yeniden sorar ve düşen üye normal koşullarda en geç yaklaşık 20 saniyede ekrandan gider.
- Tazeleme `HSETEX ... PX` ile yapılır. Düz `HSET`, alanın süresini siler; kayıt artık kendiliğinden düşmez.
- Ad el sıkışmada `MemberNameSchema` ile doğrulanır. Arayüz adı tarayıcıda (`localStorage`) saklar, ilk açılışta “Misafir NNN” verir; ad değişince bağlantı yeni adla yeniden kurulur.
- Bağlantı koptuğunda arayüz üye listesini gizler: kopuk sekmenin elindeki liste eskidir.
- Üye deposu sözleşmesi (`server/src/realtime/presence-contract.ts`) iki depoda koşar: `npm test` bellekte, `test:redis` Redis'te.
- `PUBSUB=local` ile üye listesi de bellekte tutulur; bu düzen tek sunucu içindir.

## Doğrulama

Veri beş yerde çalışma anında doğrulanır; aşağıdaki tablo bu beş yeri ve hata sonuçlarını gösterir.

| Veri girişi | Dosya | Şema ve hata sonucu |
| --- | --- | --- |
| İstek gövdesi | `server/src/http/validate.ts` | `NewCardSchema`, `MoveCardSchema`, `UpdateCardRequestSchema` → `400` / `422`. |
| Bağlantı adresi | `server/src/realtime/ws-server.ts` | `boardId`, `MemberNameSchema` → `400`. |
| Veritabanı satırı | `server/src/store/pg-store.ts` | `CardRowSchema`, `BoardRowSchema`, `BoardIdRowSchema` → beklenmeyen satırda `500`. |
| API yanıtı | `web/src/api.ts` | `apiResponseSchema(...)` → `UNEXPECTED_RESPONSE`. |
| Redis mesajı | `server/src/realtime/redis-relay.ts` | `BoardEventSchema` → kaydedilip atılır. |

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
- Olayların sıra numarası yoktur; iki kişi aynı anda kart taşırsa iki ekrandaki sıralama farklı bitebilir (taşıma sürüme bakmaz).
- Sürüm kart düzeyindedir: farklı alanları düzenleyen iki kişiden ikincisi de çakışma görür (tek tıkla yalnız kendi alanlarını yeniden yollar).
- Çakışmada kartı kimin değiştirdiği gösterilmez (kimlik doğrulama yok).
- Kart başka sütuna taşınınca o kartta açık düzenleme formu kapanır, yazılan taslak kaybolur (bileşen yeni sütunda baştan kurulur).
- Redis pub/sub bir olayı en fazla bir kez iletir; Redis kopukken yayınlanan olay kaybolur (abone geri gelince istemciler yeniden eşitlenir).
- Redis kesintisi sürerken arayüz “Canlı” görünür ama hiçbir olay almaz (kendi sunucusununkiler de Redis üzerinden gelir).
- Üye listesi kişi değil bağlantı sayar: aynı ad iki sekmede iki kez görünür. Adın biçimi denetlense de kimlik doğrulanmaz; herkes istediği adı yazabilir.
- Çöken sunucunun üyeleri 15 saniyeye kadar listede kalır; liste 5 saniyede bir yeniden sorulduğu için ekrandan en geç yaklaşık 20 saniyede gider.
- Donan sunucunun (`kill -STOP`) üyeleri 15 saniye sonra listeden düşer, sunucu devam edince tazelemeyle geri gelir.
- Redis kopukken üye listesi alınamaz (`500`); arayüz son listeyi gösterir, Redis gelince yeniden eşitlemeyle dolar.
- Redis'te parola yoktur; yalnız `127.0.0.1`'den erişilir.
- WebSocket bağlantısı için kimlik doğrulama yoktur; adresi bilen her istemci panoyu dinleyebilir.
- Taşıma ve silme sürerken bütün kart butonları kilitlidir; sonuç sunucudan dönünce ekran güncellenir (iyimser güncelleme yoktur).
- Arayüzde yalnız saf fonksiyonların testi vardır; bileşenler tarayıcıda elle denenir.
- Tek pano vardır (id `1`).

## Sonraki Adımlar (taslak)

- İstemci tarafı kalp atışı: donmuş sunucuyu fark edip yeniden bağlanmak.
- Kimlik doğrulama: kartı kimin değiştirdiğini çakışmada göstermek.
- Taşıma için sıra numarası: aynı anda taşınan kartlarda ekranların aynı sırada bitmesi.
- Üye listesini yoklamadan kurtarmak: süre dolunca sunucu tarafında fark edip `members_changed` yayınlamak.
