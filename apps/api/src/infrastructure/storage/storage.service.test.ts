import { NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StorageService } from './storage.service';

function makeConfig(dir: string): ConfigService {
  return {
    getOrThrow: () => dir,
    get: (_k: string, d?: unknown) => d,
  } as unknown as ConfigService;
}

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer));
  return Buffer.concat(chunks).toString('utf8');
}

describe('StorageService (filesystem)', () => {
  let dir: string;
  let service: StorageService;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ifsuv-storage-'));
    service = new StorageService(makeConfig(dir));
    await service.onApplicationBootstrap();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('putObject écrit le fichier sous la clé (dossiers parents créés)', async () => {
    await service.putObject('tickets/abc/x.png', Buffer.from('hello'));
    expect(await readFile(join(dir, 'tickets', 'abc', 'x.png'), 'utf8')).toBe('hello');
  });

  it('getObjectStream relit le contenu écrit', async () => {
    await service.putObject('tickets/abc/x.png', Buffer.from('world'));
    const stream = await service.getObjectStream('tickets/abc/x.png');
    expect(await streamToString(stream)).toBe('world');
  });

  it('getObjectStream sur clé absente → NotFound', async () => {
    await expect(service.getObjectStream('tickets/none/missing.png')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deleteObject supprime le fichier et reste idempotent', async () => {
    await service.putObject('tickets/abc/x.png', Buffer.from('z'));
    await service.deleteObject('tickets/abc/x.png');
    await expect(service.getObjectStream('tickets/abc/x.png')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.deleteObject('tickets/abc/x.png')).resolves.toBeUndefined();
  });

  it('rejette une clé en path traversal', async () => {
    await expect(service.putObject('../escape.txt', Buffer.from('x'))).rejects.toThrow();
  });
});
