import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const REPORT_REASONS = [
  'FAKE_SOURCE',
  'BROKEN_SOURCE',
  'OUT_OF_CONTEXT',
  'MISREPRESENTS_SOURCE',
  'DUPLICATE',
  'OFF_TOPIC',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export class ReportEvidenceDto {
  @IsString()
  @IsIn(REPORT_REASONS as unknown as string[])
  reason!: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  detail?: string;
}
