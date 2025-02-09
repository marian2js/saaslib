import { Type } from 'class-transformer'
import { IsArray, IsDate, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator'

export class BaseMessageDto {
  @IsEnum(['user', 'assistant', 'system'])
  role: string

  @IsString()
  content: string

  @IsDate()
  @Type(() => Date)
  timestamp: Date
}

export class BaseCreateConversationDto {
  @IsString()
  title: string

  @IsOptional()
  @IsString()
  description?: string

  @IsString()
  model: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BaseMessageDto)
  messages: BaseMessageDto[]
}

export class BaseUpdateConversationDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BaseMessageDto)
  messages?: BaseMessageDto[]
}
