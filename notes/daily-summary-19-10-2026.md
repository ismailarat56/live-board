# 19.10.2026 Gün Sonu Özeti

## Redis Nedir ve Neden Bellekte

Redis, veriyi bellekte tutarak hızlı erişim sağlayan bir veri yapısı sunucusu; bu projede görevi pano olaylarını sunucular arasında taşımak. Kartların kalıcı kaydı PostgreSQL'de duruyor, Redis'e kart deposu olarak güvenmiyoruz. Redis'in disk kaydı kapalı olduğu için yeniden başladığında içi boş oluyor; bu tercih bugünkü mesaj taşıma göreviyle uyumlu.

## Pub/Sub: En Fazla Bir Kez

Pub/sub, bir kanala yayınlanan mesajı o anda dinleyen abonelere ulaştırıyor; kaçırılan mesajları sonradan almak için bir geçmiş tutmuyor. Bu yüzden bağlantı kopukken yayınlanan bir olay kaybolabiliyor ve yeniden bağlanmak tek başına eksik olayları tamamlamıyor. Arayüzün panoyu yeniden çekmesi, olay geçmişini oynatmadan güncel veriye dönmesini sağlıyor.

## Ortam Değişkenleri ve İki Sunucu

Komutun önüne yazılan PORT değeri, ortam dosyasındaki değerden önce geldiği için aynı kodu 4000 ve 4001 portlarında çalıştırabiliyoruz. İkinci arayüzü web klasöründen 5174 portuyla başlatıp API_PORT üzerinden ikinci sunucuya yönlendiriyoruz. Kökteki dev:web komutu başka bir npm komutunu çağırdığı için port seçeneği aradaki npm tarafından tüketilebiliyor; web klasöründen çalıştırınca seçenek doğrudan Vite'a ulaşıyor.

## Veri Ortak, Olaylar Değil

İki sunucunun aynı PostgreSQL veritabanına bağlanması, birinin yazdığı kartı diğerinin de okuyabilmesini sağlıyor. Ancak her sunucunun hub'ı kendi sürecinde yaşadığı için ortak veritabanı tek başına diğer sunucunun soketlerine haber vermiyor. Redis köprüsü olayı bütün sunuculara taşıyor, her hub da kendi abonelerine dağıtıyor.

## İki Bağlantı ve Hata Dinleyicisi

Her sunucuda yayın yapmak ve abonelikten mesaj almak için iki ayrı Redis bağlantısı açılıyor; abone bağlantısı yayın bağlantısının ayarları çoğaltılarak oluşturuluyor. İkisinin de hata dinleyicisi var, böylece bağlantı sorunları hangi tarafta çıktığıyla birlikte kayda geçiyor. Bağlantının error olayını dinlemek ile bir yayın işleminin reddedilen Promise'ini yakalamak ayrı sorumluluklar.

## Kendi Yazdığım Köprü: Tek Yol ve Doğrulama

Köprü, pano kimliğinden kanal adını üretip olayı Redis'e gönderiyor; aynı anda yerel hub'a dağıtmıyor. Sunucu kendi yayınını da abonelikten geri aldığı için bütün sunucular Redis'in yayın sırasını izliyor ve yerel istemciye ikinci bir yoldan kopya olay gitmiyor. Gelen kanal, JSON ve pano olayı şeması kontrol ediliyor; geçersiz mesaj kayda alınıp dağıtılmadan atılıyor.

## Yakalanmayan Promise Reddi

Yayın işlemi asenkron olduğu için çağrıyı yalnız try/catch içine almak, daha sonra oluşan Promise reddini yakalamaya yetmiyor. Dönen Promise'e hata işleyicisi eklemek, Redis'e gönderilemeyen olayın kaydedilmesini ve reddin sahipsiz kalmamasını sağlıyor. Kart zaten veritabanına yazıldığı için bu yayın hatası başarılı HTTP yazmasını geri almıyor.

## Redis Koparsa: Hızlı Hata ve Yeniden Eşitleme

Çevrimdışı komut kuyruğunu kapatmak, Redis yokken yayınları bekletmek yerine hemen hata vermesini sağlıyor; HTTP yazmaları sürerken bu olaylar kayboluyor. Abone bağlantısı yeniden hazır olduğunda sunucu soketlerini 1012 ve “Yeniden eşitleme” açıklamasıyla kapatıyor, arayüz tekrar bağlanıp panoyu baştan çekiyor. Redis daha başlangıçta kapalıysa sunucu HTTP dinlemeye başlamadan bağlantıyı bekliyor ve yeniden deniyor.

## Yanıldığım İki Tahmin

Ortak veritabanının canlı olayları da sunucular arasında paylaşacağını düşünmek eksik: verinin okunabilmesi ile değişiklik haberinin sokete ulaşması ayrı işler. Redis bağlantısının geri gelmesinin kaçırılan olayları da getireceğini varsaymak da yanlış; pub/sub bu olayları saklamıyor. Bu iki ayrım, Redis köprüsüne ve yeniden bağlanınca panoyu baştan okumaya neden birlikte ihtiyaç olduğunu açıklıyor.

## En Çok Zorlandığım Konu

En zor konu, veritabanına başarılı yazma ile olayın istemciye ulaşmasının farklı sonuçlar verebildiğini birlikte düşünmek oldu. Redis kesildiğinde kart kaydedilmiş olsa bile ekranlar habersiz kalabiliyor; yeniden eşitleme bu açığı güncel panoyu okuyarak kapatıyor. Tek yayın yolu olayların dağıtım sırasını ortaklaştırsa da sıra numarası ve eşzamanlı değişikliklerin çatışması ayrı sorunlar olarak kalıyor.
