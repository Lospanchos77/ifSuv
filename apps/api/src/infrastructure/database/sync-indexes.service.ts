import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class SyncIndexesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SyncIndexesService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.get<string>('NODE_ENV') === 'test') {
      return;
    }

    const modelNames = this.connection.modelNames();
    for (const name of modelNames) {
      try {
        await this.connection.model(name).syncIndexes();
        this.logger.log(`syncIndexes ok: ${name}`);
      } catch (err) {
        this.logger.error(
          `syncIndexes failed: ${name}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }
  }
}
