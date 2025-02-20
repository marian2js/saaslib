import { ClassConstructor } from 'class-transformer'

export interface OwneableEntityOptions<T> {
  dtos: {
    create?: ClassConstructor<Partial<T>>
    update?: ClassConstructor<Partial<T>>
  }
  pageSize?: {
    default?: number
    max?: number
  }
}
