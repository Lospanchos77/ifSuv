import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { UserDocument } from '../../modules/users/schemas/user.schema';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UserDocument | undefined => {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    return req.user;
  },
);
