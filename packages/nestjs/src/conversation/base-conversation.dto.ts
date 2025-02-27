import { IsEnum, IsOptional, IsString } from 'class-validator'

export class BaseMessageDto {
  @IsEnum(['user', 'assistant', 'system'])
  role: string

  @IsString()
  content: string
}

export class BaseCreateConversationDto {
  @IsString()
  prompt: string
}

export class BaseUpdateConversationDto {
  @IsOptional()
  @IsString()
  title?: string
}
