import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash, verify } from '@node-rs/argon2';

@Injectable()
export class PasswordService {
  private readonly memoryCost: number;
  private readonly timeCost: number;

  constructor(config: ConfigService) {
    // Number() obligatoire : ConfigService.get renvoie la valeur brute de
    // process.env (string) pour les clés présentes dans l'env, or @node-rs/argon2
    // (napi) exige un u32 numérique pour memoryCost/timeCost (sinon "Failed to
    // convert napi value String into rust type u32" au hash).
    this.memoryCost = Number(config.get('ARGON2_MEMORY_COST', 19456));
    this.timeCost = Number(config.get('ARGON2_TIME_COST', 2));
  }

  hash(plain: string): Promise<string> {
    // @node-rs/argon2 utilise Argon2id par défaut.
    return hash(plain, {
      memoryCost: this.memoryCost,
      timeCost: this.timeCost,
      parallelism: 1,
    });
  }

  async verify(passwordHash: string, plain: string): Promise<boolean> {
    try {
      return await verify(passwordHash, plain);
    } catch {
      return false;
    }
  }

  generateRandomPassword(length = 16): string {
    return randomBytes(length).toString('base64url').slice(0, length);
  }
}
