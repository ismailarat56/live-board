# 14.10.2026 Gün Sonu Özeti

## Workspaces ve Sembolik Bağ

npm workspaces, ortak paketi, sunucuyu ve arayüzü kökteki tek kurulum altında topluyor. Bağımlılıklar ve kilit dosyası kökte tutulurken yerel paketler `node_modules` içindeki sembolik bağlarla birbirine bağlanıyor. Böylece sunucu ve arayüz, ortak paketi dosya kopyalamadan adıyla kullanabiliyor.

## Şema ve Çıkarılan Tip

Kartın biçimini zod şemasında tanımlamak, çalışma anındaki kontrol ile TypeScript tipinin aynı kaynaktan beslenmesini sağlıyor. `z.infer` şemadan tipi çıkarıyor; varsayılan değerleri olan yeni kart girdisinde ise doğrulama sonucunun tipi `z.output` ile ifade ediliyor. Ortak şema değiştiğinde iki paketteki uyumsuz kullanımlar tip kontrolünde görünür oluyor.

## Sözleşmeyi Testle Korumak

HTTP testleri yalnız isteğin başarılı olmasına bakmıyor; dönen alanları, durum kodlarını ve hata kodlarını da kontrol ediyor. Böylece doğrulamanın iç yapısı değişse bile boş başlığın reddedilmesi veya yeni kartın beklenen varsayılanlarla dönmesi korunabiliyor. İş kuralı testleri de taşıma sonrasında sıraların doğru hesaplanmasını ve girdinin değiştirilmemesini denetliyor.

## Veri Dışarıdan Üç Yerden Giriyor

İstek gövdesi sunucuya, veritabanı satırı depoya, API yanıtı ise arayüze dışarıdan geliyor. Bu üç sınırda sırasıyla istek şemaları, kart satırı şeması ve API yanıt şeması çalışıyor. Hatalı istekler 400 veya 422, beklenmeyen kart satırı 500, uyumsuz API yanıtı ise arayüzde `UNEXPECTED_RESPONSE` olarak karşılık buluyor.

## any ile unknown

`any`, değerin biçimi bilinmese de alanlarına erişmeye izin vererek tip kontrolünü devre dışı bırakıyor. `unknown` ise değeri kullanmadan önce daraltmayı veya doğrulamayı gerektiriyor. Dışarıdan gelen JSON'u önce `unknown` kabul edip şemadan geçirmek, doğrulanmamış veriye güvenmeyi önlüyor.

## Ayrık Birleşim ile Pano Durumu

Pano durumu yükleniyor, hata ve hazır seçeneklerinden oluşuyor; her seçenek yalnız kendisine ait veriyi taşıyor. Hazır durumunda kartlara, hata durumunda mesaja erişilebilmesi, birbirinden bağımsız bayrakların doğurabileceği tutarsız durumları azaltıyor. `assertNever`, yeni bir seçenek eklendiğinde ele alınmamış dalların tip kontrolünde fark edilmesini sağlıyor.

## tsc'nin Yakaladıkları, Yakalayamadıkları

`tsc`, ortak tiplerle uyuşmayan alan kullanımlarını, yanlış fonksiyon argümanlarını ve eksik durum dallarını yakalayabiliyor. Ağdan gelen JSON'un veya SQL sonucunun gerçekten belirtilen biçimde olduğunu ise kanıtlayamıyor; bunun için çalışma anında doğrulama gerekiyor. Sunucuda DOM tiplerini yüklememek de tarayıcıya ait isimlerin yanlışlıkla kullanılmasını görünür kılıyor.

## Eskiyen Ekran

Pano ilk yüklemede kartları alıyor, ancak başka bir ekrandaki değişiklikleri kendiliğinden öğrenmiyor. Bu yüzden veritabanından silinmiş bir kart ekranda kalabiliyor ve taşınmaya çalışıldığında "Kart bulunamadı." hatası görülebiliyor. Taşıma sırasında butonlar kilitleniyor ve görünüm sunucunun yanıtıyla yenileniyor; ekranlar arasında güncellik için canlı olay aktarımı gerekiyor.

## Yanıldığım İki Tahmin

Burada düzeltilmesi gereken ilk varsayım, sorguya generic tip vermenin dönen veriyi de doğruladığı düşüncesi; bu yalnız derleyiciye verilen bir söz. İkinci varsayım, ortak paketteki tipin API yanıtını tarayıcıda kendiliğinden güvenli hâle getirdiği düşüncesi. Her iki durumda da gerçek veri ancak çalışma anında şemadan geçirilince denetlenmiş oluyor.

## En Çok Zorlandığım Konu

Bu çalışmadaki temel güçlük, derleme zamanındaki güvence ile çalışma anındaki doğrulamayı doğru yerde birleştirmek. Ortak şemalar iki tarafın sözleşmesini toplarken veritabanının tarih ve alan adı dönüşümleri depo katmanında kalıyor. Her sınırda verinin nereden geldiğini ve hangi kontrolden sonra güvenilir sayıldığını izlemek, bu ayrımı anlaşılır kılıyor.
