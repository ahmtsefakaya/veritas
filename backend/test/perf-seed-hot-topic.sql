-- Veritas: "populer dava" senaryosu icin yerel (atilabilir) veri uretimi.
--
-- NEDEN AYRI BIR TOHUM?
-- perf-seed.sql genis bir LISTE olcer (binlerce dava, taraf basina ~4 kanit).
-- Asil risk ise tek bir davanin buyumesi: gunluk kota kullanici basina 20
-- kanit, yani tartisilan bir dava haftalar icinde binlerce kanit toplayabilir.
-- GET /topics/:id o davanin TUM kanitlarini, her birinin yazarini, oy sayisini
-- ve sikayet sayisini tek cevapta donduruyordu. Bu tohum, o senaryoyu olculebilir
-- hale getirir.
--
-- ASLA canli veritabaninda calistirilmaz.

CREATE TEMP TABLE hot_user AS SELECT id FROM users LIMIT 1;

-- Tek bir "populer" dava
INSERT INTO topics (id, title, description, category, status, "creatorId", "createdAt", "updatedAt")
VALUES (
  '00000000-0000-4000-8000-00000000f001',
  'Perf populer dava: cok kanitli tartisma',
  'Bu dava, tek bir davanin binlerce kanitla buyudugu senaryoyu olcmek icin uretildi.',
  'ekonomi',
  'APPROVED'::"TopicStatus",
  (SELECT id FROM hot_user),
  now() - interval '400 days',
  now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO sides (id, "topicId", position, label)
SELECT gen_random_uuid()::text, '00000000-0000-4000-8000-00000000f001', p.pos::"SidePosition",
       CASE WHEN p.pos = 'A' THEN 'Destekliyorum' ELSE 'Karsi cikiyorum' END
FROM (VALUES ('A'), ('B')) AS p(pos)
WHERE NOT EXISTS (
  SELECT 1 FROM sides WHERE "topicId" = '00000000-0000-4000-8000-00000000f001'
);

-- Taraf basina 1500 kanit -> 3000 kanit tek davada
INSERT INTO evidences (id, "sideId", "authorId", content, "sourceUrl", score, "aiReasoning", "qualityBreakdown", "createdAt")
SELECT
  gen_random_uuid()::text,
  s.id,
  (SELECT id FROM hot_user),
  'Populer dava kaniti ' || n || ': kaynak gosterilmis, dogrulanabilir bir iddia metni. '
    || repeat('Ayrintili gerekce metni. ', 6),
  'https://example.org/populer-kaynak/' || n,
  CASE WHEN n % 9 = 0 THEN NULL ELSE 40 + ((n * 17) % 60) END,
  CASE WHEN n % 9 = 0 THEN NULL ELSE 'Uretilmis AI gerekce metni, ortalama uzunlukta.' END,
  CASE WHEN n % 9 = 0 THEN NULL ELSE '{"sourceReliability":30,"verifiability":20,"relevance":18,"specificity":12,"timeliness":4}'::jsonb END,
  now() - (n || ' minutes')::interval
FROM sides s
CROSS JOIN generate_series(1, 1500) n
WHERE s."topicId" = '00000000-0000-4000-8000-00000000f001'
  AND NOT EXISTS (
    SELECT 1 FROM evidences e WHERE e."sideId" = s.id
  );

-- Davaya 4000 yorum (listComments da sinirsiz okuyor)
INSERT INTO comments (id, "topicId", "authorId", content, "isDeleted", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  '00000000-0000-4000-8000-00000000f001',
  (SELECT id FROM hot_user),
  'Populer dava yorumu ' || n || ': tartismaya katki metni.',
  false,
  now() - (n || ' minutes')::interval,
  now() - (n || ' minutes')::interval
FROM generate_series(1, 4000) n
WHERE (SELECT count(*) FROM comments WHERE "topicId" = '00000000-0000-4000-8000-00000000f001') = 0;

ANALYZE;
