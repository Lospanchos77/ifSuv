import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { Role } from '@ifsuv/shared';
import { Public } from '../../common/decorators/public.decorator';
import {
  PublicTokenGuard,
  getQrTokenClaims,
} from '../../common/guards/public-token.guard';
import { readUploadedFile } from '../tickets/read-uploaded-file';
import { TicketsService } from '../tickets/tickets.service';
import {
  TechDiagnosticInputDto,
  TicketPublicDto,
  TicketTransitionInputDto,
} from '../tickets/dto/tickets.dto';

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

  // --- Accès technicien restreint via QR tech (sans login) ---
  //
  // Le token tech (`kind:'tech'`) est une **capacité** liée à UN ticket (`tid`
  // signé dans le JWT) : il autorise uniquement la consultation de la fiche, la
  // modification du diagnostic et le changement de statut de CE ticket, rien
  // d'autre. Le `tid` provient TOUJOURS du token signé, jamais de l'URL/body —
  // impossible donc de viser un autre ticket. `pcPassword` est conservé (utile
  // au technicien) ; les tokens internes ne figurent pas dans `TicketPublic`.

  @Public()
  @UseGuards(PublicTokenGuard)
  @Get('tech/:token')
  async getTechTicket(
    @Param('token') _token: string,
    @Req() req: FastifyRequest,
  ): Promise<TicketPublicDto> {
    const claims = getQrTokenClaims(req, 'tech');
    return this.tickets.findById(claims.tid);
  }

  @Public()
  @UseGuards(PublicTokenGuard)
  @Patch('tech/:token/diagnostic')
  async updateTechDiagnostic(
    @Param('token') _token: string,
    @Body() body: TechDiagnosticInputDto,
    @Req() req: FastifyRequest,
  ): Promise<TicketPublicDto> {
    const claims = getQrTokenClaims(req, 'tech');
    // Seul le diagnostic est transmis à `update` → aucun autre champ modifiable.
    return this.tickets.update(
      claims.tid,
      { diagnosticHtml: body.diagnosticHtml },
      {},
    );
  }

  @Public()
  @UseGuards(PublicTokenGuard)
  @Post('tech/:token/transition')
  async transitionTechTicket(
    @Param('token') _token: string,
    @Body() body: TicketTransitionInputDto,
    @Req() req: FastifyRequest,
  ): Promise<TicketPublicDto> {
    const claims = getQrTokenClaims(req, 'tech');
    // Rôle Technician : autorise toutes les transitions d'un technicien (state-machine).
    return this.tickets.transition(claims.tid, body, { role: Role.Technician });
  }

  @Public()
  @UseGuards(PublicTokenGuard)
  @Post('tech/:token/diag-images')
  async addTechDiagImage(
    @Param('token') _token: string,
    @Req() req: FastifyRequest,
  ): Promise<{ filename: string }> {
    const claims = getQrTokenClaims(req, 'tech');
    const file = await readUploadedFile(req);
    return this.tickets.addDiagImage(claims.tid, file);
  }
}

/**
 * Clés sensibles susceptibles d'apparaître dans les payloads d'events
 * `ticket.updated` (diff `{ from, to }`) — à ne JAMAIS exposer au client final.
 * En tête : `pcPassword` (le mot de passe PC en clair).
 */
const SENSITIVE_EVENT_KEYS = new Set([
  'pcPassword',
  'customerName',
  'customerPhone',
  'customerEmail',
  'customerAddress',
]);

/**
 * Pour la vue publique CLIENT on retire les champs sensibles. Le `pcPassword` de
 * premier niveau ne suffit pas : les events `ticket.updated` embarquent les diffs
 * `{ from, to }` des champs modifiés — dont `pcPassword` et les coordonnées client
 * en clair. On masque donc ces clés au sein de CHAQUE payload d'event.
 * (Les tokens internes `publicToken`/`techToken` ne figurent pas dans TicketPublic.)
 */
function scrubForPublic(ticket: TicketPublicDto): TicketPublicDto {
  const { pcPassword: _pcPassword, ...rest } = ticket;
  void _pcPassword;
  const events = (rest.events ?? []).map((e) => {
    if (!e.payload) return e;
    const payload = Object.fromEntries(
      Object.entries(e.payload).filter(([k]) => !SENSITIVE_EVENT_KEYS.has(k)),
    );
    return { ...e, payload };
  });
  return { ...rest, events } as TicketPublicDto;
}
