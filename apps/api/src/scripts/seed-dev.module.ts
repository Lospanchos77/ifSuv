import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '../config/config.module';
import { CountersModule } from '../infrastructure/counters/counters.module';
import { DatabaseModule } from '../infrastructure/database/database.module';
import { Company, CompanySchema } from '../modules/companies/schemas/company.schema';
import { Ticket, TicketSchema } from '../modules/tickets/schemas/ticket.schema';
import { User, UserSchema } from '../modules/users/schemas/user.schema';
import { PasswordService } from '../modules/auth/services/password.service';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CountersModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Ticket.name, schema: TicketSchema },
    ]),
  ],
  providers: [PasswordService],
  exports: [PasswordService],
})
export class SeedDevModule {}
