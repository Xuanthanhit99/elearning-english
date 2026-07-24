import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendConversationMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string = '';
}
