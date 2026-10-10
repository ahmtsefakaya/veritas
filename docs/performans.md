# Sorgu performansi: olcum, bulgular, duzeltmeler

Bu belge `/topics` listesinin neden yavasladigini **olcumle** tespit etme ve
duzeltme calismasini kaydeder. Amac, gelecekte bir regresyon oldugunda ayni
olcumun tekrar kosulabilmesi.

## Nasil tekrar olculur

Yerel (atilabilir) Postgres gerekir; canli veritabaninda **kosulmaz**.

```bash
cd backend
docker start vdb vredis
npx prisma migrate deploy
npm run perf:seed       # 5.000 dava, 10.000 taraf, ~45.000 kanit, ~12.700 yorum
npm run perf:measure    # her durum 15 kez, medyan
npm run perf:explain    # EXPLAIN (ANALYZE, BUFFERS) planlari
OLD=1 npm run perf:measure   # duzeltme oncesi kod yoluyla karsilastirma
```

Tohum verisini silmek icin:

```sql
DELETE FROM evidences WHERE "sideId" IN (SELECT s.id FROM sides s JOIN topics t ON t.id=s."topicId" WHERE t.title LIKE 'Perf dava %');
DELETE FROM comments WHERE "topicId" IN (SELECT id FROM topics WHERE title LIKE 'Perf dava %');
DELETE FROM sides    WHERE "topicId" IN (SELECT id FROM topics WHERE title LIKE 'Perf dava %');
DELETE FROM topics   WHERE title LIKE 'Perf dava %';
```

## Bulgular (EXPLAIN ANALYZE ile dogrulandi)

### 1. `evidences` tablosunda hic indeks yoktu — en buyuk sorun

`/topics` her istekte ic ice kanitlari `WHERE "sideId" IN (...20 id)` ile
cekiyor. `sideId` indeksi olmadigi icin plan:

```
Hash Semi Join (actual time=7.812..715.572 rows=103)
  ->  Seq Scan on evidences e (actual time=0.035..394.250 rows=44898)
```

45.000 satirlik tablo, 103 satir donmek icin bastan sona taraniyordu.
`@@index([sideId, score])` sonrasi:

```
Index Scan using "evidences_sideId_score_idx" (actual time=0.026..0.050 rows=5 loops=20)
Execution Time: 4.112 ms
```

**715 ms -> 4,1 ms.** Bilesik `(sideId, score)` olmasi dava detayindaki
`orderBy: { score: 'desc' }` siralamasini da karsilar.

### 2. `topics` tablosunda hic indeks yoktu

Liste daima `status='APPROVED'` filtreler ve `createdAt`/`updatedAt` siralar;
plan her seferinde 5.007 satiri tarayip 4.254 satiri sort ediyordu.
`@@index([status, createdAt])` + `@@index([status, updatedAt])` ile filtre ve
siralama ayni indeksten karsilaniyor:

```
Index Scan Backward using "topics_status_createdAt_idx" (actual time=0.123..0.136 rows=10)
```

### 3. `_count: { comments: true }` TUM yorum tablosunu grupluyordu

Bu, indeksle duzelmeyen bir **sorgu sekli** hatasiydi. Prisma'nin urettigi SQL:

```sql
LEFT JOIN (SELECT "topicId", COUNT(*) FROM "comments" WHERE 1=1 GROUP BY "topicId") ...
```

`WHERE 1=1` — yani sayfada 10 dava donse bile her istek butun yorum tablosunu
tariyor ve grupluyordu:

```
HashAggregate (actual time=148.676..150.666 rows=4186)
  ->  Seq Scan on comments c (actual time=0.298..89.791 rows=12692)
```

Maliyet **toplam yorum sayisiyla dogrusal** buyuyor; urun buyudukce listeyi
yavaslatacak asil sebep buydu. Sayim artik yalnizca donen sayfanin dava
id'leriyle sinirli ayri bir `groupBy` ile yapiliyor, yani maliyet toplam yorum
sayisindan bagimsiz. `topics.service.spec.ts` bu kisitlamayi test ediyor ki
regresyon sessizce geri gelmesin.

### 4. ILIKE aramalari btree indeks kullanamaz

Arama `title`/`description`/`sides.label` uzerinde `ILIKE '%...%'`, kategori
filtresi ise `ILIKE 'iklim'` uretir. Ortadaki joker karakter yuzunden btree
ise yaramaz; `pg_trgm` + GIN gerekir. Bu yuzden `pg_trgm` eklentisi ve ilgili
GIN indeksleri eklendi.

## Olculen sonuc (ayni veri, 15 kosu medyani)

| Durum | Once (indeks yok + `_count`) | Sonra (indeks + kapsamli sayim) | Kazanc |
|---|---|---|---|
| liste 1. sayfa | 71,5 ms | **15,8 ms** | 4,5x |
| liste limit=50 | 104,6 ms | **34,8 ms** | 3,0x |
| liste 50. sayfa (derin offset) | 80,1 ms | **15,7 ms** | 5,1x |
| liste sort=active | 74,2 ms | **15,0 ms** | 4,9x |
| kategori filtresi | 68,1 ms | **13,6 ms** | 5,0x |
| arama (secici) | 160,8 ms | **56,3 ms** | 2,9x |
| arama (genis, ~%85 esler) | 163,6 ms | **43,5 ms** | 3,8x |

Iki duzeltme birbirinden bagimsiz katki yapiyor; yalnizca birini uygulamak
yetmez:

| liste 1. sayfa | eski `_count` | kapsamli sayim |
|---|---|---|
| **indeks yok** | 71,5 ms | 39,6 ms |
| **indeks var** | 45,7 ms | **15,8 ms** |

## Notlar ve tuzaklar

- `prisma migrate deploy`, indeksler elle `DROP INDEX` ile silinse bile
  migrasyonu uygulanmis saydigi icin onlari geri **olusturmaz**. Oncesi/sonrasi
  olcumu yaparken indekslerin gercekten var oldugunu
  `select indexname from pg_indexes where tablename='topics'` ile dogrula;
  aksi halde yanlis duruma ait sayilar bildirilir.
- Tohum verisi `description` alanina "kaynak" kelimesini her satira koyar, bu
  yuzden `q=kaynak` aramasi satirlarin ~%85'ini esler. GIN/trgm indeksi secici
  olmayan aramada daha az ise yarar; bu yuzden olcumde hem **secici** hem
  **genis** arama durumu ayri raporlanir.
- GIN indeksleri `schema.prisma` icinde `ops: raw("gin_trgm_ops")` ve
  `type: Gin` ile tanimlidir; boylece elle yazilmis migrasyon SQL'i sebebiyle
  olusan "drift" sorunu yasanmaz. Bunun icin `postgresqlExtensions` onizleme
  ozelligi ve `extensions = [pg_trgm]` acildi.
- Derin offset (`skip`) hala satir sayisiyla buyur; su anki hacimde sorun
  degil, ama ileride sayfalama imlec (cursor) tabanli olmak zorunda kalirsa
  ilk aday `/topics` listesidir.
