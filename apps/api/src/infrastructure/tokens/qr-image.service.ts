import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

export interface QrImageOptions {
  size?: number; // pixels (largeur/hauteur)
  margin?: number; // modules de marge blanche
}

@Injectable()
export class QrImageService {
  /**
   * Génère un QR code en PNG (Buffer) à partir d'une URL ou d'un texte.
   */
  async toPngBuffer(payload: string, options: QrImageOptions = {}): Promise<Buffer> {
    return QRCode.toBuffer(payload, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: options.margin ?? 2,
      width: options.size ?? 384,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  }
}
