# 09.10.2026 Gün Sonu Özeti

> Bu özet proje dosyaları ve ders notlarından hazırlanmıştır. “Yanıldığım İki Tahmin” ve “En Çok Zorlandığım Konu” bölümleri, kişisel deneyimime göre uyarlayabileceğim taslak anlatımlardır; Git bilgileri ise dosya hazırlanırken görülen mevcut durumu yansıtır.

## Live Board Nedir ve Yol Haritası

Live Board, görev kartlarını yapılacak, yapılıyor ve bitti sütunları arasında taşıyabildiğim bir görev panosu projesi. Şu an TypeScript ile yazılmış API ve bellekte çalışan depo var; sırada PostgreSQL ile kalıcılık, React arayüzü ve WebSocket ile değişiklikleri diğer kullanıcılara anında göstermek bulunuyor. Daha sonra Redis, arka plan işleri ve aynı kart üzerinde eş zamanlı yapılan değişiklikleri yönetme konularına geçilecek.

## tsc ile Node Arasındaki Fark

Node bu projede TypeScript dosyalarındaki tip bilgilerini silip kodu çalıştırıyor, fakat tiplerin doğru kullanılıp kullanılmadığını denetlemiyor. Bu yüzden uygulamanın açılması, tip hatası olmadığı anlamına gelmiyor; tip kontrolünü ayrıca tsc ile yapmam gerekiyor. Projedeki noEmit ayarı sayesinde tsc yalnız kontrol yapıyor ve JavaScript dosyası üretmiyor.

## Öğrendiğim Tipler

Metin, sayı ve mantıksal değerlerin yanında dizileri, belirli uzunlukta tuple'ları ve nesnelerin şeklini tanımlamayı çalıştım. Kartın durumunu yalnız üç değerden biriyle sınırlayabildiğimi, isteğe bağlı alanlarla null değerinin farklı anlamlar taşıdığını gördüm. Ayrıca unknown'ın kullanmadan önce kontrol gerektirdiğini, never'ın ise hiçbir olasılığın kalmadığı durumları ifade edebildiğini öğrendim.

## Daraltma ve Type Guard

Bir değer birden fazla tipte olabiliyorsa, önce türünü veya ayırt edici alanını kontrol ederek hangi durumda olduğumu netleştirebiliyorum. Type guard, bu kontrolü tekrar kullanılabilir bir fonksiyona taşıyor ve başarılı olduğunda TypeScript'in değeri daha dar bir tipte görmesini sağlıyor. Kart durumunu doğrularken ve pano olaylarını türlerine göre işlerken bu yaklaşımı kullandım.

## Generic'ler ve Hazır Tipler

Generic sayesinde aynı işlemi farklı veri tipleriyle yaparken giriş ve çıkış arasındaki tip ilişkisini koruyabiliyorum. Örneğin kimliğine göre arama yapan bir yardımcı, yalnız kimlik alanını şart koşup bulduğu nesnenin diğer alanlarının tiplerini de koruyabiliyor. Pick ile gereken alanları seçmeyi, Omit ile bazı alanları çıkarmayı ve Partial ile alanları isteğe bağlı hâle getirmeyi çalıştım.

## Modül Kuralları: import type, .ts Uzantısı, Enum

Yalnız tip olarak kullandığım tanımları import type ile ayırıyorum; bunların çalışma anında bir JavaScript değeri olarak bulunması gerekmiyor. Node kaynak dosyaları doğrudan çalıştırdığı için yerel importlarda .ts uzantısını açıkça yazıyorum. Bu projenin yalnız silinebilir TypeScript sözdizimine izin veren ayarında enum ve constructor parameter property kullanmıyorum, çünkü bunlar JavaScript koduna dönüştürülmeyi gerektiriyor.

## find ile Bulduklarım

find, koşula uyan ilk elemanı veriyor; eşleşme yoksa undefined dönüyor. Bu nedenle sonucu doğrudan varmış gibi kullanmak yerine bulunamama durumunu ele almam gerekiyor. Projedeki arama yardımcılarında bu sonucu null'a çevirerek çağıran taraf için ortak bir bulunamadı anlamı oluşturduğumuzu gördüm.

## İlk Testim: Önce Kırmızı, Sonra Yeşil

Proje notlarına göre moveCard testleri ilk eklendiğinde fonksiyonun dosyası henüz olmadığı için testler import aşamasında kırmızıya düştü; uygulama eklendiğinde altı senaryo yeşile döndü. Bu senaryolar aynı sütunda sıralamayı, sütunlar arasında taşımayı, pozisyonları düzenlemeyi, sınır dışı pozisyonları, girdiyi değiştirmemeyi ve olmayan kartı kapsıyor. Böylece iş kuralının beklenen davranışını testlerle tarif etmiş olduk; HTTP katmanı henüz bu kapsamda değil.

## Gelen Veriyi unknown'dan Daraltmak

İstek gövdesine bir TypeScript tipi vermek, dışarıdan gelen veriyi kendiliğinden güvenilir yapmıyor. Önce verinin null veya dizi olmayan bir nesne olduğunu, ardından başlık, durum ve pozisyon gibi alanların beklenen koşulları sağladığını kontrol ediyorum. Kontrollerden sonra uygulamanın kullanabileceği girdiyi oluşturuyor, geçersiz değerler için anlamlı hata döndürüyorum.

## PostgreSQL: MySQL'den Farklar

PostgreSQL ile MySQL'in ikisinin de ilişkisel veritabanı olduğunu, ancak istemci komutlarının ve bazı SQL özelliklerinin farklılaştığını gördüm. PostgreSQL'e psql ile bağlanıyorum; burada bağlantıdan çıkmak için kullanılan komut veritabanını silmiyor. Bu projede PostgreSQL 18 Docker üzerinden bilgisayarın 5433 portuna açılıyor ve verileri volume'da saklanıyor, fakat uygulama henüz bu veritabanına bağlanmıyor.

## Yanıldığım İki Tahmin

İlk tahminim, Node bir TypeScript dosyasını çalıştırabiliyorsa tipleri de kontrol ettiği yönündeydi; çalıştırma ile tip kontrolünün ayrı işler olduğunu öğrendim. İkinci tahminim, find ile aradığım kayıt bulunmazsa null geleceğiydi; aslında undefined döndüğünü ve projede bunu ayrıca null'a çevirdiğimizi fark ettim.

## En Çok Zorlandığım Konu

En çok, generic bir fonksiyonun farklı tiplerle çalışırken belirli alanları nasıl zorunlu tutabildiğini anlamakta zorlandım. Kimlik alanı şartının nesnenin geri kalan tip bilgisini silmediğini görünce konu daha anlaşılır oldu. Benzer küçük örnekleri kendim kurup dönüş tipini inceleyerek bu konuyu pekiştirmek istiyorum.

## Son Commit ve Tag

Dosya hazırlanırken depoda görülen son commit, 10.10.2026 tarihli 572bc9f kimlikli “chore: start live board project” kaydı; bu nedenle onu 9 Ekim gününün commit'i olarak gösteremiyorum. Depoda henüz bir tag bulunmuyor. Sunucu dosyaları ve veritabanı yapılandırması da kontrol sırasında henüz commit'e alınmamış durumda.
