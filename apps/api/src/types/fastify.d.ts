import type { Types } from 'mongoose';
import type { UserDocument } from '../modules/users/schemas/user.schema';

declare module 'fastify' {
  interface FastifyRequest {
    user?: UserDocument;
    session?: { id: Types.ObjectId };
    cookies: Record<string, string | undefined>;
  }
  interface FastifyReply {
    setCookie(
      name: string,
      value: string,
      options?: {
        httpOnly?: boolean;
        sameSite?: 'lax' | 'strict' | 'none';
        secure?: boolean;
        path?: string;
        expires?: Date;
        maxAge?: number;
      },
    ): FastifyReply;
    clearCookie(
      name: string,
      options?: { path?: string; domain?: string },
    ): FastifyReply;
  }
}
