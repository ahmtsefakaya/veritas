import { IsEmail, IsString, Length } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Gecerli bir e-posta adresi girin.' })
  email: string;
}

export class VerifyEmailDto {
  @IsString()
  @Length(64, 64, { message: 'Jeton gecersiz.' })
  token: string;
}
