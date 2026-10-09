# Veritas

Yapay zeka destekli, tarafsız delil/tartışma platformu. İki tarafın delillerini
sunduğu, yapay zekanın delil gücüne göre sıraladığı, güçlü içerik üretenlerin
ödül puanı kazandığı bir sistem.

## Mimari

- **Backend:** NestJS + Prisma + PostgreSQL + Redis (BullMQ) — Railway'de çalışır
- **Web:** React + Vite + Tailwind — Vercel'de yayınlanır
- **AI:** OpenAI `gpt-4o-mini` ile delil kalite puanlaması
- **Realtime:** Socket.io (`/realtime` namespace, `topic:<id>` odaları)

## Puanlama kuralları

Delil kalite puanı 100 üzerinden beş bileşenden oluşur ve **yalnızca yapay zeka
değerlendirmesinden** gelir:

| Bileşen | Ağırlık |
| --- | --- |
| Kaynak güvenilirliği | 35 |
| Doğrulanabilirlik | 25 |
| Alaka | 20 |
| Somutluk | 15 |
| Güncellik / bağlam | 5 |

Ödül puanı sadece kalite puanından türetilir: 60–69 → 4, 70–79 → 8, 80–89 → 12,
90–100 → 20 puan.

Kullanıcı oyları, yorumlar, popülerlik ve yazar itibarı kalite puanını veya ödül
puanını **etkilemez**; yalnızca inceleme/kötüye kullanım sinyali üretir. Ödül
puanı uygulama içi puandır, para değildir — gerçek para dağıtımı yapılmaz.

## Durum

- [x] Auth & Users modülü (kayıt, giriş, JWT access/refresh token, profil)
- [x] Topics & Sides & Evidences modülü (moderasyon akışı dahil)
- [x] AI delil puanlama kuyruğu (BullMQ + OpenAI, retry'li)
- [x] Delil oylama (kullanıcı başına tek oy, kendine oy engelli)
- [x] Dava bazlı yorumlar (tek seviye yanıt, soft delete)
- [x] Sayfalama, kategori filtresi, arama ve sıralama
- [x] İtibar sistemi ve kullanıcı profilleri + lider tablosu
- [x] Test paketi ve GitHub Actions CI
- [x] Topic bazlı Socket.io realtime
- [x] Kanıt kalite bileşenleri ve kalite bazlı ödül puanı (ledger)
- [x] Ödeme uygunluk kapısı (salt okunur, para transferi yok)
- [x] Bildirim sistemi
- [x] Güvenlik ve kötüye kullanım önleme (helmet, CORS, throttle, kota)
- [x] Kaynak şikâyet ve yeniden değerlendirme akışı
- [x] Yönetim paneli (kullanıcı/rol/kısıtlama yönetimi + platform istatistikleri)
- [x] Hesap ayarlari, itibar sıralaması sayfası, 404 sayfası ve SEO meta etiketleri
- [x] E-posta doğrulama ve şifre sıfırlama (tek kullanımlık jeton, SHA-256 özet)
- [ ] Mobil uygulama (React Native / Expo)

## Hesap kurtarma akışları

```
POST /auth/email/verify/request   (JWT) dogrulama baglantisi ister -> 202
POST /auth/email/verify           {token} -> 200 {ok, isEmailVerified}
POST /auth/password/forgot        {email} -> 202 (hesap var/yok ayni cevap)
POST /auth/password/reset         {token, password} -> 200
```

Jetonlar 32 baytlık rastgele veridir; veritabanında yalnızca SHA-256 özeti
saklanır. Her jeton tek kullanımlıktır, aynı türden yeni talep eskisini
geçersizleştirir. E-posta doğrulama jetonu 24 saat, şifre sıfırlama jetonu 1
saat geçerlidir. Şifre sıfırlandığında `refreshTokenHash` silinir, böylece eski
tüm oturumlar düşer. Hesap sayımını sızdırmamak için `password/forgot` kayıtlı
olmayan adres için de aynı 202 cevabını döner. Hesap başına saatlik 3 talep
sınırı vardır. Bu akışlar kanıt kalite puanına veya ödül puanına dokunmaz.

E-posta gönderimi `MailService` üzerinden tek noktadan geçer; bir SMTP
sağlayıcısı bağlanana kadar mesajlar loglanır. Bağlantı adresi `APP_URL`
ortam değişkeninden üretilir.

## API (yönetim)

Tümü JWT + `ADMIN`/`MODERATOR` rolü ister:

```
GET   /admin/stats                 platform istatistikleri
GET   /admin/users?q&banned&limit  kullanıcı listesi (limit üst sınırı 100)
PATCH /admin/users/:id             {isBanned?, role?, isPremium?, note?}
```

Yetki ayrımı: rol ve abonelik değişikliği yalnızca `ADMIN`; `MODERATOR` sadece
normal kullanıcıları kısıtlayabilir, yetkili hesaplara dokunamaz. Kimse kendi
rolünü veya kısıtlama durumunu değiştiremez ve sistem en az bir `ADMIN` olmadan
bırakılamaz. Kısıtlanan hesabın tüm oturumları ilk istekte düşer.
