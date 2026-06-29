import { Module } from '@nestjs/common';
import { TicketsModule } from '../tickets/tickets.module';
import { PublicController } from './public.controller';

@Module({
  imports: [TicketsModule],
  controllers: [PublicController],
})
export class PublicModule {}
