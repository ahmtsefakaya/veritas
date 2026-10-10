-- Veritas sorgu performans olcumu icin yerel (atilabilir) veri uretimi.
-- Amaci: /topics listesinin ic ice kanitlarla buyudukce nasil davrandigini
-- gercek veri hacminde olcmek. ASLA canli veritabaninda calistirilmaz.

-- Tekrar kosulabilsin: onceki olcum tohumunu yerelde temizle.
-- ASLA canli veritabaninda calistirilmaz (dosyanin ustundeki uyari).
DELETE FROM evidences WHERE "sideId" IN (
  SELECT s.id FROM sides s JOIN topics t ON t.id = s."topicId"
  WHERE t.title LIKE 'Perf dava %'
);
DELETE FROM comments WHERE "topicId" IN (
  SELECT id FROM topics WHERE title LIKE 'Perf dava %'
);
DELETE FROM sides WHERE "topicId" IN (
  SELECT id FROM topics WHERE title LIKE 'Perf dava %'
);
DELETE FROM topics WHERE title LIKE 'Perf dava %';

-- 1 seed kullanicisi (var olan bir kullaniciyi yeniden kullanir)
CREATE TEMP TABLE seed_user AS SELECT id FROM users LIMIT 1;

-- 5000 dava: %85 APPROVED, 12 kategoriye dagilmis
INSERT INTO topics (id, title, description, category, status, "creatorId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  'Perf dava ' || g || ' ' || (ARRAY['ekonomi','iklim','saglik','teknoloji','hukuk','egitim','enerji','ulasim','tarim','medya','spor','siyaset'])[1 + (g % 12)] || ' tartismasi',
  'Bu dava performans olcumu icin uretildi. Konu basligi ' || g || ' numarali kayit, icinde arama icin anahtar kelimeler barindirir: kanit, dogrulama, kaynak, rapor.',
  (ARRAY['ekonomi','iklim','saglik','teknoloji','hukuk','egitim','enerji','ulasim','tarim','medya','spor','siyaset'])[1 + (g % 12)],
  CASE WHEN g % 100 < 85 THEN 'APPROVED'::"TopicStatus" ELSE 'PENDING'::"TopicStatus" END,
  (SELECT id FROM seed_user),
  now() - (g || ' minutes')::interval,
  now() - (g || ' minutes')::interval + ((g % 500) || ' minutes')::interval
FROM generate_series(1, 5000) g;

-- Her dava icin 2 taraf
INSERT INTO sides (id, "topicId", position, label)
SELECT gen_random_uuid(), t.id, p.pos::"SidePosition",
       CASE WHEN p.pos = 'A' THEN 'Destekliyorum ' || left(t.id::text, 4) ELSE 'Karsi cikiyorum ' || left(t.id::text, 4) END
FROM topics t
CROSS JOIN (VALUES ('A'), ('B')) AS p(pos)
WHERE t.title LIKE 'Perf dava %';

-- Taraf basina 0-9 kanit (ortalama ~4.5) -> ~45k kanit
INSERT INTO evidences (id, "sideId", "authorId", content, "sourceUrl", score, "aiReasoning", "qualityBreakdown", "createdAt")
SELECT
  gen_random_uuid(),
  s.id,
  (SELECT id FROM seed_user),
  'Performans kaniti ' || n || ': kaynak gosterilmis, dogrulanabilir bir iddia metni.',
  'https://example.org/kaynak/' || n,
  CASE WHEN n % 7 = 0 THEN NULL ELSE 40 + ((n * 13) % 60) END,
  CASE WHEN n % 7 = 0 THEN NULL ELSE 'Uretilmis gerekce metni.' END,
  CASE WHEN n % 7 = 0 THEN NULL ELSE '{"sourceReliability":30,"verifiability":20,"relevance":18,"specificity":12,"timeliness":4}'::jsonb END,
  now() - (n || ' hours')::interval
FROM sides s
JOIN topics t ON t.id = s."topicId"
CROSS JOIN generate_series(1, 9) n
WHERE t.title LIKE 'Perf dava %'
  AND n <= (abs(hashtext(s.id::text)) % 10);

-- Dava basina 0-5 yorum
INSERT INTO comments (id, "topicId", "authorId", content, "isDeleted", "createdAt", "updatedAt")
SELECT gen_random_uuid(), t.id, (SELECT id FROM seed_user),
       'Performans yorumu ' || n, false,
       now() - (n || ' hours')::interval, now() - (n || ' hours')::interval
FROM topics t
CROSS JOIN generate_series(1, 5) n
WHERE t.title LIKE 'Perf dava %'
  AND n <= (abs(hashtext(t.id::text)) % 6);
