import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Sayfalama parametreleri (kanit ve yorum listeleri).
 *
 * Ust sinirlar servis tarafinda da kirpilir (TopicsService.EVIDENCE_PAGE_SIZE /
 * COMMENT_PAGE_SIZE); burasi istemciye net bir hata mesaji verir.
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100, { message: 'Sayfa boyutu en fazla 100 olabilir.' })
  limit?: number;
}
