/**
 * Mobil uygulamanin API sozlesmesini CANLI backend'e karsi dogrular.
 *
 * Neden tarayici degil: Expo'nun web hedefi tarayicida calistigi icin canli
 * API'nin CORS kisitlamasina takilir. Native iOS/Android'de CORS yoktur, bu
 * yuzden Node'dan yapilan bu kontrol gercek mobil davranisi temsil eder.
 *
 * Her ekranin okudugu alanlar tek tek kontrol edilir; eksik alan varsa ekran
 * calisma aninda patlardi.
 */
const API = process.env.API_URL ?? 'https://veritas-production-aa2b.up.railway.app';

let failures = 0;

function check(label, condition, detail = '') {
  const mark = condition ? 'OK  ' : 'HATA';
  if (!condition) failures += 1;
  console.log(`  ${mark} ${label}${detail ? '  ' + detail : ''}`);
}

function hasKeys(obj, keys) {
  return keys.every((k) => Object.prototype.hasOwnProperty.call(obj, k));
}

async function get(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

(async () => {
  console.log(`API: ${API}\n`);

  console.log('TopicsScreen -> GET /topics');
  const paged = await get('/topics?page=1&limit=10');
  check('sayfalama alanlari', hasKeys(paged, ['items', 'page', 'limit', 'total', 'totalPages']));
  check('items dizi', Array.isArray(paged.items), `${paged.items.length} dava`);
  if (paged.items.length) {
    const t = paged.items[0];
    check('dava alanlari', hasKeys(t, ['id', 'title', 'description', 'category', 'sides', 'leadingSideId']));
    check('sides dizi', Array.isArray(t.sides));
    const s = t.sides[0];
    check('side.strengthScore var', s && 'strengthScore' in s, `deger: ${s?.strengthScore}`);
    check('side alanlari', s && hasKeys(s, ['id', 'position', 'label', 'evidenceCount']));
  }

  console.log('\nTopicsScreen -> GET /topics/categories');
  const cats = await get('/topics/categories');
  check('kategori dizisi', Array.isArray(cats), `${cats.length} kategori`);
  if (cats.length) check('kategori alanlari', hasKeys(cats[0], ['category', 'count']));

  console.log('\nTopicDetailScreen -> GET /topics/:id');
  let detail = null;
  let ev = null;
  for (const summary of paged.items) {
    const candidate = await get(`/topics/${summary.id}`);
    const firstEvidence = candidate.sides.flatMap((x) => x.evidences)[0];
    if (!detail) detail = candidate;
    if (firstEvidence) {
      detail = candidate;
      ev = firstEvidence;
      break;
    }
  }
  if (detail) {
    console.log(`  (dava: ${detail.title})`);
    check('detay alanlari', hasKeys(detail, ['id', 'title', 'sides', 'leadingSideId', 'isTie']));
    const side = detail.sides[0];
    check('side istatistikleri',
      hasKeys(side, ['evidences', 'totalScore', 'averageScore', 'strengthScore', 'evidenceCount', 'scoredCount']));
    if (ev) {
      check('kanit alanlari',
        hasKeys(ev, ['id', 'content', 'sourceUrl', 'score', 'aiReasoning', 'qualityBreakdown',
                     'voteScore', 'voteCount', 'myVote', 'reportCount', 'myReported', 'author']));
      check('author alanlari', hasKeys(ev.author, ['username', 'displayName']));
      if (ev.qualityBreakdown) {
        check('kalite bilesenleri',
          hasKeys(ev.qualityBreakdown,
            ['sourceReliability', 'verifiability', 'relevance', 'specificity', 'timeliness']));
      } else {
        console.log('  ---  qualityBreakdown null (eski kanit, henuz yeniden puanlanmamis)');
      }
    } else {
      console.log('  ---  canlida hic kanit yok, kanit alanlari kontrol edilemedi');
    }
  }

  console.log('\nRewardsScreen -> GET /users/payout-rules');
  const rules = await get('/users/payout-rules');
  check('kural alanlari',
    hasKeys(rules, ['minAccountAgeDays', 'minPointsBalance', 'minScoredEvidenceCount',
                    'minAverageQuality', 'supportedCountries']));

  console.log('\nKorumali uclar kimliksiz reddediyor mu');
  for (const path of ['/users/me', '/users/me/eligibility', '/notifications']) {
    const res = await fetch(API + path);
    check(`${path} -> 401`, res.status === 401, `donen: ${res.status}`);
  }

  console.log(failures === 0 ? '\nTUM SOZLESME KONTROLLERI GECTI' : `\n${failures} KONTROL BASARISIZ`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((err) => {
  console.error('\nHATA:', err.message);
  process.exit(1);
});
