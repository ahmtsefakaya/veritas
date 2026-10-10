#!/usr/bin/env node
/**
 * Veritas canli uctan uca kullanici yolculugu.
 *
 * Amaci: "urun tam anlamiyla calisiyor mu" sorusunu iddia ile degil, gercek
 * HTTP cagrilariyla cevaplamak. Yeni bir kullanici kaydolur, dava acar, kanit
 * ekler, AI puanlamasini bekler, puanini ve odul uygunlugunu kontrol eder.
 *
 * Canli veritabanina tek bir test kullanicisi ve tek bir dava yazar; sonunda
 * ne yazildigini raporlar ki elle temizlenebilsin.
 */
const API = process.env.API_URL ?? 'https://veritas-production-aa2b.up.railway.app';
const stamp = Date.now();
const USER = {
  email: `e2e.${stamp}@veritas-test.local`,
  username: `e2e_${stamp}`,
  password: 'E2eTest!2026x',
};

let pass = 0, fail = 0;
const notes = [];

function ok(label, cond, detail = '') {
  console.log(`  ${cond ? 'OK  ' : 'HATA'} ${label}${detail ? '  ' + detail : ''}`);
  cond ? pass++ : fail++;
  return cond;
}
function note(msg) { notes.push(msg); console.log(`  ---  ${msg}`); }

async function call(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* json degil */ }
  return { status: res.status, json, text };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log(`API: ${API}`);
  console.log(`test kullanicisi: ${USER.username} <${USER.email}>\n`);

  // ---- 1. kayit
  console.log('1) KAYIT');
  const reg = await call('/auth/register', { method: 'POST', body: USER });
  if (!ok('kayit basarili', reg.status === 201 || reg.status === 200, `HTTP ${reg.status}`)) {
    console.log('     govde:', (reg.text || '').slice(0, 300));
    console.log('\nkayit basarisiz, devam edilemiyor'); process.exit(1);
  }
  const tokens = reg.json?.tokens ?? reg.json;
  const access = tokens?.accessToken;
  ok('access token dondu', !!access);
  ok('refresh token dondu', !!tokens?.refreshToken);

  // ---- 2. kimlik
  console.log('\n2) KIMLIK VE BASLANGIC DURUMU');
  const me = await call('/users/me', { token: access });
  ok('/users/me 200', me.status === 200, `HTTP ${me.status}`);
  const u = me.json ?? {};
  ok('kullanici adi dogru', u.username === USER.username);
  ok('baslangic puani 0', u.pointsBalance === 0, `pointsBalance=${u.pointsBalance}`);
  ok('rol USER', u.role === 'USER' || u.role === undefined, `role=${u.role}`);
  if ('isEmailVerified' in u) {
    ok('e-posta baslangicta dogrulanmamis', u.isEmailVerified === false, `isEmailVerified=${u.isEmailVerified}`);
  } else { note('kullanici govdesinde isEmailVerified alani yok'); }

  // ---- 3. e-posta dogrulama talebi (SMTP yoksa ne oluyor)
  console.log('\n3) E-POSTA DOGRULAMA TALEBI  (SMTP ayarli degil, zarif dusmeli)');
  const vr = await call('/auth/email/verify/request', { method: 'POST', token: access });
  ok('istek 500 DONDURMUYOR', vr.status < 500, `HTTP ${vr.status}`);
  if (vr.status >= 400) note(`govde: ${(vr.text || '').slice(0, 200)}`);

  // ---- 4. odul uygunlugu: sebepler net mi
  console.log('\n4) ODUL UYGUNLUGU');
  const el = await call('/users/me/eligibility', { token: access });
  ok('/users/me/eligibility 200', el.status === 200, `HTTP ${el.status}`);
  const e = el.json ?? {};
  ok('yeni kullanici uygun DEGIL', e.eligible === false, `eligible=${e.eligible}`);
  const reasons = e.missing ?? e.reasons ?? e.failed ?? e.unmet ?? null;
  if (Array.isArray(reasons)) {
    ok('karsilanmayan sartlar listeleniyor', reasons.length > 0, `${reasons.length} sart`);
    console.log('       ' + JSON.stringify(reasons).slice(0, 400));
  } else if (reasons && typeof reasons === 'object') {
    const keys = Object.keys(reasons);
    ok('karsilanmayan sartlar listeleniyor', keys.length > 0, keys.join(', '));
  } else {
    note('uygunluk yanitinda sebep listesi YOK - kullanici neden uygun olmadigini goremez');
    console.log('       alanlar: ' + Object.keys(e).join(', '));
  }

  // ---- 5. kota
  console.log('\n5) GUNLUK KOTA');
  const q = await call('/users/me/quota', { token: access });
  ok('/users/me/quota 200', q.status === 200, `HTTP ${q.status}`);
  if (q.json) console.log('       ' + JSON.stringify(q.json).slice(0, 300));

  // ---- 6. dava acma
  console.log('\n6) DAVA ACMA');
  const topicBody = {
    title: `E2E testi ${stamp}: uzaktan calisma verimliligi artirir mi`,
    description: 'Otomatik uctan uca test tarafindan olusturuldu. Silinebilir.',
    category: 'Teknoloji',
    sideALabel: 'Artirir',
    sideBLabel: 'Azaltir',
  };
  const tc = await call('/topics', { method: 'POST', token: access, body: topicBody });
  if (tc.status >= 400) {
    note(`dava reddedildi (HTTP ${tc.status}): ${(tc.text || '').slice(0, 240)}`);
  }
  if (!ok('dava olusturuldu', tc.status === 201 || tc.status === 200, `HTTP ${tc.status}`)) {
    console.log('\nozet: ' + pass + ' gecti, ' + (fail) + ' hata -- dava acilamadigi icin kesildi');
    process.exit(1);
  }
  const topic = tc.json;
  const topicId = topic?.id;
  ok('dava id dondu', !!topicId, topicId || '');
  const sides = topic?.sides ?? [];
  ok('iki taraf olustu', sides.length === 2, `${sides.length} taraf`);

  // ---- 7. kanit ekleme
  console.log('\n7) KANIT EKLEME (gercek, kaynakli)');
  const sideId = sides[0]?.id;
  const ev = await call(`/topics/sides/${sideId}/evidences`, {
    method: 'POST', token: access,
    body: {
      content: 'Stanford Universitesi tarafindan yurutulen ve 1.600 calisan uzerinde yapilan '
             + 'randomize kontrollu deneyde, haftada iki gun evden calisan calisanlarin istifa '
             + 'oraninin yuzde 33 azaldigi, performans degerlendirmelerinde ise anlamli bir '
             + 'dusus olmadigi raporlanmistir.',
      sourceUrl: 'https://www.nature.com/articles/s41586-024-07500-2',
    },
  });
  ok('kanit eklendi', ev.status === 201 || ev.status === 200, `HTTP ${ev.status}`);
  if (ev.status >= 400) note(`govde: ${(ev.text || '').slice(0, 240)}`);
  const evidenceId = ev.json?.id;

  // ---- 8. AI puanlamasi
  console.log('\n8) AI PUANLAMASI (kuyruk, en fazla 90 sn beklenir)');
  let scored = null;
  for (let i = 0; i < 18; i++) {
    await sleep(5000);
    const d = await call(`/topics/${topicId}`);
    const found = (d.json?.sides ?? []).flatMap((s) => s.evidences ?? []).find((x) => x.id === evidenceId);
    if (found && found.score !== null && found.score !== undefined) { scored = found; break; }
    process.stdout.write(`\r       bekleniyor... ${(i + 1) * 5} sn`);
  }
  console.log('');
  if (ok('kanit puanlandi', !!scored, scored ? `puan=${scored.score}` : 'zaman asimi')) {
    ok('puan 0-100 arasinda', scored.score >= 0 && scored.score <= 100, `${scored.score}`);
    ok('AI gerekcesi uretildi', !!scored.aiReasoning && scored.aiReasoning.length > 20);
    const qb = scored.qualityBreakdown;
    if (ok('kalite dagilimi var', !!qb)) {
      const keys = ['sourceReliability', 'verifiability', 'relevance', 'specificity', 'timeliness'];
      ok('5 bilesen tam', keys.every((k) => k in qb), JSON.stringify(qb));
      const sum = keys.reduce((a, k) => a + (qb[k] ?? 0), 0);
      ok('bilesen toplami puana esit (+-2)', Math.abs(sum - scored.score) <= 2, `toplam=${sum} puan=${scored.score}`);
    }
    ok('kaynakli kanit 60 uzeri aldi', scored.score >= 60, `puan=${scored.score}`);
  }

  // ---- 9. odul puani
  console.log('\n9) ODUL PUANI DEFTERE ISLEDI MI');
  const me2 = await call('/users/me', { token: access });
  const bal = me2.json?.pointsBalance;
  const expected = scored ? (scored.score >= 90 ? 20 : scored.score >= 80 ? 12 : scored.score >= 70 ? 8 : scored.score >= 60 ? 4 : 0) : null;
  if (scored) ok('puan kademesi dogru', bal === expected, `bakiye=${bal} beklenen=${expected} (kalite ${scored.score})`);

  // ---- 10. taraf gucu
  console.log('\n10) TARAF GUCU FORMULU');
  const det = await call(`/topics/${topicId}`);
  const s0 = (det.json?.sides ?? []).find((s) => s.id === sideId);
  if (s0 && scored) {
    const expStrength = (s0.totalScore + 2 * 50) / (s0.evidenceCount + 2);
    ok('guc = (toplam + 2x50)/(sayi + 2)', Math.abs((s0.strengthScore ?? -1) - expStrength) < 0.6,
       `guc=${s0.strengthScore} beklenen=${expStrength.toFixed(1)}`);
    const other = (det.json?.sides ?? []).find((s) => s.id !== sideId);
    ok('kanitli taraf onde', (s0.strengthScore ?? 0) > (other?.strengthScore ?? 0),
       `${s0.strengthScore} vs ${other?.strengthScore}`);
  }

  // ---- 11. bildirim
  console.log('\n11) BILDIRIM');
  const nf = await call('/notifications', { token: access });
  ok('/notifications 200', nf.status === 200, `HTTP ${nf.status}`);
  const items = nf.json?.items ?? nf.json ?? [];
  ok('puanlama bildirimi geldi', Array.isArray(items) && items.length > 0, `${items.length} bildirim`);
  if (Array.isArray(items) && items.length) console.log('       tipler: ' + items.map((x) => x.type).join(', '));

  // ---- 12. itibar siralamasi
  console.log('\n12) ITIBAR SIRALAMASI');
  const lb = await call('/users/leaderboard');
  ok('/users/leaderboard 200', lb.status === 200, `HTTP ${lb.status}`);
  const lbItems = lb.json?.items ?? lb.json ?? [];
  ok('siralama BOS DEGIL', Array.isArray(lbItems) && lbItems.length > 0, `${lbItems.length} kullanici`);

  // ---- 13. yetkisiz erisim
  console.log('\n13) YETKI KONTROLLERI');
  const noAuth = await call('/topics', { method: 'POST', body: topicBody });
  ok('kimliksiz dava acilamiyor', noAuth.status === 401, `HTTP ${noAuth.status}`);
  const adminOnly = await call('/topics/evidences/rescore-stale', { method: 'POST', token: access });
  ok('normal kullanici admin ucunu kullanamiyor', adminOnly.status === 403 || adminOnly.status === 401, `HTTP ${adminOnly.status}`);
  const selfReport = evidenceId
    ? await call(`/topics/evidences/${evidenceId}/report`, { method: 'POST', token: access, body: { reason: 'FAKE_SOURCE' } })
    : null;
  if (selfReport) ok('kendi kanitini sikayet edemiyor', selfReport.status >= 400, `HTTP ${selfReport.status}`);

  // ---- sonuc
  console.log('\n' + '='.repeat(70));
  console.log(`SONUC: ${pass} gecti, ${fail} hata`);
  if (notes.length) { console.log('\nNOTLAR:'); notes.forEach((n) => console.log('  - ' + n)); }
  console.log(`\nCANLIYA YAZILAN TEST VERISI (elle silinebilir):`);
  console.log(`  kullanici: ${USER.username}  (${USER.email})`);
  console.log(`  dava     : ${topicId}`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((err) => { console.error('\nCOKTU:', err.message); process.exit(1); });
