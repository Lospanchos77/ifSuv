import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HealthController } from '../src/modules/health/health.controller';
import { HealthService } from '../src/modules/health/health.service';
import type { Connection } from 'mongoose';

describe('GET /api/v1/health (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: 'DatabaseConnection',
          useValue: { readyState: 1 } as unknown as Connection,
        },
      ],
    })
      .overrideProvider(HealthService)
      .useValue(new HealthService({ readyState: 1 } as unknown as Connection))
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api/v1');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('renvoie 200 avec status=ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { status: string; mongoState: string };
    expect(body.status).toBe('ok');
    expect(body.mongoState).toBe('connected');
  });
});
