import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum ModerationAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_REVISION = 'REQUEST_REVISION',
}

export class ModerateTopicDto {
  @IsEnum(ModerationAction)
  action: ModerationAction;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
