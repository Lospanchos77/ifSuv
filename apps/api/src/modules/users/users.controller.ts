import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@ifsuv/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UserCreateInputDto,
  UserListQueryDto,
  UserListResponseDto,
  UserPublicDto,
  UserUpdateInputDto,
} from './dto/users.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
@Roles(Role.Admin)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query() query: UserListQueryDto): Promise<UserListResponseDto> {
    return this.users.list(query);
  }

  @Post()
  create(@Body() body: UserCreateInputDto): Promise<UserPublicDto> {
    return this.users.create(body);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<UserPublicDto> {
    return this.users.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UserUpdateInputDto,
  ): Promise<UserPublicDto> {
    return this.users.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.users.softDelete(id);
  }
}
