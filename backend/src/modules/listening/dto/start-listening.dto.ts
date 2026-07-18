import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class StartListeningDto {
  @IsOptional()
  @IsIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  level?: string;

  /*
   * Stage 6D.3: giới hạn độ dài — topic được dùng làm 1 phần Redis
   * lock key (cold-start cooldown) và BullMQ jobId (qua slugify()).
   * Không có giới hạn trước đây khiến input rất dài có thể tạo key/
   * jobId cồng kềnh không cần thiết (đã có lớp hash phòng thủ ở
   * ListeningService, nhưng chặn ngay ở input vẫn tốt hơn).
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  topic?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}
