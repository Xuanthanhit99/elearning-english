// src/chat/dto/create-message.dto.ts
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { QuickAction } from '@prisma/client';

export class CreateMessageDto {
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ValidateIf((o) => !o.quickAction)
  @IsString()
  @MaxLength(500)
  content?: string;

  @ValidateIf((o) => !o.content)
  @IsEnum(QuickAction)
  quickAction?: QuickAction;
}
