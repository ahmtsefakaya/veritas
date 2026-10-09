import { IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @Length(64, 64, { message: 'Jeton gecersiz.' })
  token: string;

  // Kayit ile ayni sifre politikasi.
  @IsString()
  @MinLength(8, { message: 'Sifre en az 8 karakter olmali.' })
  @MaxLength(72, { message: 'Sifre en fazla 72 karakter olabilir.' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Sifre en az bir buyuk harf, bir kucuk harf ve bir rakam/ozel karakter icermeli.',
  })
  password: string;
}
