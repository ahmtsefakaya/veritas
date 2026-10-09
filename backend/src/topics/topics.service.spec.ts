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
    expect(result.sides[0].strengthScore).toBeNull();
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
