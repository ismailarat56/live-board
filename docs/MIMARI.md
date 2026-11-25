[← README'ye dön](../README.md)

# Mimari

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

## Depolar

`STORE=memory` geliştirme için geçici bellek deposunu, `STORE=postgres` kalıcı PostgreSQL deposunu seçer. Her ikisi de aynı `Promise` döndüren `CardStore` arayüzünü uygular; HTTP katmanı depo çağrılarını `await` ile bekler.

PostgreSQL deposu parametreli sorgular kullanır. Kart taşıma ve silme, ortak `changeBoard` yardımcısında bir bağlantıda transaction açar ve panonun mevcut kart satırlarını `FOR UPDATE` ile kilitler. `moveCard` veya `removeCard` sonucunu önceki listeyle karşılaştıran `diffCards`, silinecek kartları ve yalnız `status` ya da `position` değeri değişen satırları seçer. Bu farklar yazılıp işlem `COMMIT` edilir; hata durumunda `ROLLBACK` yapılır. Bağlantı `finally` içinde havuza bırakılır.

Kart sorgularından dönen satırlar `CardRowSchema` ile çalışma anında doğrulanır. Şema, veritabanındaki `board_id` ve `created_at: Date` alanlarını kontrol edip `boardId` ve ISO tarih metni içeren `Card` biçimine dönüştürür. Beklenmeyen bir satır biçimi sunucuda `ZodError` oluşturur; HTTP yanıtı `500 INTERNAL_ERROR` olur.

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
