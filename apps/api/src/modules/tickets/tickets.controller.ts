import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  PayloadTooLargeException,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { IMAGE_PREVIEW_MIME, Role, TICKET_FILE_MAX_BYTES } from '@ifsuv/shared';
import type { MultipartFile } from '@fastify/multipart';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { QrImageService } from '../../infrastructure/tokens/qr-image.service';
import {
  InvalidQrTokenError,
  QrTokenService,
} from '../../infrastructure/tokens/qr-token.service';
import type { UserDocument } from '../users/schemas/user.schema';
import {
  CustomerSuggestQueryDto,
  TicketCreateInputDto,
  TicketListQueryDto,
  TicketListResponseDto,
  TicketFilePublicDto,
  TicketPublicDto,
  TicketStatsResponseDto,
  TechPerfStatsResponseDto,
  TicketTransitionInputDto,
  TicketUpdateInputDto,
} from './dto/tickets.dto';
import type { CustomerSuggestion } from '@ifsuv/shared';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@Controller('tickets')
@Roles(Role.Admin, Role.Technician)
export class TicketsController {
  constructor(
    private readonly tickets: TicketsService,
    private readonly qrImage: QrImageService,
    private readonly qrTokens: QrTokenService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  list(@Query() query: TicketListQueryDto): Promise<TicketListResponseDto> {
    return this.tickets.list(query);
  }

  @Get('stats')
  stats(): Promise<TicketStatsResponseDto> {
    return this.tickets.stats();
  }

  // Performances par technicien — réservé aux admins (override du @Roles classe).
  @Get('performance')
  @Roles(Role.Admin)
  techPerfStats(): Promise<TechPerfStatsResponseDto> {
    return this.tickets.techPerfStats();
  }

  // ⚠ Route statique — doit être déclarée AVANT le handler dynamique `:id`,
  // sinon Nest la résout comme `findOne({ id: 'customers' })`.
  @Get('customers/suggest')
  suggestCustomers(
    @Query() query: CustomerSuggestQueryDto,
  ): Promise<CustomerSuggestion[]> {
    return this.tickets.suggestCustomers(query.q, query.limit);
  }

  @Post()
  create(
    @Body() body: TicketCreateInputDto,
    @CurrentUser() user: UserDocument,
  ): Promise<TicketPublicDto> {
    return this.tickets.create(body, {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<TicketPublicDto> {
    return this.tickets.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: TicketUpdateInputDto,
    @CurrentUser() user: UserDocument,
  ): Promise<TicketPublicDto> {
    return this.tickets.update(id, body, { id: user._id });
  }

  @Post(':id/transition')
  transition(
    @Param('id') id: string,
    @Body() body: TicketTransitionInputDto,
    @CurrentUser() user: UserDocument,
  ): Promise<TicketPublicDto> {
    return this.tickets.transition(id, body, { id: user._id, role: user.role });
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.Admin)
  async remove(@Param('id') id: string): Promise<void> {
    await this.tickets.delete(id);
  }

  @Get('resolve-tech-token/:token')
  resolveTechToken(@Param('token') token: string): { ticketId: string } {
    try {
      const claims = this.qrTokens.verify(token);
      if (claims.kind !== 'tech') {
        throw new BadRequestException('Token de type incorrect');
      }
      return { ticketId: claims.tid };
    } catch (err) {
      if (err instanceof InvalidQrTokenError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  @Get(':id/qr/client')
  async qrClient(
    @Param('id') id: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const ticket = await this.tickets.ensureTokens(id);
    const appUrl = this.config.getOrThrow<string>('APP_URL').replace(/\/$/, '');
    const url = `${appUrl}/p/t/${ticket.publicToken}`;
    const png = await this.qrImage.toPngBuffer(url);
    reply.header('Content-Type', 'image/png');
    reply.header('Cache-Control', 'private, max-age=300');
    void reply.send(png);
  }

  @Get(':id/qr/tech')
  async qrTech(
    @Param('id') id: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const ticket = await this.tickets.ensureTokens(id);
    const appUrl = this.config.getOrThrow<string>('APP_URL').replace(/\/$/, '');
    const url = `${appUrl}/t/t/${ticket.techToken}`;
    const png = await this.qrImage.toPngBuffer(url);
    reply.header('Content-Type', 'image/png');
    reply.header('Cache-Control', 'private, max-age=300');
    void reply.send(png);
  }

  @Post(':id/files')
  async addFile(
    @Param('id') id: string,
    @Req() req: FastifyRequest,
    @CurrentUser() user: UserDocument,
  ): Promise<TicketFilePublicDto> {
    const file = await this.readUploadedFile(req);
    return this.tickets.addFile(id, file, { id: user._id });
  }

  @Get(':id/files/:fileId')
  async getFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const { stream, mimeType, name } = await this.tickets.getFileStream(id, fileId);
    // Images affichables → inline (miniature) ; tout le reste → téléchargement forcé
    // (+ nosniff) pour éviter qu'un fichier malveillant soit rendu par le navigateur.
    const inline = (IMAGE_PREVIEW_MIME as readonly string[]).includes(mimeType);
    reply.header('Content-Type', mimeType);
    reply.header('Cache-Control', 'private, max-age=300');
    reply.header('X-Content-Type-Options', 'nosniff');
    // Fallback ASCII entre guillemets + filename* RFC 5987 pour les noms Unicode.
    const asciiName = name.replace(/[\r\n"\\]/g, '_');
    reply.header(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    );
    void reply.send(stream);
  }

  @Delete(':id/files/:fileId')
  @HttpCode(204)
  async deleteFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: UserDocument,
  ): Promise<void> {
    await this.tickets.deleteFile(id, fileId, { id: user._id });
  }

  // --- Images inline du diagnostic (TipTap) ---

  @Post(':id/diag-images')
  async addDiagImage(
    @Param('id') id: string,
    @Req() req: FastifyRequest,
  ): Promise<{ filename: string }> {
    const file = await this.readUploadedFile(req);
    return this.tickets.addDiagImage(id, file);
  }

  // Public : le diagnostic (et ses images) est affiché sur la page client.
  @Public()
  @Get(':id/diag-images/:filename')
  async getDiagImage(
    @Param('id') id: string,
    @Param('filename') filename: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const { stream, contentType } = await this.tickets.getDiagImageStream(id, filename);
    reply.header('Content-Type', contentType);
    reply.header('Cache-Control', 'public, max-age=86400');
    void reply.send(stream);
  }

  /** Lit un fichier depuis une requête multipart (partagé upload fichier/diag). */
  private async readUploadedFile(
    req: FastifyRequest,
  ): Promise<{ buffer: Buffer; mimeType: string; name: string; size: number }> {
    let file: MultipartFile | undefined;
    try {
      file = await req.file();
    } catch {
      throw new BadRequestException('Requête multipart attendue');
    }
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    let buffer: Buffer;
    try {
      buffer = await file.toBuffer();
    } catch {
      throw new PayloadTooLargeException(
        `Fichier trop volumineux (max ${Math.round(TICKET_FILE_MAX_BYTES / (1024 * 1024))} Mo)`,
      );
    }
    return {
      buffer,
      mimeType: file.mimetype,
      name: file.filename || 'fichier',
      size: buffer.length,
    };
  }
}
