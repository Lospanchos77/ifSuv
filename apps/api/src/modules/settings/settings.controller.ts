import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@ifsuv/shared';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  SiteSettingsDto,
  SiteSettingsUpdateInputDto,
} from './dto/settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  // Public : accessible même avant login (pour afficher le siteName/logo sur /login)
  @Public()
  @Get()
  get(): Promise<SiteSettingsDto> {
    return this.settings.get();
  }

  @Patch()
  @Roles(Role.Admin)
  update(@Body() body: SiteSettingsUpdateInputDto): Promise<SiteSettingsDto> {
    return this.settings.update(body);
  }
}
