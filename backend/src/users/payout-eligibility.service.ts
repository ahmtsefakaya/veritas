import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Odul puanini ekonomik degere cevirebilmek icin gereken sartlar.
 *
 * Tasarim gerekcesi (X / Reddit Contributor Program ornekleri):
 * - Puan kazanimi herkese acik, ama PARAYA CEVIRME ayri bir esige bagli.
 *   Boylece bot/coklu hesap acip puan toplamak karsiliksiz kalir.
 * - Hicbir sart kullanici oyuna dayanmaz; hepsi ya dogrulanabilir hesap
 *   verisi ya da AI kalite puanidir. Art niyetli kalabalik sonucu degistiremez.
 * - Tum sartlar ayni anda saglanmak zorunda (AND), X'in uygunluk modeli gibi.
 */

export const PAYOUT_RULES = {
  /** Hesap en az bu kadar gun once acilmis olmali. */
  minAccountAgeDays: 30,
  /** Birikmis odul puani esigi. */
  minPointsBalance: 500,
  /** Puanlanmis en az bu kadar kanit uretmis olmali. */
  minScoredEvidenceCount: 10,
  /** Puanlanmis kanitlarin ortalama kalite puani esigi. */
  minAverageQuality: 70,
  /** Odeme altyapisinin destekledigi ulkeler (ISO 3166-1 alpha-2). */
  supportedCountries: [
    'TR',
    'US',
    'DE',
    'NL',
    'FR',
    'GB',
    'AT',
    'BE',
    'ES',
    'IT',
    'SE',
    'DK',
    'FI',
    'NO',
    'IE',
    'PL',
    'CZ',
    'PT',
    'CA',
    'AU',
  ],
} as const;

export type EligibilityRequirement = {
  key: string;
  label: string;
  met: boolean;
  current: number | string | boolean | null;
  required: number | string | boolean;
};

export type EligibilityResult = {
  eligible: boolean;
  pointsBalance: number;
  requirements: EligibilityRequirement[];
  /** Henuz saglanmayan sartlarin kisa ozeti. */
  missing: string[];
};

@Injectable()
export class PayoutEligibilityService {
  constructor(private prisma: PrismaService) {}

  async check(userId: string): Promise<EligibilityResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        createdAt: true,
        pointsBalance: true,
        isEmailVerified: true,
        isBanned: true,
        isPremium: true,
        premiumUntil: true,
        country: true,
      },
    });

    if (!user) {
      return {
        eligible: false,
        pointsBalance: 0,
        requirements: [],
        missing: ['Kullanici bulunamadi.'],
      };
    }

    const scored = await this.prisma.evidence.aggregate({
      where: { authorId: userId, score: { not: null } },
      _count: { _all: true },
      _avg: { score: true },
    });

    const scoredCount = scored._count._all;
    const averageQuality = scored._avg.score ? Math.round(scored._avg.score) : 0;

    const accountAgeDays = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    const premiumActive =
      user.isPremium && (!user.premiumUntil || user.premiumUntil.getTime() > Date.now());

    const countrySupported =
      !!user.country &&
      (PAYOUT_RULES.supportedCountries as readonly string[]).includes(user.country);

    const requirements: EligibilityRequirement[] = [
      {
        key: 'accountAge',
        label: `Hesap yasi en az ${PAYOUT_RULES.minAccountAgeDays} gun`,
        met: accountAgeDays >= PAYOUT_RULES.minAccountAgeDays,
        current: accountAgeDays,
        required: PAYOUT_RULES.minAccountAgeDays,
      },
      {
        key: 'pointsBalance',
        label: `Odul puani en az ${PAYOUT_RULES.minPointsBalance}`,
        met: user.pointsBalance >= PAYOUT_RULES.minPointsBalance,
        current: user.pointsBalance,
        required: PAYOUT_RULES.minPointsBalance,
      },
      {
        key: 'scoredEvidence',
        label: `Puanlanmis en az ${PAYOUT_RULES.minScoredEvidenceCount} kanit`,
        met: scoredCount >= PAYOUT_RULES.minScoredEvidenceCount,
        current: scoredCount,
        required: PAYOUT_RULES.minScoredEvidenceCount,
      },
      {
        key: 'averageQuality',
        label: `Ortalama kanit kalitesi en az ${PAYOUT_RULES.minAverageQuality}`,
        met: averageQuality >= PAYOUT_RULES.minAverageQuality,
        current: averageQuality,
        required: PAYOUT_RULES.minAverageQuality,
      },
      {
        key: 'emailVerified',
        label: 'E-posta dogrulanmis',
        met: user.isEmailVerified,
        current: user.isEmailVerified,
        required: true,
      },
      {
        key: 'premium',
        label: 'Aktif abonelik',
        met: premiumActive,
        current: premiumActive,
        required: true,
      },
      {
        key: 'country',
        label: 'Odeme destekli ulke',
        met: countrySupported,
        current: user.country,
        required: PAYOUT_RULES.supportedCountries.join(', '),
      },
      {
        key: 'notBanned',
        label: 'Hesap kisitli degil',
        met: !user.isBanned,
        current: !user.isBanned,
        required: true,
      },
    ];

    return {
      eligible: requirements.every((requirement) => requirement.met),
      pointsBalance: user.pointsBalance,
      requirements,
      missing: requirements.filter((r) => !r.met).map((r) => r.label),
    };
  }

  rules() {
    return PAYOUT_RULES;
  }
}
