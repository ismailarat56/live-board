# Görev 7 — Kart sürüm kontrolünü kendin yazma rehberi

Bu rehber mevcut projendeki dört iskeleti doldurman için hazırlanmıştır. Kod blokları uygulama dosyalarına henüz yazılmadı. Önce her bölümdeki mantığı oku, kendin dene, ardından örnek kodla karşılaştır.

Bu görev sonunda `typecheck` temiz; server testleri 104/104, web testleri 12/12, PostgreSQL testleri 18/18 olmalı. Bunlar aşağıdaki kodları uyguladıktan sonra ulaşacağın beklenen sonuçlardır. Commit veya push bu rehberin parçası değil.

## 1. Başlamadan önce

Komutlar Bash içindir. Gerekirse terminalde `bash` çalıştır. Aksi belirtilmedikçe komutları `live-board` kökünde çalıştır:

```bash
cd /var/www/html/PHPExample/live-board
```

Önceki görevlerde eklenen `version` sütunu, migration, istek şemaları, depo arayüzü ve testler hazır. Bu görevde `memory-store.ts` ve `pg-store.ts` üzerinde çalışacaksın. PostgreSQL dosyasında ayrıca silmenin kullandığı `changeBoard` yardımcısını ve onun sonucunu kullanan `move` metodunu uyarlaman gerekiyor. Taşımanın davranışı aynı kalacak.

Eski metotları görmek için şu salt okunur komutları kullanabilirsin:

```bash
git show HEAD:server/src/store/memory-store.ts
git show HEAD:server/src/store/pg-store.ts
```

Buradaki `HEAD`, henüz commit edilmemiş önceki görevlerin değişikliklerini içermez. Eski dosyanın tamamını çalışma dosyanın üstüne yazma; örneğin `version` sütununu okuyan eklemeleri kaybedersin. Eski kodu yalnız karşılaştırmak için aç.

## 2. İki deponun ortak karar sırası

| Kontrol | Düzenleme | Silme |
| --- | --- | --- |
| Kart yok | `{ kind: "not_found" }` | `{ kind: "not_found" }` |
| Kart var, sürüm farklı | `{ kind: "conflict", currentVersion }` | `{ kind: "conflict", currentVersion }` |
| Kart var, sürüm aynı | Alanları güncelle, sürümü bir artır, `updated` dön | Kartı kaldır, sıraları düzelt, `deleted` dön |

`expectedVersion`, istemcinin gördüğü sürümdür. Karşılaştırma `!==` olmalı: yalnız eski sürüm değil, kartın sürümünden büyük bir değer de çakışmadır.

`description` için üç durum vardır:

| Gelen değer | Yapılacak iş |
| --- | --- |
| `undefined` / alan hiç yok | Mevcut açıklamayı koru |
| `null` | Açıklamayı temizle |
| Metin | Yeni metni yaz |

Bu nedenle `input.description ?? current.description` kullanamazsın: `null` gönderildiğinde de eski açıklamayı korur. Yalnız `undefined` durumunu ayırmalısın.

## 3. Önce bellekteki depo

Başlangıçtaki kırmızı testleri gör:

```bash
cd server
node --test src/store/memory-store.test.ts
cd ..
```

Beklenti: 10 test, 2 başarılı, 8 başarısız. Yeni kart oluşturmak ve kart taşımak zaten çalışıyor.

### 3.1. Bellekte `updateCard`

Dosya: `server/src/store/memory-store.ts`.

Önce kendin şu sırayı kur: kartı bul → yoksa dön → sürümü karşılaştır → yeni kart nesnesini üret → dizide değiştir → sonucu dön.

Mevcut `async updateCard(...) { ... },` iskeletinin tamamını şu metotla değiştir:

```typescript
async updateCard(cardId, input, expectedVersion) {
  const current = cards.find((card) => card.id === cardId);

  if (current === undefined) {
    return { kind: "not_found" };
  }

  if (current.version !== expectedVersion) {
    return { kind: "conflict", currentVersion: current.version };
  }

  const updated: Card = {
    ...current,
    title: input.title ?? current.title,
    description:
      input.description === undefined ? current.description : input.description,
    version: current.version + 1,
  };

  cards = cards.map((card) => (card.id === cardId ? updated : card));

  return { kind: "updated", card: updated };
},
```

`...current` ile `id`, `boardId`, `status`, `position` ve `createdAt` korunur. Ardından yalnız düzenlenebilir alanlar ve sürüm değiştirilir. `title` şeması `null` kabul etmediği için başlıkta `??` kullanılabilir.

Sürüm kontrolünden önce hiçbir yazma yapmadık. `conflict` döndüğünde `cards` dizisi de, içindeki kart da değişmedi.

### 3.2. Bellekte `deleteCard`

Aynı dosyadaki silme iskeletini değiştir:

```typescript
async deleteCard(cardId, expectedVersion) {
  const current = cards.find((card) => card.id === cardId);

  if (current === undefined) {
    return { kind: "not_found" };
  }

  if (current.version !== expectedVersion) {
    return { kind: "conflict", currentVersion: current.version };
  }

  const next = removeCard(cards, cardId);

  if (next === null) {
    return { kind: "not_found" };
  }

  cards = next;

  return { kind: "deleted", boardId: current.boardId };
},
```

`removeCard` hem kartı kaldırır hem aynı sütundaki sıraları düzeltir. Sürüm kontrolünden sonra çağrıldığı için çakışan silme isteği sıraları da değiştiremez.

Kartı zaten bulduk ve arada `await` yok; bu akışta `removeCard`'ın `null` döndürmesini beklemiyoruz. Yine de fonksiyonun dönüş tipi `Card[] | null` olduğu için bu olasılığı ele alıyoruz. `next!` ile tip kontrolünü susturmaya gerek yok.

Bu iki metodun içinde `await` bulunmadığından, kartı bulma ile değiştirme arasında başka bir JavaScript işi araya girmez. Metotların `async` olması tek başına bu senkron gövdeyi parçalara ayırmaz.

### 3.3. Bellek kontrolü

```bash
cd server
node --test src/store/memory-store.test.ts
cd ..
npm run typecheck
npm test
```

Beklenen:

- Bellek sözleşmesi: 10/10.
- Typecheck: temiz.
- Server: 104/104.
- Web: 12/12.

`npm test` PostgreSQL entegrasyon dosyasını çalıştırmaz. Dolayısıyla PostgreSQL iskeletleri hâlâ dururken bu aşama yeşil olabilir.

## 4. PostgreSQL: sürüm koşulunu UPDATE'in içine koy

Dosya: `server/src/store/pg-store.ts`.

### 4.1. Veritabanından okunacak sürüm için şema

`BoardIdRowSchema` tanımının altına, `createPgStore` fonksiyonunun dışına şunu ekle:

```typescript
const CardVersionRowSchema = z.object({
  version: z.number().int().positive(),
});
```

Dosyada `z` zaten import ediliyor. Ayrı bir import eklemene gerek yok. Bu şema, başarısız UPDATE sonrasında okuyacağımız satırı doğrulayacak.

### 4.2. PostgreSQL'de `updateCard`

`return { ... }` içindeki `updateCard` iskeletini aşağıdakiyle değiştir:

```typescript
async updateCard(cardId, input, expectedVersion) {
  const result = await pool.query(
    `UPDATE cards
        SET title = CASE WHEN $2 THEN $3 ELSE title END,
            description = CASE WHEN $4 THEN $5 ELSE description END,
            version = version + 1
      WHERE id = $1 AND version = $6
      RETURNING ${CARD_COLUMNS}`,
    [
      cardId,
      input.title !== undefined,
      input.title ?? null,
      input.description !== undefined,
      input.description ?? null,
      expectedVersion,
    ]
  );

  const row = result.rows[0];

  if (row !== undefined) {
    return { kind: "updated", card: toCard(row) };
  }

  const current = await pool.query(
    "SELECT version FROM cards WHERE id = $1",
    [cardId]
  );
  const currentRow = current.rows[0];

  if (currentRow === undefined) {
    return { kind: "not_found" };
  }

  return {
    kind: "conflict",
    currentVersion: CardVersionRowSchema.parse(currentRow).version,
  };
},
```

Parametreleri SQL ile yan yana oku:

| Parametre | İçeriği | Görevi |
| --- | --- | --- |
| `$1` | `cardId` | Hedef kart |
| `$2` | Başlık gönderilmiş mi? | Başlığın değişip değişmeyeceği |
| `$3` | Yeni başlık | Yazılacak başlık |
| `$4` | Açıklama gönderilmiş mi? | Açıklamanın değişip değişmeyeceği |
| `$5` | Yeni açıklama veya `null` | Yazılacak açıklama |
| `$6` | `expectedVersion` | Yazma izninin sürüm koşulu |

`$4` doğru ve `$5` null olduğunda açıklama temizlenir. `$4` yanlışsa `$5` kullanılmaz; eski açıklama korunur.

Asıl koruma `WHERE id = $1 AND version = $6` içindedir. Kontrol ile yazma aynı SQL ifadesindedir. Aynı kartın 1. sürümünü değiştirmeye çalışan iki sorgudan ilk başarılı olan sürümü 2 yapar; diğer sorgu artık 1. sürüm koşulunu sağlayamaz.

Satır dönmezse nedenini ayırmak için SELECT yapıyoruz. Bu SELECT yeni bir yazmaya izin vermiyor; yalnız `not_found` veya `conflict` yanıtını seçiyor. Başka işlemler arada değişiklik yaparsa bildirilen `currentVersion`, bu sonraki SELECT'in gördüğü sürümdür.

## 5. PostgreSQL: silmenin kontrolünü kilidin içinde yap

Silme yalnız tek satırı kaldırmıyor; komşu kartların sırasını da değiştirebiliyor. Bu yüzden mevcut `changeBoard` işlemini kullanacağız.

### 5.1. `changeBoard` için sonuç tipi

Yine `createPgStore` dışında, şema tanımlarının yanına ekle:

```typescript
type ChangeBoardResult =
  | { kind: "changed"; boardId: number }
  | { kind: "not_found" }
  | { kind: "conflict"; currentVersion: number };
```

`changed` hem taşımayı hem silmeyi kapsayan iç sonuçtur. Dışarıya silme için `deleted` döndüreceğiz. `card-store.ts` dosyasını değiştirmene gerek yok.

### 5.2. `changeBoard` yardımcısını değiştir

`createPgStore` içindeki mevcut `async function changeBoard(...)` fonksiyonunun tamamını aşağıdakiyle değiştir:

```typescript
async function changeBoard(
  cardId: number,
  change: (cards: Card[]) => Card[] | null,
  expectedVersion?: number
): Promise<ChangeBoardResult> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const found = await client.query(
      "SELECT board_id FROM cards WHERE id = $1",
      [cardId]
    );
    const row = found.rows[0];

    if (row === undefined) {
      await client.query("ROLLBACK");
      return { kind: "not_found" };
    }

    const boardId = BoardIdRowSchema.parse(row).board_id;
    const current = await client.query(
      `SELECT ${CARD_COLUMNS} FROM cards WHERE board_id = $1 FOR UPDATE`,
      [boardId]
    );
    const before = current.rows.map(toCard);
    const target = before.find((card) => card.id === cardId);

    if (target === undefined) {
      await client.query("ROLLBACK");
      return { kind: "not_found" };
    }

    if (expectedVersion !== undefined && target.version !== expectedVersion) {
      await client.query("ROLLBACK");
      return { kind: "conflict", currentVersion: target.version };
    }

    const after = change(before);

    if (after === null) {
      await client.query("ROLLBACK");
      return { kind: "not_found" };
    }

    const { removed, changed } = diffCards(before, after);

    for (const id of removed) {
      await client.query("DELETE FROM cards WHERE id = $1", [id]);
    }

    for (const card of changed) {
      await client.query(
        "UPDATE cards SET status = $1, position = $2 WHERE id = $3",
        [card.status, card.position, card.id]
      );
    }

    await client.query("COMMIT");

    return { kind: "changed", boardId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
```

İşlem sırasını kodda takip et:

1. İlk SELECT yalnız pano kimliğini buluyor; sürüm kararını vermiyor.
2. `FOR UPDATE` ile panodaki mevcut kart satırları kilitleniyor.
3. Hedef kart, bu sorgudan dönen `before` dizisinde yeniden bulunuyor. İlk SELECT ile kilitli okuma arasında silinmiş olabilir.
4. `expectedVersion` verilmişse sürüm karşılaştırılıyor. Çakışmada `ROLLBACK` yapılıp hiçbir yazma olmadan dönülüyor.
5. Değişiklik hesaplanıyor, yalnız silinen ve sırası değişen satırlar yazılıyor.
6. `COMMIT` veya `ROLLBACK` işlemi bitiriyor; `finally` bağlantıyı her durumda havuza bırakıyor.

Buradaki bütün transaction sorguları aynı `client` üzerinden gider. Aralarına `pool.query` koyma: havuz başka bir bağlantı seçebilir.

Sıralama UPDATE'inde `version` yok. Komşu kartların kayması veya taşıma sürüm artırmaz. Bu görevde sürümü artıran yer yalnız `updateCard`'dır.

### 5.3. `move` sonucunu yeni iç tipe uyarla

`changeBoard` artık sayı veya null döndürmediği için PostgreSQL deposunun `move` metodundaki sonuç okuma biçimi değişmeli. Bellek deposunun `move` metoduna dokunma.

PostgreSQL dosyasındaki `move` metodunu şu biçimde yaz:

```typescript
async move(cardId, target) {
  const result = await changeBoard(cardId, (cards) =>
    moveCard(cards, cardId, target)
  );

  return result.kind === "changed" ? listCards(result.boardId) : null;
},
```

Üçüncü parametreyi vermedik. Böylece taşıma için sürüm kontrolü yapılmaz; başarılı taşıma yine kart listesini, bulunamayan kart yine null döndürür. `conflict` dalı ancak `expectedVersion` verilince oluşabildiği için bu çağrıda beklenmez.

### 5.4. PostgreSQL'de `deleteCard`

Silme iskeletini değiştir:

```typescript
async deleteCard(cardId, expectedVersion) {
  const result = await changeBoard(
    cardId,
    (cards) => removeCard(cards, cardId),
    expectedVersion
  );

  if (result.kind !== "changed") {
    return result;
  }

  return { kind: "deleted", boardId: result.boardId };
},
```

`not_found` ve `conflict`, dış sözleşmeyle zaten aynı biçimde. Onları doğrudan döndürüyoruz. `changed` sonucunu ise `deleted` adına çeviriyoruz.

### 5.5. PostgreSQL kontrolü

Kökte çalıştır:

```bash
npm run typecheck
npm test
npm run test:db -w @live-board/server
```

Beklenti: typecheck temiz; server 104/104, web 12/12, PostgreSQL 18/18.

Yarış testi kendi içinde 20 tur yapar. Her turda yeni kart açar; aynı sürümü kullanan iki güncellemeden birinin `updated`, diğerinin `conflict` dönmesini bekler. Test sayısı bu yüzden 20 artmaz: bu tek testin içindeki döngüdür.

## 6. HTTP üzerinden çakışmayı gör

Bu deneyi arayüz yerine curl ile yap. Arayüzün sürüm gönderme değişiklikleri bu görevin kapsamına dahil değil.

### Terminal A — sunucu

Kökte PostgreSQL ve Redis servislerinin çalıştığından emin ol:

```bash
docker compose up -d db redis
STORE=postgres PORT=4000 npm run dev:server
```

`STORE=postgres` bu deneyin gerçekten PostgreSQL deposuyla yapılmasını sağlar. `server/.env` içindeki `DATABASE_URL` ve Redis kullanılıyorsa `REDIS_URL` ayarları mevcut kurulumdaki gibi kalır. Başlangıç mesajında `depo: postgres` görmelisin. Zaten 4000 portunda sunucu çalışıyorsa ikinci bir tane açmak yerine mevcut sunucu terminalini kullan.

### Terminal B — ilk güncelleme ve eski sürüm

Bu terminal Bash olmalı; komutlar ayrıca `curl` ve `jq` kullanır.

```bash
ID=$(curl -sS -X POST localhost:4000/api/boards/1/cards \
  -H 'content-type: application/json' \
  -d '{"title":"Sürümlü kart"}' | jq -er .data.id)

curl -sS -X PATCH "localhost:4000/api/cards/$ID" \
  -H 'content-type: application/json' \
  -d '{"title":"İlk düzenleme","expectedVersion":1}' \
  | jq -c '{title: .data.title, version: .data.version}'
```

Beklenen:

```json
{"title":"İlk düzenleme","version":2}
```

Eski sürümle bir daha gönder:

```bash
curl -sS -X PATCH "localhost:4000/api/cards/$ID" \
  -H 'content-type: application/json' \
  -d '{"title":"İlk düzenleme","expectedVersion":1}' | jq -c .
```

Beklenen yanıt:

```json
{"success":false,"error":{"code":"VERSION_CONFLICT","message":"Kart bu arada değişti; güncel sürüm 2."}}
```

### İki isteği aynı anda gönder

Aşağıdaki bloğu Terminal B'de çalıştır. Beş turun her biri yeni bir kart oluşturur:

```bash
for round in 1 2 3 4 5; do
  ID=$(curl -sS -X POST localhost:4000/api/boards/1/cards \
    -H 'content-type: application/json' \
    -d '{"title":"Yarış kartı"}' | jq -er .data.id) || break

  printf '\nTur %s, kart %s\n' "$round" "$ID"

  (
    curl -sS -o /dev/null -w 'A: %{http_code}\n' \
      -X PATCH "localhost:4000/api/cards/$ID" \
      -H 'content-type: application/json' \
      -d '{"title":"A yazdı","expectedVersion":1}' &

    curl -sS -o /dev/null -w 'B: %{http_code}\n' \
      -X PATCH "localhost:4000/api/cards/$ID" \
      -H 'content-type: application/json' \
      -d '{"title":"B yazdı","expectedVersion":1}' &

    wait
  )
done
```

Her turda bir `200`, bir `409` beklenir. A veya B'nin kazanması ve çıktı satırlarının sırası değişebilir. Kazananın mutlaka değişmesi gerekmez. Parantezli grup, `wait` komutunu yalnız bu iki arka plan isteğiyle sınırlar.

Curl ile oluşturduğun kartlar panoda kalır; entegrasyon testlerinin geçici test panosundan ayrıdır.

## 7. Bilerek boz: önce oku, sonra yaz

Bu deney, sıralı testlerden geçen kodun eşzamanlı isteklerde neden yanlış olabileceğini gösterecek. Önce 18 PostgreSQL testinin geçtiğini gör; sonra bu bölüme geç.

### 7.1. Çalışan dosyanı yedekle

Kökte, Terminal B'de:

```bash
PG_STORE_BACKUP=$(mktemp /tmp/live-board-pg-store.XXXXXX)
cp server/src/store/pg-store.ts "$PG_STORE_BACKUP"
printf 'Çalışan dosyanın yedeği: %s\n' "$PG_STORE_BACKUP"
```

Bu terminali açık tut veya yazdırılan yolu not al. Yedek, henüz commit etmediğin çalışan sürümü içerir. Deneyden dönmek için `git restore` kullanma; bu görevde yazdığın kodu ve önceki commit edilmemiş değişiklikleri kaldırır.

**Tahmin:** Sıralı testler geçer; yarış testinde iki istek de `updated` dönebilir. Hata yalnız iki okuma da ilk yazmadan önce tamamlandığında görünür.

### 7.2. Yalnız PostgreSQL `updateCard` metodunu geçici olarak değiştir

Aşağıdaki kod bilerek yanlıştır. Deney sonunda kalıcı bırakma:

```typescript
async updateCard(cardId, input, expectedVersion) {
  const current = await pool.query(
    "SELECT version FROM cards WHERE id = $1",
    [cardId]
  );
  const currentRow = current.rows[0];

  if (currentRow === undefined) {
    return { kind: "not_found" };
  }

  const currentVersion = CardVersionRowSchema.parse(currentRow).version;

  if (currentVersion !== expectedVersion) {
    return { kind: "conflict", currentVersion };
  }

  const result = await pool.query(
    `UPDATE cards
        SET title = CASE WHEN $2 THEN $3 ELSE title END,
            description = CASE WHEN $4 THEN $5 ELSE description END,
            version = version + 1
      WHERE id = $1
      RETURNING ${CARD_COLUMNS}`,
    [
      cardId,
      input.title !== undefined,
      input.title ?? null,
      input.description !== undefined,
      input.description ?? null,
    ]
  );
  const row = result.rows[0];

  if (row === undefined) {
    return { kind: "not_found" };
  }

  return { kind: "updated", card: toCard(row) };
},
```

Yanlışlık şu aralıkta:

| Zaman | A isteği | B isteği |
| --- | --- | --- |
| 1 | SELECT → sürüm 1 | |
| 2 | | SELECT → sürüm 1 |
| 3 | `1 === expectedVersion`, devam | `1 === expectedVersion`, devam |
| 4 | UPDATE → başlık A, sürüm 2 | |
| 5 | | UPDATE → başlık B, sürüm 3 |
| 6 | `updated` | `updated` |

İki istemci de sürüm 1 üzerinden yazmasına rağmen ikisi de başarılı oldu. `version = version + 1` hâlâ var; tek başına sürüm artırmak koruma sağlamıyor. Koruma, aynı UPDATE'in `WHERE` koşulunda sürümü karşılaştırmaktı.

### 7.3. Testi ve HTTP yarışını tekrar çalıştır

```bash
npm run test:db -w @live-board/server
```

Beklenen gözlem: 18 testten 17'si geçer; “aynı sürümle gelen iki eşzamanlı düzenlemeden yalnız biri kazanır” testi kırılır. Başarısız turdaki sonuçlar `conflict, updated` yerine `updated, updated` olur. Sözleşmenin sıralı on testi yeşil kalır.

Yarış zamanlamaya bağlıdır. Bozuk kodla bir çalıştırmanın tesadüfen yeşil olması kodu doğru yapmaz; testi yeniden çalıştır. Hatanın mutlaka belirli bir turda çıkacağını varsayma.

Terminal A'da `--watch` dosyayı yeniden yükleyince, bölüm 6'daki beş turluk curl bloğunu yeniden çalıştır. Bazı turlarda `A: 200` ve `B: 200` görebilirsin. Yeni kartı her turda açmak önemlidir; daha önce değişmiş bir kartta `expectedVersion: 1` kullanmak bu yarışı göstermez.

### 7.4. Doğru kodu geri koy

Öğrenme için bölüm 4.2'deki doğru `updateCard` metodunu elle geri yazabilirsin. Yalnız WHERE'e koşul eklemekle yetinme: baştaki SELECT'i de kaldırıp hata ayırma sorgusunu başarısız UPDATE'in arkasına taşı.

Alternatif olarak, yedekten yalnız bu metodu karşılaştırıp al. Deney sırasında dosyada başka bir değişiklik yapmadıysan tamamını da geri kopyalayabilirsin:

```bash
cp "$PG_STORE_BACKUP" server/src/store/pg-store.ts
```

Son kontrol:

```bash
npm run typecheck
npm test
npm run test:db -w @live-board/server
git diff --check
git diff -- server/src/store/memory-store.ts server/src/store/pg-store.ts
```

Beklenen sonuçlar yine typecheck temiz, server 104/104, web 12/12, PostgreSQL 18/18. Bunları görmeden görevi bitmiş sayma.

## 8. Takılırsan nereye bakmalısın?

| Belirti | Kontrol et |
| --- | --- |
| `description: null` eski açıklamayı koruyor | Bellekte yalnız `undefined` kontrol edilmeli; SQL'de `$4` ve `$5` farklı görevlerde |
| Olmayan karta `conflict` dönüyor | Kartın varlığını sürüm karşılaştırmasından önce kontrol et |
| Karttan büyük sürüm kabul ediliyor | `<` yerine `!==` kullan |
| Yarışta iki `updated` geliyor | UPDATE'in WHERE'inde `version = $6` var mı? |
| Silme eski sürümü kabul ediyor | Kontrol, `FOR UPDATE` sorgusundan sonra mı? |
| Taşıma veya komşu kartlar sürüm artırıyor | `changeBoard` içindeki sıralama UPDATE'ine `version` ekleme |
| Silme sonrası sıralar bozuluyor | `removeCard` ve mevcut `diffCards` akışını kullan |
| `move` için tip hatası çıkıyor | `changeBoard` artık sayı değil, `ChangeBoardResult` döndürüyor |
| API hâlâ 500 dönüyor | İskelet `throw` satırları kaldı mı, sunucu son dosyayı yükledi mi? |
| Bozuk PostgreSQL koduyla curl hep bir 200/bir 409 veriyor | Başlangıç mesajında `depo: postgres` yazıyor mu? Yarış zamanlaması nedeniyle tekrar denemen de gerekebilir |

Görevin bitişinde dört iskelet dolmuş, doğru sürüm kontrolü geri yüklenmiş ve bütün testler yeşil olmalı. Dosyalar sen commit kararı verene kadar çalışma ağacında kalabilir.
