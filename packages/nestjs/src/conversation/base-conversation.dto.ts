import { IsEnum, IsOptional, IsString } from 'class-validator'
import { BaseConversationVisibility } from './base-conversation.model'

export class BaseMessageDto {
  @IsEnum(['user', 'assistant', 'system'])
  role: string

  @IsString()
  content: string
}

export class BaseCreateConversationDto {
  @IsString()
  prompt: string

  @IsOptional()
  @IsEnum(BaseConversationVisibility)
  visibility?: BaseConversationVisibility
}

export class BaseUpdateConversationDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsEnum(BaseConversationVisibility)
  visibility?: BaseConversationVisibility
}
