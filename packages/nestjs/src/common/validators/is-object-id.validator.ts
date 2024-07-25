import { ValidationOptions, registerDecorator } from 'class-validator'

export function IsObjectId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: {
        validate(value: any) {
          // MongoDB ObjectId is a 24-character hex string
          const objectIdRegex = /^[0-9a-fA-F]{24}$/
          return objectIdRegex.test(value?.toString())
        },
      },
    })
  }
}
}
