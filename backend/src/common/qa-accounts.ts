/**
 * QA / otomasyon hesaplari.
 *
 * `test/live-journey.mjs` canli sisteme gercek bir kullanici yazar; bu sart
 * kosulmadan urun dogrulanamiyor. Ama o hesaplarin itibar puani da gercek
 * olarak isleniyor ve halka acik siralamada gorunuyordu: ziyaretci ilk sayfada
 * `e2e_...` botlarini goruyordu. Cozum hesabi silmek degil (puan defteri
 * degismez), halka acik listelerden harici tutmak.
 *
 * Alan adi `QA_EMAIL_DOMAINS` ile (virgulle ayrilmis) degistirilebilir.
 */
export const DEFAULT_QA_EMAIL_DOMAINS = ['veritas-test.local'];

export function qaEmailDomains(): string[] {
  const raw = process.env.QA_EMAIL_DOMAINS;
  if (!raw) return DEFAULT_QA_EMAIL_DOMAINS;
  const parsed = raw
    .split(',')
    .map((d) => d.trim().replace(/^@/, '').toLowerCase())
    .filter((d) => d.length > 0);
  return parsed.length > 0 ? parsed : DEFAULT_QA_EMAIL_DOMAINS;
}

export function isQaEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lowered = email.toLowerCase();
  return qaEmailDomains().some((domain) => lowered.endsWith(`@${domain}`));
}

/**
 * Prisma `where` parcasi: QA alan adlarindaki hesaplari disla.
 */
export function excludeQaAccountsFilter(): Array<{
  email: { not: { endsWith: string } };
}> {
  return qaEmailDomains().map((domain) => ({
    email: { not: { endsWith: `@${domain}` } },
  }));
}
