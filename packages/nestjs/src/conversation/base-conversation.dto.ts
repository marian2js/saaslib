import { Type } from 'class-transformer'
import { IsArray, IsDate, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator'
import { BaseConversationVisibility } from './base-conversation.model'

export class BaseMessageDto {
  @IsEnum(['user', 'assistant', 'system'])
  role: string

  @IsString()
  content: string

  @IsDate()
  @Type(() => Date)
  timestamp: Date
}

export class BaseCreateConversationDto<TVisibility extends BaseConversationVisibility = BaseConversationVisibility> {
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

  @IsOptional()
  @IsEnum(BaseConversationVisibility)
  visibility?: TVisibility
}

export class BaseUpdateConversationDto<TVisibility extends BaseConversationVisibility = BaseConversationVisibility> {
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

  @IsOptional()
  @IsEnum(BaseConversationVisibility)
  visibility?: TVisibility
}
