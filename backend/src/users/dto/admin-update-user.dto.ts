import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminUpdateUserDto {
  @IsOptional()
  @IsBoolean()
  isBanned?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['USER', 'MODERATOR', 'ADMIN'])
  role?: 'USER' | 'MODERATOR' | 'ADMIN';

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
