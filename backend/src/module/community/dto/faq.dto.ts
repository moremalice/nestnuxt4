// backend/src/module/community/dto/faq.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class GetFaqListDto {
  @IsOptional()
  @IsString()
  lang?: string = 'ko';
}
