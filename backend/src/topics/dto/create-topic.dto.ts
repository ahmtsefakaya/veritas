import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTopicDto {
  @IsString()
  @MinLength(5, { message: 'Baslik en az 5 karakter olmali.' })
  @MaxLength(150, { message: 'Baslik en fazla 150 karakter olabilir.' })
  title: string;

  @IsString()
  @MinLength(20, { message: 'Aciklama en az 20 karakter olmali.' })
  @MaxLength(2000, { message: 'Aciklama en fazla 2000 karakter olabilir.' })
  description: string;

  @IsString()
  @MaxLength(50)
  category: string;

  @IsString()
  @MinLength(1, { message: 'A tarafi etiketi bos olamaz.' })
  @MaxLength(80)
  sideALabel: string;

  @IsString()
  @MinLength(1, { message: 'B tarafi etiketi bos olamaz.' })
  @MaxLength(80)
  sideBLabel: string;
}
