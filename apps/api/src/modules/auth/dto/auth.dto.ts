import { createZodDto } from 'nestjs-zod';
import {
  CurrentUser as CurrentUserSchema,
  LoginInput,
  OkResponse,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
} from '@ifsuv/shared';

export class LoginInputDto extends createZodDto(LoginInput) {}
export class PasswordResetRequestInputDto extends createZodDto(PasswordResetRequestInput) {}
export class PasswordResetConfirmInputDto extends createZodDto(PasswordResetConfirmInput) {}
export class CurrentUserDto extends createZodDto(CurrentUserSchema) {}
export class OkResponseDto extends createZodDto(OkResponse) {}
