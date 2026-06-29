import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule } from './config/config.module';
import { RoleGuard } from './common/guards/role.guard';
import { SessionGuard } from './common/guards/session.guard';
import { AuditModule } from './infrastructure/audit/audit.module';
import { CountersModule } from './infrastructure/counters/counters.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { HtmlSanitizerModule } from './infrastructure/html-sanitizer/html-sanitizer.module';
import { MailerModule } from './infrastructure/mailer/mailer.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { TokensModule } from './infrastructure/tokens/tokens.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { HealthModule } from './modules/health/health.module';
import { PublicModule } from './modules/public/public.module';
import { SettingsModule } from './modules/settings/settings.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('LOG_LEVEL', 'info'),
          transport:
            config.get<string>('NODE_ENV') !== 'production'
              ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
              : undefined,
        },
      }),
    }),
    DatabaseModule,
    AuditModule,
    CountersModule,
    HtmlSanitizerModule,
    MailerModule,
    StorageModule,
    TokensModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    TicketsModule,
    SettingsModule,
    PublicModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: RoleGuard },
  ],
})
export class AppModule {}
