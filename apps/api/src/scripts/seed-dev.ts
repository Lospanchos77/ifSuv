import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Role, TicketStatus } from '@ifsuv/shared';
import { Model, Types } from 'mongoose';
import { Company, CompanyDocument } from '../modules/companies/schemas/company.schema';
import { Ticket, TicketDocument } from '../modules/tickets/schemas/ticket.schema';
import { User, UserDocument } from '../modules/users/schemas/user.schema';
import { CountersService } from '../infrastructure/counters/counters.service';
import { PasswordService } from '../modules/auth/services/password.service';
import { SeedDevModule } from './seed-dev.module';

const SHARED_PASSWORD = 'Admin!Pass2026';

interface SeedReport {
  companies: { created: number; existed: number };
  users: { created: number; existed: number };
  tickets: { created: number; existed: number };
  credentials: { email: string; password: string; role: string }[];
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(SeedDevModule, {
    logger: ['log', 'warn', 'error'],
  });

  const companies = app.get<Model<CompanyDocument>>(getModelToken(Company.name));
  const users = app.get<Model<UserDocument>>(getModelToken(User.name));
  const tickets = app.get<Model<TicketDocument>>(getModelToken(Ticket.name));
  const password = app.get(PasswordService);
  const counters = app.get(CountersService);

  const passwordHash = await password.hash(SHARED_PASSWORD);

  const report: SeedReport = {
    companies: { created: 0, existed: 0 },
    users: { created: 0, existed: 0 },
    tickets: { created: 0, existed: 0 },
    credentials: [],
  };

  // --- Companies (3) ---
  const acme = await upsertCompany(companies, 'Acme SAS', { kind: 'COMPANY' }, report);
  const particulier = await upsertCompany(
    companies,
    'Particulier Demo',
    { kind: 'INDIVIDUAL' },
    report,
  );
  await upsertCompany(companies, 'IFSUV Interne', { kind: 'COMPANY' }, report);

  // --- Users (5) ---
  const admin = await upsertUser(
    users,
    'admin@ifsuv.local',
    {
      role: Role.Admin,
      firstName: 'Admin',
      lastName: 'IFSUV',
      passwordHash,
      companyId: null,
    },
    report,
  );
  report.credentials.push({ email: admin.email, password: SHARED_PASSWORD, role: 'ADMIN' });

  const tech1 = await upsertUser(
    users,
    'tech1@ifsuv.local',
    {
      role: Role.Technician,
      firstName: 'Tech',
      lastName: 'Un',
      passwordHash,
      companyId: null,
    },
    report,
  );
  report.credentials.push({ email: tech1.email, password: SHARED_PASSWORD, role: 'TECHNICIAN' });

  const tech2 = await upsertUser(
    users,
    'tech2@ifsuv.local',
    {
      role: Role.Technician,
      firstName: 'Tech',
      lastName: 'Deux',
      passwordHash,
      companyId: null,
    },
    report,
  );
  report.credentials.push({ email: tech2.email, password: SHARED_PASSWORD, role: 'TECHNICIAN' });

  const client1 = await upsertUser(
    users,
    'client1@acme.test',
    {
      role: Role.ClientUser,
      firstName: 'Client',
      lastName: 'Un',
      passwordHash,
      companyId: acme._id,
    },
    report,
  );
  report.credentials.push({ email: client1.email, password: SHARED_PASSWORD, role: 'CLIENT_USER' });

  const client2 = await upsertUser(
    users,
    'client2@acme.test',
    {
      role: Role.ClientUser,
      firstName: 'Client',
      lastName: 'Deux',
      passwordHash,
      companyId: acme._id,
    },
    report,
  );
  report.credentials.push({ email: client2.email, password: SHARED_PASSWORD, role: 'CLIENT_USER' });

  // --- Tickets (5) ---
  const ticketSeeds: Array<{
    ref: string;
    status: TicketStatus;
    assigned: Types.ObjectId;
    company: Types.ObjectId;
    customerName: string;
    problemType: string;
  }> = [
    {
      ref: 'T-2026-0001',
      status: TicketStatus.New,
      assigned: tech1._id,
      company: acme._id,
      customerName: 'Jean Dupont',
      problemType: 'Lenteur générale',
    },
    {
      ref: 'T-2026-0002',
      status: TicketStatus.InProgress,
      assigned: tech1._id,
      company: acme._id,
      customerName: 'Marie Curie',
      problemType: 'Écran bleu au démarrage',
    },
    {
      ref: 'T-2026-0003',
      status: TicketStatus.InProgress,
      assigned: tech2._id,
      company: particulier._id,
      customerName: 'Paul Martin',
      problemType: 'Wifi instable',
    },
    {
      ref: 'T-2026-0004',
      status: TicketStatus.Resolved,
      assigned: tech2._id,
      company: particulier._id,
      customerName: 'Sophie Léger',
      problemType: 'Mot de passe Windows oublié',
    },
    {
      ref: 'T-2026-0005',
      status: TicketStatus.Closed,
      assigned: tech1._id,
      company: acme._id,
      customerName: 'Olivier Roux',
      problemType: 'Migration disque SSD',
    },
  ];

  for (const seed of ticketSeeds) {
    const found = await tickets.findOne({ ref: seed.ref });
    if (found) {
      report.tickets.existed += 1;
    } else {
      await tickets.create({
        ref: seed.ref,
        companyId: seed.company,
        assignedTechId: seed.assigned,
        customerName: seed.customerName,
        problemType: seed.problemType,
        status: seed.status,
      });
      report.tickets.created += 1;
    }
  }

  // Sync les compteurs ticket-{year} avec les refs hardcodés des seeds, sinon
  // les nouveaux tickets créés via l'UI tomberaient sur des collisions E11000.
  await syncTicketCounters(tickets, counters);

  printReport(report);
  await app.close();
}

async function syncTicketCounters(
  tickets: Model<TicketDocument>,
  counters: CountersService,
): Promise<void> {
  const allRefs = await tickets.find({}, { ref: 1 });
  const maxByYear = new Map<string, number>();
  for (const t of allRefs) {
    const match = /^T-(\d{4})-(\d+)$/.exec(t.ref);
    if (!match) continue;
    const year = match[1]!;
    const seq = parseInt(match[2]!, 10);
    const current = maxByYear.get(year) ?? 0;
    if (seq > current) maxByYear.set(year, seq);
  }
  for (const [year, max] of maxByYear) {
    await counters.ensureAtLeast(`ticket-${year}`, max);
    // eslint-disable-next-line no-console
    console.log(`[seed] counter ticket-${year} synced to seq=${max}`);
  }
}

async function upsertCompany(
  companies: Model<CompanyDocument>,
  name: string,
  fields: { kind: 'COMPANY' | 'INDIVIDUAL' },
  report: SeedReport,
): Promise<CompanyDocument> {
  const existing = await companies.findOne({ name });
  if (existing) {
    report.companies.existed += 1;
    return existing;
  }
  const created = await companies.create({ name, ...fields });
  report.companies.created += 1;
  return created;
}

async function upsertUser(
  users: Model<UserDocument>,
  email: string,
  fields: {
    role: Role;
    firstName: string;
    lastName: string;
    passwordHash: string;
    companyId: Types.ObjectId | null;
  },
  report: SeedReport,
): Promise<UserDocument> {
  const existing = await users.findOne({ email });
  if (existing) {
    report.users.existed += 1;
    return existing;
  }
  const created = await users.create({ email, ...fields });
  report.users.created += 1;
  return created;
}

function printReport(report: SeedReport): void {
  /* eslint-disable no-console */
  console.log('');
  console.log('=== Seeds dev IFSUV ===');
  console.log(
    `companies: ${report.companies.created} created, ${report.companies.existed} existed`,
  );
  console.log(`users:     ${report.users.created} created, ${report.users.existed} existed`);
  console.log(
    `tickets:   ${report.tickets.created} created, ${report.tickets.existed} existed`,
  );
  console.log('');
  console.log('--- Credentials ---');
  for (const cred of report.credentials) {
    console.log(`  ${cred.role.padEnd(13)} ${cred.email.padEnd(28)} ${cred.password}`);
  }
  console.log('');
  console.log('Login: http://localhost:5173/login');
  console.log('');
  /* eslint-enable no-console */
}

void main().catch((err) => {
   
  console.error('[seed:dev] failed:', err);
  process.exit(1);
});
