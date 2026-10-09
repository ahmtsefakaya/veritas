import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveReportDto {
  @IsString()
  @IsIn(['ACCEPT', 'REJECT'])
  action!: 'ACCEPT' | 'REJECT';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
