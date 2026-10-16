# 16.10.2026 Gün Sonu Özeti

## HTTP'den WebSocket'e

Kart oluşturma ve taşıma istekleri hâlâ HTTP üzerinden işleniyor; WebSocket, başarılı değişiklikleri aynı panoyu dinleyen ekranlara ulaştırıyor. Sunucu önce depo işleminin tamamlanmasını bekliyor, sonra olayı yayınlıyor. Böylece reddedilen bir istek diğer ekranlarda gerçekleşmiş bir değişiklik gibi görünmüyor.

## Olay mı, Durum mu

Panonun durumu bütün kartların o andaki görünümünü, olay ise gerçekleşen tek bir değişikliği anlatıyor. WebSocket her seferinde bütün panoyu göndermek yerine kartın oluşturulduğunu veya taşındığını bildiriyor. Taşıma olayında istenen pozisyon değil, sütunun sınırlarına göre hesaplanıp kaydedilen son pozisyon yer alıyor.

## Aynı Saf Fonksiyon İki Tarafta

Taşıma kuralı ortak paketteki `moveCard` içinde duruyor; sunucu depoya yazarken, istemci de `applyBoardEvent` üzerinden taşıma olayını uygularken aynı hesabı kullanıyor. Bu fonksiyonlar verilen kart listesini değiştirmeden yeni durumu üretiyor. Aynı başlangıç durumu ve aynı olay sırası olduğunda iki tarafta da aynı kurallar çalışıyor.

## Hub ve Bağlantı Yaşam Döngüsü

Hub, aboneleri pano kimliğine göre grupluyor ve her olayı yalnız ilgili panoya bağlı soketlere gönderiyor. El sıkışmada yol ve pano doğrulandıktan sonra abonelik kuruluyor; istemci pano kimliğini ve o andaki bağlantı sayısını içeren bir karşılama mesajı alıyor. Bağlantı kapanınca abonelik kaldırılıyor, son abone ayrıldığında panonun hub içindeki kaydı da temizleniyor.

## Ölü Bağlantı ve Kalp Atışı

Bir soketin açık görünmesi, karşı tarafın hâlâ ulaşılabilir olduğunu kanıtlamıyor. Sunucu 30 saniyelik aralıklarla protokol düzeyinde ping gönderiyor ve sonraki kontrolde pong gelmemişse bağlantıyı sonlandırıyor. Bu denetim, uygulamanın JSON mesajı olarak sunduğu ping ve pong alışverişinden ayrı çalışıyor.

## Tekrar, Sıra ve Kopma

Aynı olay art arda uygulandığında ikinci uygulama durumu değiştirmiyor; ancak bu özellik farklı olayların sırası değiştiğinde aynı sonucun çıkacağını garanti etmiyor. Olaylarda sıra numarası bulunmadığı için eş zamanlı taşımalar ekranların sıralamasını farklı bırakabiliyor. Bağlantı koptuğunda kullanıcı "Yeniden bağlan" butonunu kullanıyor ve arada kaçırılan olaylar tekrar oynatılmak yerine pano yeniden çekiliyor.

## Önce Dinle, Sonra Çek

Canlı yayın yalnız abonelik kurulduktan sonraki değişiklikleri taşıdığı için ilk kart listesini almak tek başına yeterli olmuyor. Arayüz her karşılama mesajında panoyu yeniden isteyerek bağlantı öncesinde kaçırmış olabileceği değişiklikleri güncel durumdan öğreniyor. Bu yenileme hem ilk bağlantıda hem de elle yeniden bağlanıldığında yapılıyor.

## Yanıldığım İki Tahmin

İlk düzeltilmesi gereken varsayım, WebSocket bağlantısı kurulunca geçmiş değişikliklerin de kendiliğinden geleceği düşüncesi; hub bir olay geçmişi saklamıyor. İkinci varsayım, aynı olayın iki kez uygulanmasını güvenli hâle getirmenin eş zamanlı işlemlerin sırasını da çözeceği düşüncesi. Tekrara dayanıklılık ile olayları ortak bir sırada işlemek ayrı sorunlar olarak duruyor.

## En Çok Zorlandığım Konu

Bu çalışmadaki temel güçlük, HTTP yanıtı, canlı olay ve yeniden çekilen pano durumunun aynı ekrana farklı zamanlarda ulaşmasını birlikte düşünmek. Ortak saf fonksiyonlar taşıma hesabını birleştiriyor, ancak ağdaki zamanlama ve olay sırası için ayrıca kurallar gerekiyor. Kaydın tamamlanması, olayın yayınlanması ve istemcinin durumu yenilemesi arasındaki sınırları ayırmak, mevcut güvenceleri ve kalan eksikleri anlamayı kolaylaştırıyor.
