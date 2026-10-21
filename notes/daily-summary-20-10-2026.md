# 20.10.2026 Gün Sonu Özeti

## Kaybolan Güncelleme

İki kişi aynı kartın eski halini açıp kaydettiğinde, ikinci kayıt ilk kişinin değişikliğini fark ettirmeden ezebiliyor. Kartın sürümünü isteğe ekleyince sunucu, kullanıcının gördüğü halin hâlâ güncel olup olmadığını kontrol ediyor. Sürüm değişmişse kayıt reddediliyor ve önceki değişiklik korunuyor.

## Kötümser ve İyimser Kilit

Kötümser kilit, işlem bitene kadar ilgili satırları başka yazmalara karşı kilitleyerek çalışıyor; silmede komşu kartların sırası da değiştiği için bu yaklaşım kullanılıyor. İyimser kilitte ise kullanıcı formu doldururken veritabanında kilit tutulmuyor, kaydetme anında sürüm karşılaştırılıyor. Düzenlemede sürüm koşulu ve yazma aynı komutta olduğu için araya başka bir güncelleme giremiyor.

## Arka Plan İşleri ve Aynı Anda İki İstek

Terminalde iki isteği arka planda başlatmak, birinin bitmesini beklemeden diğerini göndermeyi sağlıyor. İki istek aynı kartın aynı sürümünü kullanınca yalnız birinin başarılı olması, diğerinin çakışma alması gerekiyor. Bu deneme bir iş kuyruğu kurmuyor; eşzamanlı yazma davranışını görünür hale getiriyor.

## Dolu Tabloya Sütun Eklemek

Kart tablosuna sürüm alanı eklenirken mevcut kayıtların da geçerli bir başlangıç değeri alması gerekiyor. Varsayılan değerin 1 olması eski ve yeni kartları aynı kurala bağlıyor; boş değer yasağı ve pozitif sayı kısıtı da geçersiz kayıtları engelliyor. Değişiklik ayrı bir migration olarak tutulduğu için kurulu veritabanına sırayla uygulanabiliyor.

## Kendi Yazdığım Sürüm Kontrolü

## Önce Oku Sonra Yaz Neden Yetmez

Sürümü önce okuyup sonra ayrı bir komutla yazarsam iki istek de ilk okumada aynı sürümü görüp devam edebilir. Sürüm karşılaştırmasını güncelleme komutunun koşuluna taşımak, kontrolü yazma işleminin parçası yapıyor. PostgreSQL yarış testi aynı sürümle iki güncellemeyi birlikte başlatarak yalnız birinin kazanmasını denetliyor.

## Olaylarda Sürüm ve Geç Gelen Eski Veri

Bir HTTP yanıtı ya da canlı güncelleme olayı, daha yeni bir değişiklikten sonra ekrana ulaşabilir. İstemci yalnız elindeki sürümden büyük olan düzenlemeyi uygulayarak eski verinin yeni başlığı ve açıklamayı ezmesini önlüyor. Düzenleme olayının sütuna ve sıraya dokunmaması da geç gelen bir olayın kartı eski konumuna götürmesini engelliyor.

## Arayüzde Çakışma: Taslağı Korumak

Düzenleme formu açıldığı andaki sürümü saklıyor ve ilk kayıtta bu sürümü gönderiyor. Çakışma yanıtında yazılanlar formda kalırken pano yeniden okunuyor ve kartın güncel içeriği gösteriliyor. Kullanıcı yeniden kaydetmeyi seçerse yalnız değiştirdiği alanlar güncel sürümle gönderiliyor; arada bir değişiklik daha olursa yeniden çakışma alabiliyor.

## Yanıldığım İki Tahmin

Sürümü artırmanın tek başına kaybolan güncellemeyi önleyeceği düşüncesi eksik: beklenen sürüm aynı yazma komutunda karşılaştırılmalı. Farklı alanları değiştiren iki kişinin hiç çakışmayacağı düşüncesi de bu tasarıma uymuyor, çünkü sürüm alan başına değil kart başına tutuluyor. Yeniden kayıtta yalnız değiştirilen alanların gönderilmesi, diğer kişinin farklı alandaki değişikliğini koruyor.

## En Çok Zorlandığım Konu

En zor konu, veritabanındaki doğru yazma sırası ile ekrana ulaşan yanıtların sırasını birlikte düşünmek oldu. Sunucuda sürüm koşulu kaybolan güncellemeyi engellese de istemcinin geç gelen eski veriyi ayrıca elemesi gerekiyor. Aynı sürüm sözleşmesini iki depoda çalıştırmak ve PostgreSQL'de eşzamanlı istekleri denemek, bu sorumlulukları ayrı ayrı kontrol etmeyi kolaylaştırıyor.
