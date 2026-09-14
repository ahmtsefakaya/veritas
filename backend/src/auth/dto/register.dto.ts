import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Gecerli bir e-posta adresi girin.' })
  email: string;

  @IsString()
  @MinLength(3, { message: 'Kullanici adi en az 3 karakter olmali.' })
  @MaxLength(20, { message: 'Kullanici adi en fazla 20 karakter olabilir.' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Kullanici adi yalnizca harf, rakam ve alt cizgi icerebilir.',
  })
  username: string;

  @IsString()
  @MinLength(8, { message: 'Sifre en az 8 karakter olmali.' })
  @MaxLength(72, { message: 'Sifre en fazla 72 karakter olabilir.' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Sifre en az bir buyuk harf, bir kucuk harf ve bir rakam/ozel karakter icermeli.',
  })
  password: string;

  @IsString()
  @MaxLength(50)
  displayName?: string;
}
