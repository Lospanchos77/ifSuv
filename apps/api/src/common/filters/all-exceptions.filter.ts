import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const errorResponse = isHttp ? exception.getResponse() : null;

    const isProd = process.env.NODE_ENV === 'production';
    const message = isHttp
      ? typeof errorResponse === 'string'
        ? errorResponse
        : (errorResponse as { message?: string }).message ?? exception.message
      : 'Internal server error';

    if (!isHttp) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    void response.status(status).send({
      statusCode: status,
      message,
      ...(isHttp && typeof errorResponse === 'object' ? errorResponse : {}),
      ...(isProd ? {} : { path: request.url }),
    });
  }
}
