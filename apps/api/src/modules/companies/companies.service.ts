import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
  CompanyCreateInput,
  CompanyListQuery,
  CompanyListResponse,
  CompanyPublic,
  CompanyUpdateInput,
} from '@ifsuv/shared';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from './schemas/company.schema';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company.name) private readonly companies: Model<CompanyDocument>,
  ) {}

  async create(input: CompanyCreateInput): Promise<CompanyPublic> {
    const created = await this.companies.create({
      kind: input.kind,
      name: input.name,
      address: input.address,
      postalCode: input.postalCode,
      city: input.city,
      email: input.email,
      phone: input.phone,
      website: input.website,
      charges: input.charges,
    });
    return toPublic(created);
  }

  async findById(id: string): Promise<CompanyPublic> {
    const company = await this.companies.findById(id);
    if (!company) {
      throw new NotFoundException('Entreprise introuvable');
    }
    return toPublic(company);
  }

  async update(id: string, input: CompanyUpdateInput): Promise<CompanyPublic> {
    const updated = await this.companies.findOneAndUpdate(
      { _id: id },
      { $set: input },
      { new: true },
    );
    if (!updated) {
      throw new NotFoundException('Entreprise introuvable');
    }
    return toPublic(updated);
  }

  async softDelete(id: string): Promise<void> {
    // Pas de champ deletedAt sur Company pour l'instant — on fait un hard delete.
    // Si on veut soft delete plus tard, ajouter `deletedAt` au schéma.
    const result = await this.companies.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      throw new NotFoundException('Entreprise introuvable');
    }
  }

  async list(query: CompanyListQuery): Promise<CompanyListResponse> {
    const filter: Record<string, unknown> = {};
    if (query.kind) {
      filter['kind'] = query.kind;
    }
    if (query.q) {
      const regex = new RegExp(escapeRegex(query.q), 'i');
      filter['$or'] = [
        { name: regex },
        { city: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.companies
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.pageSize),
      this.companies.countDocuments(filter),
    ]);

    return {
      items: items.map(toPublic),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}

function toPublic(company: CompanyDocument): CompanyPublic {
  return {
    id: company._id.toString(),
    kind: company.kind,
    name: company.name,
    logoKey: company.logoKey ?? null,
    address: company.address,
    postalCode: company.postalCode,
    city: company.city,
    email: company.email,
    phone: company.phone,
    website: company.website,
    charges: company.charges,
    createdAt: (company as unknown as { createdAt?: Date }).createdAt?.toISOString(),
    updatedAt: (company as unknown as { updatedAt?: Date }).updatedAt?.toISOString(),
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
