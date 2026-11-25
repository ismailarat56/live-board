[← README'ye dön](../README.md)

# Bilinen sınırlamalar ve sonraki adımlar

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
