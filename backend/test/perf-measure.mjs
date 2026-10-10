#!/usr/bin/env node
/**
 * /topics listesinin sorgu maliyetini TEKRARLI olcer ve medyan verir.
 *
 * Tek olcum gurultulu oldugu icin her durum N kez kosulur ve medyan alinir.
 * Arama durumlari iki cesit: SECICI (gercek hayatta oldugu gibi az satir
 * esler) ve GENIS (tohum verisinde neredeyse her satiri esler) -- GIN/trgm
 * indeksi yalnizca secici aramada ise yarar, bunu gizlemek yerine gosteriyoruz.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const N = Number(process.env.N ?? 15);
// OLD=1 -> duzeltme oncesi kod yolu (Prisma'nin tum yorum tablosunu
// grupladigi `_count` include'u). Oncesi/sonrasi karsilastirmasi icin.
const OLD = process.env.OLD === '1';

async function findApproved({ page = 1, limit = 10, category, q, sort = 'new' } = {}) {
  const where = { status: 'APPROVED' };
  if (category) where.category = { equals: category, mode: 'insensitive' };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { sides: { some: { label: { contains: q, mode: 'insensitive' } } } },
    ];
  }
  const orderBy = sort === 'old' ? { createdAt: 'asc' } : sort === 'active' ? { updatedAt: 'desc' } : { createdAt: 'desc' };
  const [total, topics] = await Promise.all([
    prisma.topic.count({ where }),
    prisma.topic.findMany({
      where,
      include: {
        sides: { include: { evidences: { select: { score: true } } } },
        ...(OLD ? { _count: { select: { comments: true } } } : {}),
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  if (OLD) return { total, rows: topics.length, counted: topics.length };
  const counts = topics.length
    ? await prisma.comment.groupBy({
        by: ['topicId'],
        where: { topicId: { in: topics.map((t) => t.id) } },
        _count: { _all: true },
      })
    : [];
  return { total, rows: topics.length, counted: counts.length };
}

const CASES = [
  ['liste 1. sayfa (new)', { page: 1, limit: 10 }],
  ['liste 1. sayfa limit=50', { page: 1, limit: 50 }],
  ['liste 50. sayfa (derin offset)', { page: 50, limit: 10 }],
  ['liste sort=active', { page: 1, limit: 10, sort: 'active' }],
  ['kategori filtresi', { page: 1, limit: 10, category: 'iklim' }],
  ['arama SECICI (q=dava 4231)', { page: 1, limit: 10, q: 'dava 4231' }],
  ['arama GENIS (q=kaynak, ~%85 esler)', { page: 1, limit: 10, q: 'kaynak' }],
];

const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

console.log(`her durum ${N} kez, medyan bildirilir\n`);
for (const [label, args] of CASES) {
  for (let i = 0; i < 3; i++) await findApproved(args);  // isinma
  const samples = [];
  let last;
  for (let i = 0; i < N; i++) {
    const t0 = process.hrtime.bigint();
    last = await findApproved(args);
    samples.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  console.log(
    `${median(samples).toFixed(1).padStart(8)} ms medyan | ` +
    `${Math.min(...samples).toFixed(1).padStart(7)} min | ${Math.max(...samples).toFixed(1).padStart(7)} max | ` +
    `total=${String(last.total).padStart(4)} | ${label}`,
  );
}
await prisma.$disconnect();
