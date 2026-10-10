import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_QA_EMAIL_DOMAINS,
  excludeQaAccountsFilter,
  excludeQaCreatorsFilter,
  isQaEmail,
  qaEmailDomains,
} from './qa-accounts';

/**
 * Bu testler QA gurultusunun sessizce geri donmesini engeller.
 *
 * Canli yolculuk testi her kosusunda uretim veritabanina gercek bir kullanici
 * ve PENDING bir dava yaziyor. Bu kayitlar halka acik listelerden ve
 * moderasyon kuyrugundan harici tutulmazsa kuyruk tamamen test artigiyla
 * doluyor; filtreyi birisi kaldirirsa burasi kirmizi yanmali.
 */
describe('qa-accounts', () => {
  const original = process.env.QA_EMAIL_DOMAINS;

  afterEach(() => {
    if (original === undefined) delete process.env.QA_EMAIL_DOMAINS;
    else process.env.QA_EMAIL_DOMAINS = original;
  });

  it('ontanimli alan adi veritas-test.local', () => {
    delete process.env.QA_EMAIL_DOMAINS;
    expect(qaEmailDomains()).toEqual(DEFAULT_QA_EMAIL_DOMAINS);
    expect(isQaEmail('e2e.1@veritas-test.local')).toBe(true);
    expect(isQaEmail('E2E.1@VERITAS-TEST.LOCAL')).toBe(true);
    expect(isQaEmail('ahmetsefakaya15@gmail.com')).toBe(false);
    expect(isQaEmail(null)).toBe(false);
  });

  it('QA_EMAIL_DOMAINS ile degistirilebilir, bos deger ontanimliya doner', () => {
    process.env.QA_EMAIL_DOMAINS = '@qa.example, bot.example';
    expect(qaEmailDomains()).toEqual(['qa.example', 'bot.example']);
    expect(isQaEmail('x@bot.example')).toBe(true);
    expect(isQaEmail('x@veritas-test.local')).toBe(false);

    process.env.QA_EMAIL_DOMAINS = '  ,  ';
    expect(qaEmailDomains()).toEqual(DEFAULT_QA_EMAIL_DOMAINS);
  });

  it('hesap filtresi kullanicinin kendi e-postasini hedefler', () => {
    delete process.env.QA_EMAIL_DOMAINS;
    expect(excludeQaAccountsFilter()).toEqual([
      { email: { not: { endsWith: '@veritas-test.local' } } },
    ]);
  });

  it('kurucu filtresi iliskili creator uzerinden filtreler', () => {
    delete process.env.QA_EMAIL_DOMAINS;
    expect(excludeQaCreatorsFilter()).toEqual([
      { creator: { email: { not: { endsWith: '@veritas-test.local' } } } },
    ]);
  });

  it('her alan adi icin ayri bir kosul uretir (AND olarak kullanilir)', () => {
    process.env.QA_EMAIL_DOMAINS = 'a.example,b.example';
    expect(excludeQaCreatorsFilter()).toHaveLength(2);
  });
});
