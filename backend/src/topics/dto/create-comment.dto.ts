import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(2, { message: 'Yorum en az 2 karakter olmali.' })
  @MaxLength(2000, { message: 'Yorum en fazla 2000 karakter olabilir.' })
  content: string;

  @IsOptional()
  @IsUUID('4', { message: 'Gecersiz yanit hedefi.' })
  parentId?: string;
}
