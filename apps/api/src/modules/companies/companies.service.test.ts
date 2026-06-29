import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model, connect } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CompaniesService } from './companies.service';
import { CompanyDocument, CompanySchema } from './schemas/company.schema';

describe('CompaniesService', () => {
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let model: Model<CompanyDocument>;
  let service: CompaniesService;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const mongoose = await connect(mongod.getUri());
    connection = mongoose.connection;
    model = connection.model('Company', CompanySchema) as unknown as Model<CompanyDocument>;
    service = new CompaniesService(model);
  });

  afterAll(async () => {
    await connection.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    await model.deleteMany({});
  });

  it('create + findById round-trip', async () => {
    const created = await service.create({ kind: 'COMPANY', name: 'Acme SAS' });
    expect(created.id).toBeDefined();
    expect(created.name).toBe('Acme SAS');

    const fetched = await service.findById(created.id);
    expect(fetched.id).toBe(created.id);
    expect(fetched.name).toBe('Acme SAS');
  });

  it('list paginé filtré par kind', async () => {
    await service.create({ kind: 'COMPANY', name: 'Acme' });
    await service.create({ kind: 'COMPANY', name: 'Beta Corp' });
    await service.create({ kind: 'INDIVIDUAL', name: 'Mr Particulier' });

    const compResult = await service.list({ kind: 'COMPANY', page: 1, pageSize: 20 });
    expect(compResult.total).toBe(2);
    expect(compResult.items.every((c) => c.kind === 'COMPANY')).toBe(true);

    const indivResult = await service.list({
      kind: 'INDIVIDUAL',
      page: 1,
      pageSize: 20,
    });
    expect(indivResult.total).toBe(1);
  });

  it('list cherche par nom (case-insensitive)', async () => {
    await service.create({ kind: 'COMPANY', name: 'Acme SAS' });
    await service.create({ kind: 'COMPANY', name: 'Beta Corp' });

    const result = await service.list({ q: 'acme', page: 1, pageSize: 20 });
    expect(result.total).toBe(1);
    expect(result.items[0]?.name).toBe('Acme SAS');
  });

  it('update modifie les champs fournis', async () => {
    const created = await service.create({ kind: 'COMPANY', name: 'Old Name' });
    const updated = await service.update(created.id, {
      name: 'New Name',
      city: 'Paris',
    });
    expect(updated.name).toBe('New Name');
    expect(updated.city).toBe('Paris');
    expect(updated.kind).toBe('COMPANY'); // inchangé
  });

  it('softDelete supprime', async () => {
    const created = await service.create({ kind: 'COMPANY', name: 'Doomed' });
    await service.softDelete(created.id);
    await expect(service.findById(created.id)).rejects.toThrow(/introuvable/);
  });

  it('findById sur id inexistant → 404', async () => {
    await expect(service.findById('0123456789abcdef01234567')).rejects.toThrow(
      /introuvable/,
    );
  });
});
