import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { TICKET_FILE_MAX_BYTES } from '@ifsuv/shared';
import type { MultipartFile } from '@fastify/multipart';
import type { FastifyRequest } from 'fastify';

/**
 * Lit un fichier depuis une requête multipart (upload fichier joint / image de
 * diagnostic). Partagé entre le controller tickets (authentifié) et le controller
 * public (accès technicien via QR).
 */
export async function readUploadedFile(
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
