import { IsIn, IsInt } from 'class-validator';

export class VoteEvidenceDto {
  @IsInt()
  @IsIn([1, -1, 0], { message: 'Oy degeri 1, -1 veya 0 olmali.' })
  value: number;
}
