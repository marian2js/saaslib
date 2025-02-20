import { IsEnum, IsOptional } from 'class-validator'

export class BaseUpdateMessageDto {
  @IsOptional()
  @IsEnum([1, 0, -1])
  feedback?: 1 | 0 | -1
}
