import { IsEmail, IsOptional, IsString } from 'class-validator'

export class BaseUpdateUserDto {
  @IsEmail()
  @IsString()
  email?: string

  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  avatar?: string
}
