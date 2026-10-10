-- /topics listesinin gercek plani. Prisma'nin urettigi SQL birebir kullanilir.
\timing on
\echo '=== 1) LISTE: status=APPROVED + _count(comments) + createdAt DESC ==='
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT t.id, t.title, COALESCE(a."_aggr_count_comments", 0)
FROM topics t
LEFT JOIN (SELECT c."topicId", COUNT(*) AS "_aggr_count_comments" FROM comments c WHERE 1=1 GROUP BY c."topicId") a
  ON t.id = a."topicId"
WHERE t.status = 'APPROVED'
ORDER BY t."createdAt" DESC
LIMIT 10 OFFSET 0;

\echo '=== 2) SAYIM: count(status=APPROVED) ==='
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT COUNT(*) FROM (SELECT t.id FROM topics t WHERE t.status = 'APPROVED') s;

\echo '=== 3) ARAMA: ILIKE title/description + sides.label EXISTS ==='
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT t.id FROM topics t
WHERE t.status = 'APPROVED'
  AND (t.title ILIKE '%kaynak%' OR t.description ILIKE '%kaynak%'
       OR EXISTS (SELECT 1 FROM sides s WHERE s.label ILIKE '%kaynak%' AND s."topicId" = t.id))
ORDER BY t."createdAt" DESC LIMIT 10;

\echo '=== 4) IC ICE KANITLAR: evidences WHERE sideId IN (20 id) ==='
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT e.id, e.score, e."sideId" FROM evidences e
WHERE e."sideId" IN (
  SELECT s.id FROM sides s WHERE s."topicId" IN (
    SELECT t.id FROM topics t WHERE t.status='APPROVED' ORDER BY t."createdAt" DESC LIMIT 10));

\echo '=== 5) KATEGORI: ILIKE esitlik ==='
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT t.id FROM topics t WHERE t.status='APPROVED' AND t.category ILIKE 'iklim'
ORDER BY t."createdAt" DESC LIMIT 10;

\echo '=== 6) DAVA DETAYI: tek davanin tum kanitlari ==='
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT e.* FROM evidences e JOIN sides s ON s.id = e."sideId"
WHERE s."topicId" = (SELECT id FROM topics WHERE status='APPROVED' LIMIT 1);
