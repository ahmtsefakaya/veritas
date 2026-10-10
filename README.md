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
- [x] Bilgi sayfaları (nasıl çalışır, kurallar, gizlilik, kullanım şartları), ortak footer, robots.txt + sitemap.xml
- [x] Mobil uygulama (React Native / Expo) + EAS yapılandırması (`docs/mobil-apk.md`)
- [x] Sorgu performansı: indeksler ve ölçümler (`docs/performans.md`)
- [x] Yedekleme / geri yükleme (`scripts/backup-db.sh`, `docs/yedekleme.md`)
- [x] Canlı uçtan uca yolculuk testi (`backend/test/live-journey.mjs`, 34 kontrol)
- [x] Erişilebilirlik ve mobil uyum (form alan adları, 44px dokunma alanı, rota başına `<title>`)

QA hesapları: `test/live-journey.mjs` canlıya gerçek bir kullanıcı yazmak
zorunda. Bu hesaplar `veritas-test.local` alan adını kullanır ve halka açık
lider tablosundan hariç tutulur (`QA_EMAIL_DOMAINS` ile değiştirilebilir).

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

E-posta gönderimi `MailService` üzerinden tek noktadan geçer. `SMTP_HOST`
tanımlıysa nodemailer ile gerçek SMTP gönderimi yapılır (düz metin + otomatik
üretilen HTML gövde); tanımlı değilse mesajlar yalnızca loglanır, böylece
akışlar sağlayıcı seçimine bağlı kalmaz. Bağlantı adresi `APP_URL` ortam
değişkeninden üretilir.

SMTP ortam değişkenleri (tümü opsiyonel):

```
SMTP_HOST       sunucu adresi; yoksa gönderim yapılmaz, yalnızca loglanır
SMTP_PORT       varsayılan 587
SMTP_SECURE     "true" ise implicit TLS; port 465 otomatik olarak secure'dur
SMTP_USER       kimlik; SMTP_PASSWORD ile birlikte verilmezse auth gönderilmez
SMTP_PASSWORD   kimlik şifresi
MAIL_FROM       gönderen adresi (varsayılan SMTP_USER)
```

Gönderim hatası çağıran işlemi (kayıt, şifre sıfırlama talebi) bozmaz; hata
loglanır ve akış 202 ile devam eder.

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
