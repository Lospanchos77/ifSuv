import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { SiteSettings as SiteSettingsDto, SiteSettingsUpdateInput } from '@ifsuv/shared';
import { Model } from 'mongoose';
import { SiteSettings, SiteSettingsDocument } from './schemas/site-settings.schema';

const DEFAULT_NAME = 'IFSUV';
const DEFAULT_HEADER_PADDING_Y = 8 as const;

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(SiteSettings.name)
    private readonly model: Model<SiteSettingsDocument>,
  ) {}

  /**
   * Renvoie le doc settings unique, le crée si absent (upsert).
   */
  async get(): Promise<SiteSettingsDto> {
    const doc = await this.model.findOneAndUpdate(
      {},
      { $setOnInsert: { siteName: DEFAULT_NAME } },
      { upsert: true, new: true },
    );
    return toDto(doc);
  }

  async update(input: SiteSettingsUpdateInput): Promise<SiteSettingsDto> {
    // 1) Assure que le doc singleton existe (sans toucher aux valeurs si déjà là).
    //    On ne peut PAS combiner $set et $setOnInsert sur le même path (conflit MongoDB).
    await this.model.updateOne(
      {},
      { $setOnInsert: { siteName: DEFAULT_NAME } },
      { upsert: true },
    );
    // 2) Applique le patch
    const doc = await this.model.findOneAndUpdate({}, { $set: input }, { new: true });
    if (!doc) {
      return this.get();
    }
    return toDto(doc);
  }
}

function toDto(doc: SiteSettingsDocument): SiteSettingsDto {
  return {
    siteName: doc.siteName,
    siteTagline: doc.siteTagline,
    logoDataUrl: doc.logoDataUrl,
    primaryColor: doc.primaryColor as SiteSettingsDto['primaryColor'],
    siteNameColor: doc.siteNameColor,
    showSiteName: doc.showSiteName,
    defaultRadius: doc.defaultRadius as SiteSettingsDto['defaultRadius'],
    fontFamily: doc.fontFamily as SiteSettingsDto['fontFamily'],
    logoHeight: doc.logoHeight,
    headerPaddingY: doc.headerPaddingY ?? DEFAULT_HEADER_PADDING_Y,
    customTicketFields: (doc.customTicketFields ?? []).map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type as 'text' | 'textarea' | 'checkbox' | 'select',
      options: f.options,
      required: f.required,
      widthCols: f.widthCols,
      showOnDashboard: f.showOnDashboard,
    })),
    supportEmail: doc.supportEmail,
    supportPhone: doc.supportPhone,
    companyAddress: doc.companyAddress,
  };
}
