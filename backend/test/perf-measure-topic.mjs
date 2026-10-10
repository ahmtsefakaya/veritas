#!/usr/bin/env node
/**
 * GET /topics/:id ve GET /topics/:id/comments maliyetini olcer.
 *
 * NEDEN: Liste ucu (perf-measure.mjs) duzeltildi, ama tek bir davanin
 * buyumesi ayri bir risk. Gunluk kota kullanici basina 20 kanit; tartisilan
 * bir dava haftalar icinde binlerce kanit ve yorum toplar. Mevcut kod o
 * davanin TUM kanitlarini (yazar, oy sayisi, sikayet sayisi dahil) ve TUM
 * yorumlarini tek cevapta donduruyor -> maliyet ve cevap boyutu dava
 * buyuklugu ile dogrusal artiyor.
 *
 * Kullanim:  node test/perf-measure-topic.mjs            (oncesi + sonrasi)
 *            TOPIC=<id> N=10 node test/perf-measure-topic.mjs
 *
 * Yalnizca YEREL atilabilir veritabaninda kosulur.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const N = Number(process.env.N ?? 7);
const EVIDENCE_PAGE = Number(process.env.EVIDENCE_PAGE ?? 50);
const COMMENT_PAGE = Number(process.env.COMMENT_PAGE ?? 200);

const PRIOR_WEIGHT = 2;
const PRIOR_SCORE = 50;

function strengthFrom(totalScore, scoredCount) {
  return Math.round((totalScore + PRIOR_WEIGHT * PRIOR_SCORE) / (scoredCount + PRIOR_WEIGHT));
}

/** ONCESI: taraf basina tum kanitlar, tum satirlar bellege. */
async function oldFindOne(id, viewerId) {
  const topic = await prisma.topic.findUnique({
    where: { id },
    include: {
      sides: {
        include: {
          evidences: {
            orderBy: { score: 'desc' },
            include: {
              author: { select: { username: true, displayName: true } },
              votes: viewerId ? { where: { userId: viewerId }, select: { value: true } } : false,
              _count: { select: { votes: true } },
            },
          },
        },
      },
    },
  });
  const evidenceIds = topic.sides.flatMap((s) => s.evidences.map((e) => e.id));
  const voteSums = evidenceIds.length
    ? await prisma.evidenceVote.groupBy({
        by: ['evidenceId'],
        where: { evidenceId: { in: evidenceIds } },
        _sum: { value: true },
      })
    : [];
  const reports = evidenceIds.length
    ? await prisma.evidenceReport.groupBy({
        by: ['evidenceId'],
        where: { evidenceId: { in: evidenceIds }, status: 'OPEN' },
        _count: { _all: true },
      })
    : [];
  const sides = topic.sides.map((side) => {
    const scored = side.evidences.filter((e) => typeof e.score === 'number');
    const totalScore = scored.reduce((s, e) => s + e.score, 0);
    return {
      id: side.id,
      evidenceCount: side.evidences.length,
      scoredCount: scored.length,
      totalScore,
      strengthScore: strengthFrom(totalScore, scored.length),
    };
  });
  return { sides, rows: evidenceIds.length, voteSums: voteSums.length, reports: reports.length };
}

/** SONRASI: taraf toplamlari veritabaninda, kanitlar sayfalanmis. */
async function newFindOne(id, viewerId) {
  const topic = await prisma.topic.findUnique({
    where: { id },
    include: {
      sides: {
        include: {
          evidences: {
            orderBy: { score: 'desc' },
            take: EVIDENCE_PAGE,
            include: {
              author: { select: { username: true, displayName: true } },
              votes: viewerId ? { where: { userId: viewerId }, select: { value: true } } : false,
              _count: { select: { votes: true } },
            },
          },
        },
      },
    },
  });
  const sideIds = topic.sides.map((s) => s.id);
  const [totals, scoredAgg] = await Promise.all([
    prisma.evidence.groupBy({ by: ['sideId'], where: { sideId: { in: sideIds } }, _count: { _all: true } }),
    prisma.evidence.groupBy({
      by: ['sideId'],
      where: { sideId: { in: sideIds }, score: { not: null } },
      _count: { _all: true },
      _sum: { score: true },
    }),
  ]);
  const totalBySide = new Map(totals.map((r) => [r.sideId, r._count._all]));
  const scoredBySide = new Map(scoredAgg.map((r) => [r.sideId, r]));
  const evidenceIds = topic.sides.flatMap((s) => s.evidences.map((e) => e.id));
  const voteSums = evidenceIds.length
    ? await prisma.evidenceVote.groupBy({
        by: ['evidenceId'],
        where: { evidenceId: { in: evidenceIds } },
        _sum: { value: true },
      })
    : [];
  const reports = evidenceIds.length
    ? await prisma.evidenceReport.groupBy({
        by: ['evidenceId'],
        where: { evidenceId: { in: evidenceIds }, status: 'OPEN' },
        _count: { _all: true },
      })
    : [];
  const sides = topic.sides.map((side) => {
    const agg = scoredBySide.get(side.id);
    const scoredCount = agg?._count._all ?? 0;
    const totalScore = agg?._sum.score ?? 0;
    return {
      id: side.id,
      evidenceCount: totalBySide.get(side.id) ?? 0,
      scoredCount,
      totalScore,
      strengthScore: strengthFrom(totalScore, scoredCount),
    };
  });
  return { sides, rows: evidenceIds.length, voteSums: voteSums.length, reports: reports.length };
}

async function oldListComments(topicId) {
  const rows = await prisma.comment.findMany({
    where: { topicId },
    orderBy: { createdAt: 'asc' },
    include: { author: { select: { id: true, username: true, displayName: true } } },
  });
  return { rows: rows.length };
}

async function newListComments(topicId) {
  const [total, roots] = await Promise.all([
    prisma.comment.count({ where: { topicId } }),
    prisma.comment.findMany({
      where: { topicId, parentId: null },
      orderBy: { createdAt: 'asc' },
      take: COMMENT_PAGE,
      include: { author: { select: { id: true, username: true, displayName: true } } },
    }),
  ]);
  const replies = roots.length
    ? await prisma.comment.findMany({
        where: { parentId: { in: roots.map((r) => r.id) } },
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, username: true, displayName: true } } },
      })
    : [];
  return { rows: roots.length + replies.length, total };
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function bench(label, fn) {
  await fn();
  const times = [];
  let last;
  for (let i = 0; i < N; i++) {
    const t0 = process.hrtime.bigint();
    last = await fn();
    times.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  const bytes = Buffer.byteLength(JSON.stringify(last));
  console.log(
    `${label.padEnd(34)} medyan ${median(times).toFixed(1).padStart(8)} ms   ` +
      `satir ${String(last.rows ?? '-').padStart(5)}   ozet ${String(bytes).padStart(6)} B`,
  );
  return { median: median(times), last };
}

async function main() {
  let topicId = process.env.TOPIC;
  if (!topicId) {
    const hot = await prisma.$queryRawUnsafe(
      `select s."topicId" as id, count(*) c from evidences e join sides s on e."sideId"=s.id group by 1 order by c desc limit 1`,
    );
    topicId = hot[0]?.id;
  }
  if (!topicId) throw new Error('Olculecek dava bulunamadi; once tohum verisini yukle.');
  const counts = await prisma.$queryRawUnsafe(
    `select (select count(*) from evidences e join sides s on e."sideId"=s.id where s."topicId"=$1) ev,
            (select count(*) from comments where "topicId"=$1) cm`,
    topicId,
  );
  console.log(`\nDava ${topicId}  kanit=${counts[0].ev}  yorum=${counts[0].cm}  N=${N}\n`);

  console.log('--- GET /topics/:id ---');
  const o1 = await bench('ONCESI  tum kanitlar', () => oldFindOne(topicId, null));
  const n1 = await bench(`SONRASI taraf basina ${EVIDENCE_PAGE}`, () => newFindOne(topicId, null));

  console.log('\n--- GET /topics/:id/comments ---');
  const o2 = await bench('ONCESI  tum yorumlar', () => oldListComments(topicId));
  const n2 = await bench(`SONRASI ${COMMENT_PAGE} kok + yanitlari`, () => newListComments(topicId));

  console.log('\n--- DOGRULUK: taraf gucu degismedi mi? ---');
  const oldSides = JSON.stringify(o1.last.sides.map((s) => [s.id, s.evidenceCount, s.scoredCount, s.totalScore, s.strengthScore]).sort());
  const newSides = JSON.stringify(n1.last.sides.map((s) => [s.id, s.evidenceCount, s.scoredCount, s.totalScore, s.strengthScore]).sort());
  console.log(oldSides === newSides ? '  OK   taraf toplamlari ve gucu AYNI' : '  HATA taraf degerleri DEGISTI');
  if (oldSides !== newSides) {
    console.log('   oncesi:', oldSides);
    console.log('   sonrasi:', newSides);
    process.exitCode = 1;
  }
  console.log(
    `\nKazanc: detay ${(o1.median / n1.median).toFixed(1)}x, yorumlar ${(o2.median / n2.median).toFixed(1)}x\n`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
