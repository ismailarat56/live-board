# 22.10.2026 Gün Sonu Özeti

Not: İlk denemeye ve kişisel değerlendirmelere ilişkin ayrıntı verilmediği için bu özet mevcut kod ve testlerden hazırlanmıştır; aşağıdaki kontrollü deney geçmişteki ilk denemenin kaydı değildir. Son iki bölüm de kişisel deneyim beyanı yerine koddan çıkarılan değerlendirmelerdir.

## Varlık Bilgisi ve Kira

Varlık bilgisi, panoya şu anda hangi bağlantıların katıldığını gösterir; kalıcı bir kullanıcı hesabı değildir. Her bağlantının kaydı kısa süreli bir kira gibi tutulur ve sunucu bağlantı yaşadığı sürece bu kirayı yeniler. Böylece sunucu haber veremeden kaybolsa bile üyelik sonsuza kadar listede kalmaz.

## Süre ve Tazeleme Aralığı

Üyelik süresi 15 saniye, sunucunun tazeleme aralığı 5 saniyedir; bu fark kısa gecikmelerde kaydın hemen düşmesini önler. Her sunucu yalnız kendisine bağlı bağlantıları tazeler. Kira süresi büyüdükçe geçici gecikmelere tolerans artar, fakat çöken sunucunun üyelerinin temizlenmesi de gecikir.

## watch ile İzlemek

Terminaldeki watch komutu aynı sorguyu belirli aralıklarla yeniden çalıştırarak Redis'teki üye sayısının değişimini izlemeyi sağlar. Farkları vurgulama seçeneği, bağlantı kapanınca veya süresi dolunca kaydın ne zaman gittiğini görmeyi kolaylaştırır. Bu gözlem aracıyla Node'un dosya değişince süreci yeniden başlatan watch seçeneğini karıştırmamak gerekir; çöküş deneyinde yeniden başlatıcı sonucu etkileyebilir.

## Redis'te Süreli Alanlar ve Düz HSET

Panonun üyeleri tek bir Redis hash'inde tutulur, ancak süre bütün anahtara değil her bağlantının alanına ayrı ayrı verilir. HSETEX, adı ve milisaniye cinsinden süreyi tek işlemde yazar; tazeleme de aynı işlemi tekrarlar. Süreli alanı düz HSET ile güncellemek o alanın süresini kaldırdığı için bağlantı kaybolduğunda kayıt kendiliğinden temizlenmez.

## Kendi Yazdığım Üye Deposu

İlk denemede hangi testin kırmızı kaldığı kayıtlı olmadığı için bunu geçmişte yaşanmış bir sonuç olarak yazamıyorum. Bunun yerine 22 Ekim'deki kontrollü deneyin ilk çalıştırmasında, bellek deposunun geçici kopyasında liste sıralamasını kaldırınca “üyeler: liste ada, aynı adda bağlantıya göre sıralıdır” testi kırmızı kaldı; liste ad ve bağlantı kimliği sırası yerine ekleme sırasıyla döndüğü için beklenen sonuçla uyuşmadı. Sıralamayı geri koyunca aynı on sözleşme testinin tamamı geçti; projenin asıl deposu bu deneyde değiştirilmedi.

## Sahte Redis Neyi Yakaladı

Sahte Redis, sunucu açmadan gönderilen komutun adını, pano anahtarını ve süre seçeneğini kontrol eder. Milisaniyelik değeri yanlışlıkla saniye olarak göndermek veya Redis hatasını çağırana aktarmamak bu testlerin yakalayabildiği hatalardır. Gerçek zaman aşımının Redis'te çalıştığını ise ayrı entegrasyon testi doğrular; sahte istemci tek başına bunu kanıtlamaz.

## Her Bağlantı Bir Üye

Bir kişi iki sekme açtığında iki ayrı bağlantı kimliği oluşur ve listede aynı ad iki kez görünebilir. Ad yalnız gösterilecek metindir; uzunluğu ve boşlukları denetlenmesi kimlik doğrulaması anlamına gelmez. Arayüz kendi bağlantısını welcome mesajındaki kimlikle tanır, adı tarayıcıda saklar ve ad değişince yeni bağlantı kurar.

## Çöken Sunucu ve Yoklama

Düzgün kapanan sunucu üyelerini silip değişikliği duyurabilir, fakat zorla öldürülen sunucunun böyle bir fırsatı olmaz. Bu durumda tazelenmeyen kayıtlar en geç 15 saniyede düşer; Redis'teki süre dolması üyelik olayı yayınlamadığından arayüz listeyi 5 saniyede bir yeniden okur. Normal koşullarda kayıp üyenin ekrandan kalkması yaklaşık 20 saniyeyi bulabilir; kendi WebSocket bağlantısı kopan sekme ise eski listeyi gizler.

## Live Board'u Bir Paragrafta Anlatmak

Live Board, görevleri yapılacak, yapılıyor ve bitti sütunlarında takip etmeyi sağlayan ortak bir panodur. Kullanıcılar kart ekleyebilir, taşıyabilir, düzenleyebilir ve silebilir. React arayüzü bu işlemleri TypeScript ile yazılmış sunucuya HTTP üzerinden gönderir; sunucu değişiklikleri WebSocket ile diğer açık ekranlara ulaştırır. Kartlar PostgreSQL'de saklanır, Redis ise birden fazla sunucu arasındaki olayları paylaşır ve geçici üye listesini tutar. Kart sürümleri, eski bir ekranın başka birinin düzenlemesini fark etmeden ezmesini engeller. Panodakiler bölümü açık bağlantıları adlarıyla gösterir; bağlantı kesildiğinde yeniden bağlanma ve veriyi tekrar okuma ekranların güncel duruma dönmesini sağlar.

## Yanıldığım İki Tahmin

Koddan çıkarılan ilk yanlış varsayım, üyeyi silmek için her zaman bir kapanış olayının geleceğidir; sunucu çökerse süreli kayıt gerekir. İkinci yanlış varsayım, Redis'te kaydın süresi dolunca bütün ekranların kendiliğinden haberdar olacağıdır. Mevcut tasarım süre dolması için olay üretmediğinden arayüzün ayrıca yoklama yapması gerekir.

## En Çok Zorlandığım Konu

Bu çalışmanın en çok dikkat gerektiren kısmı, bağlantının açık olmasıyla üye kaydının hâlâ geçerli olmasını ayrı ayrı düşünmektir. Donan bir sunucunun bağlantısı açık görünebilirken Redis'teki kirası dolabilir; sunucu devam edince tazeleme kaydı yeniden oluşturur. Düzenli kapanış, çöküş, donma ve Redis kesintisini ayrı ele almak, arayüzün ne zaman güncel bilgi gösterebildiğini açıklamayı kolaylaştırır.
