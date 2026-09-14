import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateEvidenceDto {
  @IsString()
  @MinLength(10, { message: 'Delil icerigi en az 10 karakter olmali.' })
  @MaxLength(3000, { message: 'Delil icerigi en fazla 3000 karakter olabilir.' })
  content: string;

  @IsOptional()
  @IsUrl({}, { message: 'Gecerli bir link girin.' })
  sourceUrl?: string;
}
