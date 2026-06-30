import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  Role,
  TicketStatus,
  TICKET_FILE_MAX_BYTES,
  TICKET_FILE_MAX_COUNT,
  TICKET_PHOTO_MIME_TYPES,
  type CustomerSuggestion,
  type TicketCreateInput,
  type TicketListItem,
  type TicketListQuery,
  type TicketListResponse,
  type TicketFilePublic,
  type TicketPublic,
  type TicketStatsResponse,
  type TicketTransitionInput,
  type TicketUpdateInput,
} from '@ifsuv/shared';
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { Model, Types } from 'mongoose';
import { CountersService } from '../../infrastructure/counters/counters.service';
import { HtmlSanitizerService } from '../../infrastructure/html-sanitizer/html-sanitizer.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { QrTokenService } from '../../infrastructure/tokens/qr-token.service';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Ticket, TicketDocument } from './schemas/ticket.schema';
import { canTransition } from './tickets.state-machine';

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel(Ticket.name) private readonly tickets: Model<TicketDocument>,
    @InjectModel(Company.name) private readonly companies: Model<CompanyDocument>,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    private readonly counters: CountersService,
    private readonly sanitizer: HtmlSanitizerService,
    private readonly qrTokens: QrTokenService,
    private readonly storage: StorageService,
  ) {}

  async create(
    input: TicketCreateInput,
    actor: { id: Types.ObjectId; firstName: string; lastName: string },
  ): Promise<TicketPublic> {
    // companyId désormais optionnel — on ne contrôle que si la valeur est fournie.
    if (input.companyId) {
      const company = await this.companies.findById(input.companyId);
      if (!company) {
        throw new BadRequestException('Entreprise introuvable');
      }
    }

    if (input.assignedTechId) {
      const tech = await this.users.findById(input.assignedTechId);
      if (!tech) {
        throw new BadRequestException('Technicien introuvable');
      }
    }

    const ref = await this.counters.nextTicketRef();
    const created = await this.tickets.create({
      ref,
      companyId: input.companyId ? new Types.ObjectId(input.companyId) : undefined,
      assignedTechId: input.assignedTechId
        ? new Types.ObjectId(input.assignedTechId)
        : undefined,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      customerAddress: input.customerAddress,
      pcPassword: input.pcPassword,
      location: input.location,
      problemType: input.problemType,
      priority: input.priority ?? 'NORMAL',
      meta: input.meta ?? {},
      customFieldsData: input.customFieldsData ?? {},
      status: TicketStatus.New,
      diagnosticHtml: '',
      events: [
        {
          actorUserId: actor.id,
          type: 'ticket.created',
          payload: { ref },
          at: new Date(),
        },
      ],
    });

    // Génère et persiste les 2 tokens QR (public + tech) pour ce ticket
    created.publicToken = this.qrTokens.sign({ tid: created._id.toString(), kind: 'public' });
    created.techToken = this.qrTokens.sign({ tid: created._id.toString(), kind: 'tech' });
    await created.save();

    return this.toPublic(created);
  }

  /**
   * Auto-heal : si un ticket existe sans publicToken/techToken (cas des seeds
   * antérieurs à 3.C ou ETL legacy), on les génère à la volée et on persiste.
   */
  async ensureTokens(ticketId: string): Promise<TicketDocument> {
    const ticket = await this.tickets.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket introuvable');
    }
    let dirty = false;
    if (!ticket.publicToken) {
      ticket.publicToken = this.qrTokens.sign({
        tid: ticket._id.toString(),
        kind: 'public',
      });
      dirty = true;
    }
    if (!ticket.techToken) {
      ticket.techToken = this.qrTokens.sign({
        tid: ticket._id.toString(),
        kind: 'tech',
      });
      dirty = true;
    }
    if (dirty) await ticket.save();
    return ticket;
  }

  async findByPublicToken(ticketId: string): Promise<TicketPublic> {
    const ticket = await this.tickets.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket introuvable');
    }
    return this.toPublic(ticket);
  }

  async findById(id: string): Promise<TicketPublic> {
    const ticket = await this.tickets.findById(id);
    if (!ticket) {
      throw new NotFoundException('Ticket introuvable');
    }
    return this.toPublic(ticket);
  }

  async delete(id: string): Promise<void> {
    const result = await this.tickets.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      throw new NotFoundException('Ticket introuvable');
    }
  }

  async update(
    id: string,
    input: TicketUpdateInput,
    actor: { id: Types.ObjectId },
  ): Promise<TicketPublic> {
    const ticket = await this.tickets.findById(id);
    if (!ticket) {
      throw new NotFoundException('Ticket introuvable');
    }

    if (input.assignedTechId !== undefined) {
      if (input.assignedTechId) {
        const tech = await this.users.findById(input.assignedTechId);
        if (!tech) {
          throw new BadRequestException('Technicien introuvable');
        }
        ticket.assignedTechId = new Types.ObjectId(input.assignedTechId);
      } else {
        ticket.assignedTechId = undefined;
      }
    }

    if (input.companyId !== undefined) {
      // companyId optionnel : '' ou null/undefined explicite retire l'entreprise
      if (input.companyId) {
        const company = await this.companies.findById(input.companyId);
        if (!company) {
          throw new BadRequestException('Entreprise introuvable');
        }
        ticket.companyId = new Types.ObjectId(input.companyId);
      } else {
        ticket.companyId = undefined;
      }
    }

    if (input.priority !== undefined) {
      ticket.priority = input.priority;
    }

    if (input.meta !== undefined) {
      ticket.meta = {
        isLaptop: input.meta.isLaptop ?? false,
        hasBag: input.meta.hasBag ?? false,
        hasCharger: input.meta.hasCharger ?? false,
        hasMouse: input.meta.hasMouse ?? false,
        hasKeyboard: input.meta.hasKeyboard ?? false,
        otherMaterial: input.meta.otherMaterial,
      };
    }

    if (input.customFieldsData !== undefined) {
      // Merge plutôt que remplacement, pour ne pas écraser des clés non envoyées
      // par le formulaire (au cas où un partial update est fait).
      ticket.customFieldsData = {
        ...(ticket.customFieldsData ?? {}),
        ...input.customFieldsData,
      };
      ticket.markModified('customFieldsData');
    }

    const trackedFields = [
      'customerName',
      'customerPhone',
      'customerEmail',
      'customerAddress',
      'pcPassword',
      'location',
      'problemType',
      'diagnosticHtml',
    ] as const;
    const changed: Record<string, { from?: unknown; to: unknown }> = {};
    for (const field of trackedFields) {
      let value = input[field];
      if (value !== undefined) {
        if (field === 'diagnosticHtml' && typeof value === 'string') {
          value = this.sanitizer.sanitizeTiptap(value);
        }
        const before = (ticket as unknown as Record<string, unknown>)[field];
        if (before !== value) {
          // Pour diagnosticHtml : snapshot du nouveau contenu uniquement (pas le from
          // pour éviter de doubler le stockage, on a déjà l'historique via la timeline).
          if (field === 'diagnosticHtml') {
            changed[field] = { to: value };
          } else {
            changed[field] = { from: before, to: value };
          }
        }
        (ticket as unknown as Record<string, unknown>)[field] = value;
      }
    }

    if (Object.keys(changed).length > 0) {
      ticket.events.push({
        actorUserId: actor.id,
        type: 'ticket.updated',
        payload: changed,
        at: new Date(),
      } as never);
    }

    // Auto-passage NEW → IN_PROGRESS à la première saisie d'un diagnostic non vide,
    // tant que le statut n'a pas été changé manuellement (toujours NEW). L'endpoint
    // update étant réservé Admin/Technicien, la transition est toujours autorisée.
    if (ticket.status === TicketStatus.New && changed['diagnosticHtml'] !== undefined) {
      const html = ticket.diagnosticHtml ?? '';
      const hasContent =
        html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim() !== '' ||
        /<img\b/i.test(html);
      if (hasContent) {
        ticket.events.push({
          actorUserId: actor.id,
          type: 'ticket.transition',
          payload: {
            from: TicketStatus.New,
            to: TicketStatus.InProgress,
            comment: 'Passage automatique à la première saisie du diagnostic',
            auto: true,
          },
          at: new Date(),
        } as never);
        ticket.status = TicketStatus.InProgress;
      }
    }

    const saved = await ticket.save();
    return this.toPublic(saved);
  }

  async transition(
    id: string,
    input: TicketTransitionInput,
    actor: { id: Types.ObjectId; role: Role },
  ): Promise<TicketPublic> {
    const ticket = await this.tickets.findById(id);
    if (!ticket) {
      throw new NotFoundException('Ticket introuvable');
    }

    const check = canTransition(ticket.status, input.to, actor.role);
    if (!check.ok) {
      if (check.reason === 'forbidden_role') {
        throw new ForbiddenException(check.message);
      }
      throw new BadRequestException(check.message);
    }

    const fromStatus = ticket.status;
    ticket.status = input.to;
    if (input.to === TicketStatus.Closed) {
      ticket.closedAt = new Date();
    } else if (fromStatus === TicketStatus.Closed) {
      ticket.closedAt = undefined;
    }

    ticket.events.push({
      actorUserId: actor.id,
      type: 'ticket.transition',
      payload: {
        from: fromStatus,
        to: input.to,
        comment: input.comment,
      },
      at: new Date(),
    } as never);

    const saved = await ticket.save();
    return this.toPublic(saved);
  }

  // list() projette diagnosticHtml afin que la dashboard puisse afficher un
  // résumé du diagnostic dans chaque TicketCard. Filtrage par défaut sur les
  // tickets actifs (non-CLOSED) — voir logique `mode` plus bas.
  async list(query: TicketListQuery): Promise<TicketListResponse> {
    const filter: Record<string, unknown> = {};
    if (query.status) {
      // Filtre status explicite — prioritaire sur `mode`.
      filter['status'] = query.status;
    } else if (query.mode === 'archived') {
      filter['status'] = TicketStatus.Closed;
    } else if (query.mode === 'all') {
      // Pas de filtre status — on voit tous les statuts.
    } else {
      // Défaut implicite : `active` → exclut les tickets clos.
      filter['status'] = { $ne: TicketStatus.Closed };
    }
    if (query.priority) filter['priority'] = query.priority;
    if (query.techId) filter['assignedTechId'] = new Types.ObjectId(query.techId);
    if (query.companyId) filter['companyId'] = new Types.ObjectId(query.companyId);
    if (query.q) {
      const regex = new RegExp(escapeRegex(query.q), 'i');
      filter['$or'] = [
        { ref: regex },
        { customerName: regex },
        { problemType: regex },
      ];
    }

    const skip = (query.page - 1) * query.pageSize;
    const [tickets, total] = await Promise.all([
      this.tickets
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.pageSize),
      this.tickets.countDocuments(filter),
    ]);

    // Hydrate companies + techs en batch (évite N+1)
    const companyIds = uniqueIds(
      tickets.map((t) => t.companyId).filter((x): x is Types.ObjectId => !!x),
    );
    const techIds = uniqueIds(
      tickets.map((t) => t.assignedTechId).filter((x): x is Types.ObjectId => !!x),
    );

    const [companiesById, techsById] = await Promise.all([
      this.companies.find({ _id: { $in: companyIds } }).then(byId),
      this.users.find({ _id: { $in: techIds } }).then(byId),
    ]);

    const items: TicketListItem[] = tickets.map((t) => {
      const companyIdStr = t.companyId?.toString();
      const company = companyIdStr ? companiesById.get(companyIdStr) : undefined;
      return {
        id: t._id.toString(),
        ref: t.ref,
        status: t.status,
        priority: t.priority ?? 'NORMAL',
        companyId: companyIdStr,
        company: company
          ? { id: company._id.toString(), name: company.name, kind: company.kind }
          : undefined,
        assignedTechId: t.assignedTechId?.toString(),
        assignedTech: t.assignedTechId
          ? techsById.get(t.assignedTechId.toString())
            ? {
                id: t.assignedTechId.toString(),
                firstName: techsById.get(t.assignedTechId.toString())!.firstName,
                lastName: techsById.get(t.assignedTechId.toString())!.lastName,
                email: techsById.get(t.assignedTechId.toString())!.email,
              }
            : undefined
          : undefined,
        customerName: t.customerName,
        customerPhone: t.customerPhone,
        customerEmail: t.customerEmail,
        customerAddress: t.customerAddress,
        pcPassword: t.pcPassword,
        location: t.location,
        problemType: t.problemType,
        customFieldsData: t.customFieldsData as
          | Record<string, string | boolean | number>
          | undefined,
        diagnosticHtml: t.diagnosticHtml,
        createdAt: (t as unknown as { createdAt?: Date }).createdAt?.toISOString(),
        updatedAt: (t as unknown as { updatedAt?: Date }).updatedAt?.toISOString(),
        closedAt: t.closedAt?.toISOString(),
      };
    });

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async stats(): Promise<TicketStatsResponse> {
    const counts = await this.tickets.aggregate<{ _id: TicketStatus; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const byStatus: TicketStatsResponse['byStatus'] = {
      NEW: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };
    let total = 0;
    for (const row of counts) {
      byStatus[row._id] = row.count;
      total += row.count;
    }
    return { byStatus, total };
  }

  /**
   * Suggère des clients à partir d'un préfixe sur `customerName`.
   * Renvoie au plus `limit` entrées uniques (déduplication par nom), avec
   * le téléphone et l'adresse du **dernier ticket** où ce client apparaît.
   */
  async suggestCustomers(
    q: string,
    limit: number,
  ): Promise<CustomerSuggestion[]> {
    const safe = escapeRegex(q);
    const rows = await this.tickets.aggregate<{
      _id: string;
      phone?: string;
      email?: string;
      address?: string;
    }>([
      {
        $match: {
          customerName: { $regex: `^${safe}`, $options: 'i' },
        },
      },
      { $sort: { updatedAt: -1 } },
      {
        $group: {
          _id: '$customerName',
          phone: { $first: '$customerPhone' },
          email: { $first: '$customerEmail' },
          address: { $first: '$customerAddress' },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: limit },
    ]);
    return rows.map((r) => ({
      name: r._id,
      phone: r.phone,
      email: r.email,
      address: r.address,
    }));
  }

  /** Attache un fichier (image ou document) : stocke le binaire puis l'enregistre sur le ticket. */
  async addFile(
    ticketId: string,
    file: { buffer: Buffer; mimeType: string; name: string; size: number },
    actor: { id: Types.ObjectId },
  ): Promise<TicketFilePublic> {
    const ticket = await this.tickets.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket introuvable');
    }
    if (file.size > TICKET_FILE_MAX_BYTES) {
      throw new BadRequestException(
        `Fichier trop volumineux (max ${Math.round(TICKET_FILE_MAX_BYTES / (1024 * 1024))} Mo)`,
      );
    }
    if (ticket.files.length >= TICKET_FILE_MAX_COUNT) {
      throw new BadRequestException(`Maximum ${TICKET_FILE_MAX_COUNT} fichiers par ticket`);
    }

    const ext = extFromName(file.name) ?? EXT_BY_MIME[file.mimeType] ?? 'bin';
    const key = `tickets/${ticket._id.toString()}/files/${randomUUID()}.${ext}`;
    await this.storage.putObject(key, file.buffer);

    ticket.files.push({
      key,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      uploadedAt: new Date(),
      uploadedBy: actor.id,
    } as never);
    ticket.events.push({
      actorUserId: actor.id,
      type: 'ticket.file_added',
      payload: { name: file.name },
      at: new Date(),
    } as never);
    const saved = await ticket.save();

    const created = saved.files[saved.files.length - 1] as unknown as {
      _id: Types.ObjectId;
      name: string;
      mimeType: string;
      size: number;
      uploadedAt: Date;
    };
    return {
      id: created._id.toString(),
      name: created.name,
      mimeType: created.mimeType,
      size: created.size,
      uploadedAt: created.uploadedAt.toISOString(),
    };
  }

  /** Résout un fichier joint et renvoie son flux + métadonnées (pour le download). */
  async getFileStream(
    ticketId: string,
    fileId: string,
  ): Promise<{ stream: Readable; mimeType: string; name: string }> {
    const ticket = await this.tickets.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket introuvable');
    }
    const found = ticket.files.find(
      (f) => (f as unknown as { _id: Types.ObjectId })._id.toString() === fileId,
    );
    if (!found) {
      throw new NotFoundException('Fichier introuvable');
    }
    const f = found as unknown as { key: string; mimeType: string; name: string };
    const stream = await this.storage.getObjectStream(f.key);
    return { stream, mimeType: f.mimeType, name: f.name };
  }

  /** Supprime un fichier joint du storage et du ticket. */
  async deleteFile(
    ticketId: string,
    fileId: string,
    actor: { id: Types.ObjectId },
  ): Promise<void> {
    const ticket = await this.tickets.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket introuvable');
    }
    const found = ticket.files.find(
      (f) => (f as unknown as { _id: Types.ObjectId })._id.toString() === fileId,
    );
    if (!found) {
      throw new NotFoundException('Fichier introuvable');
    }
    const f = found as unknown as { key: string; name: string };
    await this.storage.deleteObject(f.key);

    (ticket.files as unknown as { pull(id: string): void }).pull(fileId);
    ticket.events.push({
      actorUserId: actor.id,
      type: 'ticket.file_removed',
      payload: { name: f.name },
      at: new Date(),
    } as never);
    await ticket.save();
  }

  /**
   * Image inline insérée dans le diagnostic (TipTap). Stockée à part des photos
   * de la galerie (`tickets/<id>/diag/<uuid>.<ext>`) et servie publiquement, car
   * le diagnostic est visible sur la page client. Renvoie le nom de fichier (=
   * identifiant), le front construit l'URL.
   */
  async addDiagImage(
    ticketId: string,
    file: { buffer: Buffer; mimeType: string },
  ): Promise<{ filename: string }> {
    const ticket = await this.tickets.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket introuvable');
    }
    if (!(TICKET_PHOTO_MIME_TYPES as readonly string[]).includes(file.mimeType)) {
      throw new BadRequestException('Type de fichier non supporté (jpeg, png, webp)');
    }
    const ext = EXT_BY_MIME[file.mimeType] ?? 'bin';
    const filename = `${randomUUID()}.${ext}`;
    const key = `tickets/${ticket._id.toString()}/diag/${filename}`;
    await this.storage.putObject(key, file.buffer);
    return { filename };
  }

  /** Stream d'une image inline du diagnostic (route publique). */
  async getDiagImageStream(
    ticketId: string,
    filename: string,
  ): Promise<{ stream: Readable; contentType: string }> {
    if (!/^[a-zA-Z0-9._-]+$/.test(filename) || filename.includes('..')) {
      throw new BadRequestException('Nom de fichier invalide');
    }
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const contentType = CONTENT_TYPE_BY_EXT[ext];
    if (!contentType) {
      throw new BadRequestException('Extension non supportée');
    }
    const stream = await this.storage.getObjectStream(
      `tickets/${ticketId}/diag/${filename}`,
    );
    return { stream, contentType };
  }

  private async toPublic(ticket: TicketDocument): Promise<TicketPublic> {
    const company = ticket.companyId
      ? await this.companies.findById(ticket.companyId)
      : null;
    const tech = ticket.assignedTechId
      ? await this.users.findById(ticket.assignedTechId)
      : null;

    const eventActorIds = uniqueIds(
      ticket.events.map((e) => (e as unknown as { actorUserId: Types.ObjectId }).actorUserId),
    );
    const eventActors = await this.users.find({ _id: { $in: eventActorIds } });
    const actorsById = byId(eventActors);

    return {
      id: ticket._id.toString(),
      ref: ticket.ref,
      status: ticket.status,
      companyId: ticket.companyId?.toString(),
      company: company
        ? { id: company._id.toString(), name: company.name, kind: company.kind }
        : undefined,
      assignedTechId: ticket.assignedTechId?.toString(),
      assignedTech: tech
        ? {
            id: tech._id.toString(),
            firstName: tech.firstName,
            lastName: tech.lastName,
            email: tech.email,
          }
        : undefined,
      customerName: ticket.customerName,
      customerPhone: ticket.customerPhone,
      customerEmail: ticket.customerEmail,
      customerAddress: ticket.customerAddress,
      pcPassword: ticket.pcPassword,
      location: ticket.location,
      problemType: ticket.problemType,
      priority: ticket.priority ?? 'NORMAL',
      meta: ticket.meta
        ? {
            isLaptop: ticket.meta.isLaptop ?? false,
            hasBag: ticket.meta.hasBag ?? false,
            hasCharger: ticket.meta.hasCharger ?? false,
            hasMouse: ticket.meta.hasMouse ?? false,
            hasKeyboard: ticket.meta.hasKeyboard ?? false,
            otherMaterial: ticket.meta.otherMaterial,
          }
        : undefined,
      customFieldsData: ticket.customFieldsData as
        | Record<string, string | boolean | number>
        | undefined,
      diagnosticHtml: ticket.diagnosticHtml,
      events: ticket.events.map((event) => {
        const e = event as unknown as {
          _id: Types.ObjectId;
          actorUserId: Types.ObjectId;
          type: string;
          payload?: Record<string, unknown>;
          at: Date;
        };
        const actor = actorsById.get(e.actorUserId.toString());
        return {
          id: e._id.toString(),
          actorUserId: e.actorUserId.toString(),
          actorName: actor ? `${actor.firstName} ${actor.lastName}` : undefined,
          type: e.type,
          payload: e.payload,
          at: e.at.toISOString(),
        };
      }),
      files: ticket.files.map((file) => {
        const f = file as unknown as {
          _id: Types.ObjectId;
          name: string;
          mimeType: string;
          size: number;
          uploadedAt: Date;
        };
        return {
          id: f._id.toString(),
          name: f.name,
          mimeType: f.mimeType,
          size: f.size,
          uploadedAt: f.uploadedAt.toISOString(),
        };
      }),
      createdAt: (ticket as unknown as { createdAt?: Date }).createdAt?.toISOString(),
      updatedAt: (ticket as unknown as { updatedAt?: Date }).updatedAt?.toISOString(),
      closedAt: ticket.closedAt?.toISOString(),
    };
  }
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** Extension (sûre, ≤ 8 alphanum) extraite d'un nom de fichier, sinon undefined. */
function extFromName(name: string): string | undefined {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return undefined;
  const ext = name.slice(dot + 1).toLowerCase();
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : undefined;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function uniqueIds(ids: Types.ObjectId[]): Types.ObjectId[] {
  const seen = new Set<string>();
  const out: Types.ObjectId[] = [];
  for (const id of ids) {
    const key = id.toString();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(id);
    }
  }
  return out;
}

function byId<T extends { _id: Types.ObjectId }>(docs: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const d of docs) {
    map.set(d._id.toString(), d);
  }
  return map;
}
