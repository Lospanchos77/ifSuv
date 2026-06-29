import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model, connect } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CountersService } from './counters.service';
import { CounterDocument, CounterSchema } from './schemas/counter.schema';

describe('CountersService', () => {
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let model: Model<CounterDocument>;
  let service: CountersService;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const mongoose = await connect(mongod.getUri());
    connection = mongoose.connection;
    model = connection.model('Counter', CounterSchema) as unknown as Model<CounterDocument>;
    service = new CountersService(model);
  });

  afterAll(async () => {
    await connection.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    await model.deleteMany({});
  });

  it('next() incrémente atomiquement à partir de 1', async () => {
    expect(await service.next('test')).toBe(1);
    expect(await service.next('test')).toBe(2);
    expect(await service.next('test')).toBe(3);
  });

  it('next() avec clés différentes = compteurs indépendants', async () => {
    expect(await service.next('a')).toBe(1);
    expect(await service.next('b')).toBe(1);
    expect(await service.next('a')).toBe(2);
  });

  it('nextTicketRef() format T-YYYY-XXXX', async () => {
    const date = new Date('2026-01-15');
    const ref = await service.nextTicketRef(date);
    expect(ref).toBe('T-2026-0001');
    const ref2 = await service.nextTicketRef(date);
    expect(ref2).toBe('T-2026-0002');
  });

  it('nextTicketRef() pad à 4 chiffres', async () => {
    const date = new Date('2026-06-01');
    for (let i = 0; i < 9; i++) {
      await service.nextTicketRef(date);
    }
    const ref10 = await service.nextTicketRef(date);
    expect(ref10).toBe('T-2026-0010');
  });

  it('nextTicketRef() avec années différentes = compteurs séparés', async () => {
    const ref2026 = await service.nextTicketRef(new Date('2026-12-31'));
    const ref2027 = await service.nextTicketRef(new Date('2027-01-01'));
    expect(ref2026).toBe('T-2026-0001');
    expect(ref2027).toBe('T-2027-0001');
  });
});
