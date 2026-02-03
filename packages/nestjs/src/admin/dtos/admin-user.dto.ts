import { Transform } from 'class-transformer'
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator'
import { ListQueryDto } from '../../owneable/types/list-query.dto'

export class AdminUserListQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  role?: string

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true
    if (value === 'false') return false
    return value
  })
  @IsBoolean()
  blocked?: boolean
}

export class AdminUpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  role?: string

  @IsOptional()
  @IsBoolean()
  blocked?: boolean
}
