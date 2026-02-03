import { IsOptional, IsString } from 'class-validator'

export class AdminChangeSubscriptionDto {
  @IsString()
  userId: string

  @IsString()
  priceId: string

  @IsOptional()
  @IsString()
  type?: string

  @IsOptional()
  @IsString()
  subscriptionId?: string
}

export class AdminSubscriptionActionDto {
  @IsString()
  userId: string

  @IsOptional()
  @IsString()
  type?: string

  @IsOptional()
  @IsString()
  subscriptionId?: string
}
