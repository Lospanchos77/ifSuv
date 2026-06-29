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
  CompanyCreateInputDto,
  CompanyListQueryDto,
  CompanyListResponseDto,
  CompanyPublicDto,
  CompanyUpdateInputDto,
} from './dto/companies.dto';
import { CompaniesService } from './companies.service';

@ApiTags('companies')
@Controller('companies')
@Roles(Role.Admin, Role.Technician)
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  list(@Query() query: CompanyListQueryDto): Promise<CompanyListResponseDto> {
    return this.companies.list(query);
  }

  @Post()
  create(@Body() body: CompanyCreateInputDto): Promise<CompanyPublicDto> {
    return this.companies.create(body);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<CompanyPublicDto> {
    return this.companies.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: CompanyUpdateInputDto,
  ): Promise<CompanyPublicDto> {
    return this.companies.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.Admin)
  async remove(@Param('id') id: string): Promise<void> {
    await this.companies.softDelete(id);
  }
}
