import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  MONGO_URI: z.string().url().or(z.string().startsWith('mongodb')),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  APP_URL: z.string().url().default('http://localhost:5173'),

  // Sessions / cookies
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_NAME: z.string().default('ifsuv_sid'),
  COOKIE_SECURE: z.coerce.boolean().default(false),

  // Argon2id (OWASP 2024)
  ARGON2_MEMORY_COST: z.coerce.number().int().positive().default(19456),
  ARGON2_TIME_COST: z.coerce.number().int().positive().default(2),

  // QR tokens (HS256, claims tid + kind)
  QR_TOKEN_SECRET: z.string().min(32, 'QR_TOKEN_SECRET doit faire au moins 32 caractères'),
  QR_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  // Mailer
  MAILER_HOST: z.string().default('localhost'),
  MAILER_PORT: z.coerce.number().int().positive().default(1025),
  MAILER_USER: z.string().optional(),
  MAILER_PASS: z.string().optional(),
  MAILER_FROM: z.string().default('IFSUV <no-reply@ifsuv.local>'),
  MAILER_SECURE: z.coerce.boolean().default(false),

  // Stockage des fichiers (photos tickets, futurs PDF) sur disque local.
  // Chemin relatif = résolu depuis le cwd de l'API (apps/api en dev).
  // En prod : pointer vers un volume persistant (ex. /data/storage).
  STORAGE_DIR: z.string().default('./var/storage'),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment variables: ${JSON.stringify(formatted, null, 2)}`);
  }
  return parsed.data;
}
