import { describe, expect, it } from 'vitest';
import { TopicsService } from './topics.service';

/**
 * withScores private oldugu icin servis ornegi uzerinden cagirilir.
 * Bu testler urunun temel vaadini korur: KALITE kazanir, nicelik degil.
 */
function scoreSides(sides: { id: string; scores: (number | null)[] }[]) {
  const service = new TopicsService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const topic = {
    sides: sides.map((side) => ({
      id: side.id,
      position: side.id,
      label: side.id,
      evidences: side.scores.map((score) => ({ score })),
    })),
  };
  return (service as unknown as { withScores: (t: unknown) => any }).withScores(topic);
}

describe('TopicsService.withScores - taraf gucu', () => {
  it('tek saglam kanit, iki vasat kaniti yener', () => {
    const result = scoreSides([
      { id: 'A', scores: [90] },
      { id: 'B', scores: [45, 45] },
    ]);

    expect(result.leadingSideId).toBe('A');
    expect(result.sides[0].strengthScore).toBe(63);
    expect(result.sides[1].strengthScore).toBe(48);
  });

  it('cok sayida zayif kanit yigmak tarafi one gecirmez', () => {
    const result = scoreSides([
      { id: 'A', scores: [85] },
      { id: 'B', scores: [40, 40, 40, 40, 40, 40] },
    ]);

    expect(result.leadingSideId).toBe('A');
  });

  it('esit kalitede daha cok kanit sunan taraf one gecer', () => {
    const result = scoreSides([
      { id: 'A', scores: [80] },
      { id: 'B', scores: [80, 80, 80] },
    ]);

    // Ayni kalitede, daha fazla dogrulanmis kanit guveni artirir.
    expect(result.leadingSideId).toBe('B');
  });

  it('puanlanmamis kanitlar guce katilmaz', () => {
    const result = scoreSides([
      { id: 'A', scores: [90, null, null] },
      { id: 'B', scores: [60] },
    ]);

    expect(result.sides[0].scoredCount).toBe(1);
    expect(result.sides[0].evidenceCount).toBe(3);
    expect(result.leadingSideId).toBe('A');
  });

  it('hic puan yoksa onde taraf olmaz', () => {
    const result = scoreSides([
      { id: 'A', scores: [null] },
      { id: 'B', scores: [] },
    ]);

    expect(result.leadingSideId).toBeNull();
    expect(result.isTie).toBe(false);
    // puanlanmamis kanit kalite bilgisi tasimaz: taraf notr 50'de durur
    expect(result.sides[0].strengthScore).toBe(50);
    expect(result.sides[0].averageScore).toBeNull();
  });

  it('esit gucte beraberlik ilan edilir', () => {
    const result = scoreSides([
      { id: 'A', scores: [70] },
      { id: 'B', scores: [70] },
    ]);

    expect(result.isTie).toBe(true);
    expect(result.leadingSideId).toBeNull();
  });

  it('ortalama ve toplam bilgileri korunur', () => {
    const result = scoreSides([{ id: 'A', scores: [60, 80] }]);

    expect(result.sides[0].totalScore).toBe(140);
    expect(result.sides[0].averageScore).toBe(70);
    expect(result.sides[0].strengthScore).toBe(60);
  });
});

/**
 * Onay beklerken katkı kurallari.
 *
 * Bu testler canlida yakalanan bir hatayi koruyor: yeni kullanici dava aciyor,
 * dava PENDING kaliyor ve sahibi kendi davasina tek bir kanit bile
 * ekleyemiyordu. Yani kayit olan herkes ilk adimda duvara carpiyordu.
 */
function canContribute(
  topic: { status: string; creatorId: string },
  userId: string,
  role: string | undefined,
  action: 'evidence' | 'comment' = 'evidence',
) {
  const service = new TopicsService(
    {} as never, {} as never, {} as never, {} as never,
    {} as never, {} as never, {} as never,
  );
  const fn = (service as unknown as {
    assertCanContribute: (t: unknown, u: string, r: string | undefined, a: string) => void;
  }).assertCanContribute.bind(service);
  try {
    fn(topic, userId, role, action);
    return { allowed: true, message: null as string | null };
  } catch (err) {
    return { allowed: false, message: (err as Error).message };
  }
}

describe('TopicsService.assertCanContribute - onay bekleyen davaya katki', () => {
  const pending = { status: 'PENDING', creatorId: 'sahip' };
  const approved = { status: 'APPROVED', creatorId: 'sahip' };
  const rejected = { status: 'REJECTED', creatorId: 'sahip' };

  it('onayli davaya herkes kanit ekleyebilir', () => {
    expect(canContribute(approved, 'yabanci', 'USER').allowed).toBe(true);
  });

  it('onay bekleyen davaya SAHIBI kanit ekleyebilir', () => {
    expect(canContribute(pending, 'sahip', 'USER').allowed).toBe(true);
  });

  it('onay bekleyen davaya baskasi kanit EKLEYEMEZ', () => {
    const res = canContribute(pending, 'yabanci', 'USER');
    expect(res.allowed).toBe(false);
    expect(res.message).toContain('henuz onaylanmadi');
  });

  it('onay bekleyen davaya ADMIN kanit ekleyebilir', () => {
    expect(canContribute(pending, 'yonetici', 'ADMIN').allowed).toBe(true);
  });

  it('onay bekleyen davaya MODERATOR kanit ekleyebilir', () => {
    expect(canContribute(pending, 'moderator', 'MODERATOR').allowed).toBe(true);
  });

  it('reddedilen davaya SAHIBI DAHI kanit ekleyemez', () => {
    const res = canContribute(rejected, 'sahip', 'USER');
    expect(res.allowed).toBe(false);
    expect(res.message).toContain('reddedildigi');
  });

  it('reddedilen davaya ADMIN dahi kanit ekleyemez', () => {
    expect(canContribute(rejected, 'yonetici', 'ADMIN').allowed).toBe(false);
  });

  it('ayni kurallar yorum icin de gecerli', () => {
    expect(canContribute(pending, 'sahip', 'USER', 'comment').allowed).toBe(true);
    const res = canContribute(pending, 'yabanci', 'USER', 'comment');
    expect(res.allowed).toBe(false);
    expect(res.message).toContain('yorum yapabilir');
  });
});

describe('TopicsService.withScores - kanitsiz taraf', () => {
  it('kanitsiz taraf notr 50 gosterir, bos degil', () => {
    const result = scoreSides([
      { id: 'A', scores: [90] },
      { id: 'B', scores: [] },
    ]);

    expect(result.sides[1].strengthScore).toBe(50);
    expect(result.sides[1].averageScore).toBeNull();
    expect(result.sides[1].evidenceCount).toBe(0);
    expect(result.leadingSideId).toBe('A');
  });

  it('iki taraf da kanitsizsa beraberlik ilan edilmez', () => {
    const result = scoreSides([
      { id: 'A', scores: [] },
      { id: 'B', scores: [] },
    ]);

    expect(result.sides[0].strengthScore).toBe(50);
    expect(result.sides[1].strengthScore).toBe(50);
    expect(result.isTie).toBe(false);
    expect(result.leadingSideId).toBeNull();
  });
});
