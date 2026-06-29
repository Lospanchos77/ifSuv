import { createZodDto } from 'nestjs-zod';
import {
  UserCreateInput,
  UserListQuery,
  UserListResponse,
  UserPublic,
  UserUpdateInput,
} from '@ifsuv/shared';

export class UserCreateInputDto extends createZodDto(UserCreateInput) {}
export class UserUpdateInputDto extends createZodDto(UserUpdateInput) {}
export class UserListQueryDto extends createZodDto(UserListQuery) {}
export class UserPublicDto extends createZodDto(UserPublic) {}
export class UserListResponseDto extends createZodDto(UserListResponse) {}
