import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

function isValidIanaTimezone(value: unknown): boolean {
  if (typeof value !== 'string' || !value) return false;

  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function IsIanaTimezone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isIanaTimezone',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return isValidIanaTimezone(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid IANA timezone (e.g. Asia/Ho_Chi_Minh)`;
        },
      },
    });
  };
}
