import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SyncIndexesService } from './sync-indexes.service';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGO_URI'),
        connectionFactory: (connection) => {
          connection.on('error', (err: Error) => {
             
            console.warn('[mongoose] error:', err.message);
          });
          return connection;
        },
        serverSelectionTimeoutMS: 5000,
      }),
    }),
  ],
  providers: [SyncIndexesService],
  exports: [MongooseModule],
})
export class DatabaseModule {}
