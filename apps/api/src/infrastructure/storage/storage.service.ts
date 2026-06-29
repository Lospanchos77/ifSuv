import {
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'node:fs';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';

/**
 * Stockage de fichiers sur disque local (photos de tickets, futurs PDF/logos).
 * Les fichiers sont écrits sous `STORAGE_DIR/<clé>`, la clé étant du type
 * `tickets/<ticketId>/<uuid>.<ext>`. Pas de dépendance externe (ni S3 ni MinIO) :
 * une app mono-serveur n'a pas besoin de stockage objet.
 */
@Injectable()
export class StorageService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StorageService.name);
  private readonly baseDir: string;

  constructor(config: ConfigService) {
    this.baseDir = resolve(config.getOrThrow<string>('STORAGE_DIR'));
  }

  async onApplicationBootstrap(): Promise<void> {
    await mkdir(this.baseDir, { recursive: true });
    this.logger.log(`stockage fichiers: ${this.baseDir}`);
  }

  async putObject(key: string, body: Buffer): Promise<void> {
    const path = this.filePath(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }

  async getObjectStream(key: string): Promise<Readable> {
    const path = this.filePath(key);
    try {
      await access(path);
    } catch {
      throw new NotFoundException('Fichier introuvable');
    }
    return createReadStream(path);
  }

  async deleteObject(key: string): Promise<void> {
    await rm(this.filePath(key), { force: true });
  }

  /**
   * Résout la clé en chemin absolu sous baseDir, en interdisant toute sortie du
   * répertoire (path traversal). Les clés sont générées côté serveur, mais on
   * garde une ceinture + bretelles.
   */
  private filePath(key: string): string {
    const full = resolve(this.baseDir, key);
    if (full !== this.baseDir && !full.startsWith(this.baseDir + sep)) {
      throw new Error(`clé de stockage invalide (hors du répertoire): ${key}`);
    }
    return full;
  }
}
