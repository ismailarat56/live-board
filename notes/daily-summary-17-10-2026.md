# 17.10.2026 Gün Sonu Özeti

## Sınırlama Listesi Bir Borç Defteri

Sınırlama listesi, uygulamada henüz çözülmemiş işleri görünür tutuyor; bir maddeyi kaldırmak için davranışın gerçekten değişmiş olması gerekiyor. Bugün bütün kartları yeniden yazma, pano satırlarında yalnız TypeScript tipine güvenme, otomatik yeniden bağlanamama ve silme ucunun eksikliği kapandı. Donmuş sunucuyu fark edememe ve aynı alanı iki kişinin düzenlemesi ise listede ayrıca izlenecek iki sorun oldu.

## Söz Yerine Kontrol: Pano Satırları

Bir sorgunun sonucuna TypeScript tipi yazmak, veritabanından gelen değerin çalışma anında o biçimde olduğunu kanıtlamıyor. Kartların yanında pano ve pano kimliği satırları da zod şemalarından geçirilerek uygulamaya alınmadan kontrol ediliyor. Beklenmeyen satır biçimi böylece sessizce ilerlemek yerine sunucu hatası olarak ortaya çıkıyor.

## Üç Durum: Yok, null, Değer

Düzenleme isteğinde alanın hiç gönderilmemesi mevcut değeri korumak, açıklamanın null gönderilmesi ise onu silmek anlamına geliyor; bir değer gönderildiğinde alan yenileniyor. SQL'deki CASE WHEN, alanın gönderilip gönderilmediğini ayrıca değerlendirerek bu üç anlamı ayırıyor. Böylece iki kişi farklı alanları değiştirirse birbirlerinin kaydını ezmiyor, aynı alanı değiştirirse son kaydedilen değer kalıyor.

## Olay Ne Taşımalı

Düzenleme olayına bütün kartı koymak, geciken bir mesajın daha yeni bir taşımanın sütununu ve sırasını geri almasına yol açabilir. Bu yüzden card_updated, kartın kimliğiyle birlikte yalnız başlık ve açıklamayı taşıyor; istemci de yalnız bu alanları değiştiriyor. Bu sınır taşıma bilgisini koruyor, ancak düzenleme olaylarının kendi aralarındaki sıralama sorununu çözmüyor.

## Yalnız Değişen Satırlar ve xmin

Taşıma ve silme sonrasında önceki kart listesiyle yeni liste karşılaştırılıyor; diffCards silinen kartları ve konumu değişen satırları ayırıyor. Böylece aynı panoda bulunması, değişmeyen bir kartın yeniden yazılması için yeterli olmuyor. PostgreSQL'in satır sürümünü oluşturan işlemi gösteren xmin alanını işlem öncesi ve sonrası karşılaştırmak, dokunulmaması gereken satırların yeniden yazılmadığını kontrol etmeye yardımcı olabilir.

## İki Dünya, İki tsconfig

Tarayıcı koduyla Node üzerinde çalışan testler aynı ortamın küresel değişkenlerini kullanmıyor. tsconfig.app.json DOM tiplerini açıp Node tiplerini ve testleri dışarıda bırakırken tsconfig.node.json Vite ayarıyla testleri Node tipleriyle, DOM olmadan kontrol ediyor. Ana tsconfig.json bu iki dosyaya işaret ediyor; typecheck de ikisini ayrı ayrı çalıştırıyor.

## Yeniden Bağlanma: Bekle, Saparak Bekle, Temizle

Bağlantı kapanınca yeniden denemenin bekleme üst sınırı 1, 2, 4 saniye diye büyüyüp 30 saniyede duruyor; gerçek süre bu sınırın yarısıyla tamamı arasından rastgele seçiliyor. Bu sapma, çok sayıda istemcinin aynı anda sunucuya yüklenmesini azaltıyor; welcome mesajı geldiğinde deneme sayacı sıfırlanıyor ve pano yeniden çekiliyor. Bağlantıyı yöneten etki temizlenirken zamanlayıcı, soket ve çevrimiçi olma dinleyicisi de temizlenerek eski bağlantının yeniden deneme başlatması önleniyor.

## Sinyaller ve Düzgün Durma

SIGTERM veya SIGINT alındığında sunucu WebSocket bağlantılarını 1001 koduyla kapatıyor, ardından HTTP sunucusunu ve veritabanı havuzunu kapatıp çıkıyor. Bu sıra, istemcinin kopmayı görüp yeniden bağlanmayı denemesini ve sunucu kaynaklarının bırakılmasını sağlıyor. Kapanış takılı kalırsa beş saniyelik sınır sonunda süreç zorla sonlandırılıyor.

## Yanıldığım İki Tahmin

Sunucudaki kalp atışının donmuş sunucuyu da istemciye fark ettireceği tahmini eksik kalıyor; süreç durdurulunca kalp atışı da duruyor ve arayüz bağlantıyı açık sanabiliyor. İkinci yanlış tahmin, düzenleme olayında bütün kartı göndermenin zararsız olması; eski bir olay güncel taşıma bilgisini geri alabilir. İstemcinin bağlantıyı ayrıca denetlemesi ve olayın yalnız sorumlu olduğu alanları taşıması iki ayrı ihtiyacı karşılıyor.

## En Çok Zorlandığım Konu

En zor konu, kısmi düzenleme ile gecikmiş olayların aynı kart üzerinde nasıl birleştiğini düşünmek oldu. Gönderilmeyen alanı korumak veritabanında doğru güncellemeyi sağlarken, olayın kapsamını daraltmak istemcide başka bir değişikliğin geri alınmasını önlüyor. Bu iki korumanın olay sırasını ve aynı alandaki çakışmayı bütünüyle çözmediğini ayırmak, kalan borcu doğru tarif etmeyi sağlıyor.
