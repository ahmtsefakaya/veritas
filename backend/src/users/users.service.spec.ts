import { UsersService } from './users.service';
import {
  isQaEmail,
  qaEmailDomains,
  excludeQaAccountsFilter,
} from '../common/qa-accounts';

describe('QA hesaplari', () => {
  afterEach(() => {
    delete process.env.QA_EMAIL_DOMAINS;
  });

  it('varsayilan olarak sadece veritas-test.local QA kabul edilir', () => {
    expect(qaEmailDomains()).toEqual(['veritas-test.local']);
    expect(isQaEmail('e2e.1@veritas-test.local')).toBe(true);
    expect(isQaEmail('E2E.1@VERITAS-TEST.LOCAL')).toBe(true);
    expect(isQaEmail('ahmet@gmail.com')).toBe(false);
    expect(isQaEmail('veritas-test.local@gmail.com')).toBe(false);
    expect(isQaEmail(null)).toBe(false);
  });

  it('QA_EMAIL_DOMAINS ile genisletilebilir', () => {
    process.env.QA_EMAIL_DOMAINS = '@qa.example , veritas-test.local';
    expect(qaEmailDomains()).toEqual(['qa.example', 'veritas-test.local']);
    expect(isQaEmail('x@qa.example')).toBe(true);
  });

  it('bos deger varsayilani bozmaz', () => {
    process.env.QA_EMAIL_DOMAINS = ' , ';
    expect(qaEmailDomains()).toEqual(['veritas-test.local']);
  });
});

describe('UsersService.leaderboard', () => {
  function serviceWith() {
    const prisma: any = {
      user: { findMany: vi.fn().mockResolvedValue([]) },
    };
    return { service: new UsersService(prisma, {} as any), prisma };
  }

  it('halka acik siralamadan QA hesaplarini disler', async () => {
    const { service, prisma } = serviceWith();
    await service.leaderboard();

    const where = prisma.user.findMany.mock.calls[0][0].where;
    expect(where.isBanned).toBe(false);
    expect(where.reputationScore).toEqual({ gt: 0 });
    expect(where.AND).toEqual(excludeQaAccountsFilter());
    expect(where.AND).toEqual([
      { email: { not: { endsWith: '@veritas-test.local' } } },
    ]);
  });

  it('en fazla 50 kayit dondurur', async () => {
    const { service, prisma } = serviceWith();
    await service.leaderboard(500);
    expect(prisma.user.findMany.mock.calls[0][0].take).toBe(50);
  });
});
