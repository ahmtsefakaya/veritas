# Yedekleme ve geri yukleme

Railway Postgres icin `pg_dump` tabanli yedekleme. Iki script:

- `scripts/backup-db.sh` — yedek alir ve yedegin okunabilir oldugunu dogrular
- `scripts/restore-db.sh` — yedegi geri yukler (varsayilan: atilabilir yerel kopya)

## Hizli kullanim

```bash
# Yedek al (backups/ altina)
./scripts/backup-db.sh

# Yedegi dogrula: atilabilir yerel bir konteynere geri yukle
./scripts/restore-db.sh backups/veritas-20261010T094216Z.dump
```

Ayarlar (ortam degiskeni):

| Degisken | Varsayilan | Ne yapar |
|---|---|---|
| `BACKUP_DIR` | `<repo>/backups` | Yedeklerin yazilacagi dizin |
| `KEEP` | `7` | Kac yedek saklanir (eskisi silinir) |
| `DATABASE_PUBLIC_URL` | railway CLI'dan okunur | Baglanti adresi (CI icin elle verilebilir) |
| `PG_SERVICE` | `Postgres` | Railway'deki veritabani servis adi |

## Nasil calisiyor, neden boyle

**Baglanti.** Railway'in `DATABASE_URL`'i `postgres.railway.internal` adresini
gosterir ve bu ad yalnizca Railway agi icinden cozulur; dis bir makineden
yedek alinamaz. Bu yuzden scriptler TCP proxy uzerinden giden
`DATABASE_PUBLIC_URL`'i kullanir. Adres sifre icerdigi icin hicbir yere
yazilmaz/loglanmaz.

**Surum uyumu.** `pg_dump`, sunucudan ESKI olamaz: Railway'deki sunucu
PostgreSQL 18, elinizdeki `pg_dump` 16 olsaydi dokumu reddederdi. Ayrica bu
makinede `pg_dump` hic kurulu degil ve kurmak root ister. Script bu yuzden
sunucuya once `show server_version_num` sorar, sonra o surumle **eslesen**
resmi docker imajini (`postgres:18-alpine`) kullanir. Boylece surum
uyusmazligi sessiz bir hata degil, en basta goruncek bir karar olur.

**Bicim.** Dokum `-Fc` (custom format) alinir: sikistirilmis ve `pg_restore`
ile secmeli geri yukleme yapilabilir. `--no-owner --no-privileges` sayesinde
farkli bir rol altina geri yuklenebilir.

**Dogrulama.** Bos olmayan bir dosya saglam bir yedek demek DEGILDIR. Script
dokumu `pg_restore -l` ile okur ve icinde tablo verisi oldugunu sayar;
okunamiyorsa dosyayi siler ve hata verir. Boylece "yedek var" sanilan bozuk
bir dosya birikmez.

## Geri yukleme

### 1) Guvenli yol: atilabilir yerel kopya (varsayilan)

```bash
./scripts/restore-db.sh backups/veritas-20261010T094216Z.dump
```

Atilabilir bir `postgres:18-alpine` konteyneri (`vrestore`) olusturur, yedegi
oraya yukler, tablo sayilarini ve indeks sayisini yazar. Canliya dokunmaz.
Incelemek ve bitirmek icin:

```bash
docker exec -it vrestore psql -U postgres -d veritas_restore
docker rm -f vrestore
```

Duzenli olarak bunu kosmak, yedeklerin gercekten ise yaradigini kanitlamanin
tek yoludur.

### 2) CANLI veritabanina geri yukleme

> Bu islem canli veriyi yedekteki haliyle DEGISTIRIR. Iki bilincli adim ister.

```bash
ONAYLIYORUM=EVET-CANLIYA-YAZ ./scripts/restore-db.sh <dump> --target live
railway redeploy --service veritas     # backend'i yeniden baslat
```

Script canliya yazmadan once **mevcut durumun yedegini kendisi alir**, sonra
`pg_restore --clean --if-exists` ile yukler. `--clean --if-exists` olmadan
mevcut nesneler "already exists" hatasi verir ve geri yukleme yarim kalir.
Onay degiskeni verilmezse islem reddedilir.

## Dogrulanmis sonuc (2026-10-10)

Canli veritabanindan gercek bir yedek alinip atilabilir bir PostgreSQL 18
konteynerine geri yuklendi:

- dokum: 36 KB, 11 tablo verisi
- geri yuklenen satirlar: users 7, topics 5, sides 10, evidences 6,
  point_transactions 6, notifications 10
- `_prisma_migrations`: 10 kayit — yani Prisma geri yuklenen veritabaninda
  migrasyonlari bastan uygulamaya calismaz
- performans indekslerinin 9'u ve `pg_trgm` eklentisi de geri geldi
  (sema nesneleri dokuma dahil)

Guvenlik kontrolleri de kosuldu: onaysiz `--target live` reddedildi, bozuk
dokum reddedildi.

## Sinirlar ve oneriler

- **Otomatik zamanlama yok.** Script elle ya da bir cron/CI isiyle kosulmali.
  Railway'de kalici disk olmadigi icin yedegin baska bir yere (S3/B2, baska
  bir makine) kopyalanmasi gerekir; `backups/` dizini git'e dahil DEGIL.
- **Railway'in kendi yedegi bunun yerine gecmez.** Railway plana gore anlik
  goruntu alir ama bunlar proje/hesaba baglidir; hesap erisimi kaybinda ise
  yaramaz. Repo disinda bagimsiz bir kopya tutmak gerekir.
- **Kurtarma noktasi hedefi (RPO).** Su an yedek sikligi ne ise kayip riski o
  kadardir. Gunluk bir is yeterli olabilir, ama kullanici verisi arttikca
  siklik yeniden degerlendirilmeli.
- Yedekler sifrelenmiyor. Baska bir yere kopyalanacaksa `age` veya `gpg` ile
  sifrelemek gerekir; icinde kullanici e-postalari ve sifre ozetleri var.
