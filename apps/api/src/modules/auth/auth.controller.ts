import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  CurrentUserDto,
  LoginInputDto,
  OkResponseDto,
  PasswordResetConfirmInputDto,
  PasswordResetRequestInputDto,
} from './dto/auth.dto';
import { AuthService } from './services/auth.service';
import { PasswordResetService } from './services/password-reset.service';
import type { UserDocument } from '../users/schemas/user.schema';

function clientContext(req: FastifyRequest): { ip?: string; ua?: string } {
  return { ip: req.ip, ua: req.headers['user-agent'] };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly passwordReset: PasswordResetService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: LoginInputDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<CurrentUserDto> {
    const { user, newSession } = await this.auth.login(
      body.email,
      body.password,
      clientContext(req),
    );

    reply.setCookie(this.config.getOrThrow<string>('COOKIE_NAME'), newSession.secret, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get<boolean>('COOKIE_SECURE', false),
      path: '/',
      expires: newSession.expiresAt,
    });

    return this.auth.toCurrentUserDto(user);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<OkResponseDto> {
    if (req.session && req.user) {
      await this.auth.logout(req.session.id, req.user._id, clientContext(req));
    }
    reply.clearCookie(this.config.getOrThrow<string>('COOKIE_NAME'), { path: '/' });
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: UserDocument): CurrentUserDto {
    return this.auth.toCurrentUserDto(user);
  }

  @Public()
  @Post('password-reset/request')
  @HttpCode(200)
  async passwordResetRequest(
    @Body() body: PasswordResetRequestInputDto,
    @Req() req: FastifyRequest,
  ): Promise<OkResponseDto> {
    await this.passwordReset.request(body.email, clientContext(req));
    return { ok: true };
  }

  @Public()
  @Post('password-reset/confirm')
  @HttpCode(200)
  async passwordResetConfirm(
    @Body() body: PasswordResetConfirmInputDto,
    @Req() req: FastifyRequest,
  ): Promise<OkResponseDto> {
    await this.passwordReset.confirm(body.token, body.newPassword, clientContext(req));
    return { ok: true };
  }
}
