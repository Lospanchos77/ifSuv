import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import type { HealthStatus } from '@ifsuv/shared';

const MONGO_STATES: Record<number, HealthStatus['mongoState']> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnected',
  99: 'unknown',
};

@Injectable()
export class HealthService {
  constructor(@InjectConnection() private readonly mongo: Connection) {}

  check(): HealthStatus {
    return {
      status: 'ok',
      uptime: process.uptime(),
      mongoState: MONGO_STATES[this.mongo.readyState] ?? 'unknown',
      version: process.env.npm_package_version ?? '0.0.0',
    };
  }
}
