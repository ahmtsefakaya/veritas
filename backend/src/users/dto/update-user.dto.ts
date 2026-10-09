import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { PAYOUT_RULES } from '../payout-eligibility.service';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @IsIn(PAYOUT_RULES.supportedCountries as unknown as string[])
  country?: string;
}
