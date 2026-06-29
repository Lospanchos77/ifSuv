import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Counter, CounterDocument } from './schemas/counter.schema';

@Injectable()
export class CountersService {
  constructor(
    @InjectModel(Counter.name) private readonly model: Model<CounterDocument>,
  ) {}

  /**
   * Incrémente un compteur atomiquement et retourne la nouvelle valeur.
   * Si le compteur n'existe pas, il est créé à seq=1.
   */
  async next(key: string): Promise<number> {
    const doc = await this.model.findOneAndUpdate(
      { _id: key },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    );
    return doc.seq;
  }

  /**
   * Génère une référence ticket de la forme "T-{year}-{seq}" zero-padded à 4 chars.
   * Le compteur est par année : `ticket-2026`, `ticket-2027`, etc.
   */
  async nextTicketRef(date: Date = new Date()): Promise<string> {
    const year = date.getFullYear();
    const seq = await this.next(`ticket-${year}`);
    return `T-${year}-${String(seq).padStart(4, '0')}`;
  }

  /**
   * Assure que le compteur est au moins à `value`. Utile pour seeds/migrations
   * qui insèrent des refs hardcodés et veulent éviter les collisions futures.
   * `$max` n'écrase jamais une valeur supérieure existante.
   */
  async ensureAtLeast(key: string, value: number): Promise<void> {
    await this.model.findOneAndUpdate(
      { _id: key },
      { $max: { seq: value } },
      { upsert: true },
    );
  }
}
