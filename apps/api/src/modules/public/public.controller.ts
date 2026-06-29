import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { Public } from '../../common/decorators/public.decorator';
import {
  PublicTokenGuard,
  getQrTokenClaims,
} from '../../common/guards/public-token.guard';
import { TicketsService } from '../tickets/tickets.service';
import type { TicketPublicDto } from '../tickets/dto/tickets.dto';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private readonly tickets: TicketsService) {}

  @Public()
  @UseGuards(PublicTokenGuard)
  @Get('tickets/:token')
  async getTicketByToken(
    @Param('token') _token: string,
    @Req() req: FastifyRequest,
  ): Promise<TicketPublicDto> {
    const claims = getQrTokenClaims(req, 'public');
    const ticket = await this.tickets.findByPublicToken(claims.tid);
    return scrubForPublic(ticket);
  }
}

/**
 * Pour la vue publique on retire les champs sensibles (mot de passe PC, tokens internes).
 * `pcPassword`, `publicToken`, `techToken` ne doivent pas fuiter au client final.
 */
function scrubForPublic(ticket: TicketPublicDto): TicketPublicDto {
  const { pcPassword: _pcPassword, ...rest } = ticket;
  void _pcPassword;
  return rest as TicketPublicDto;
}

