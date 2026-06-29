import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TodoStatus = 'OPEN' | 'DONE' | 'CANCELLED';
export type TodoPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type TodoDocument = HydratedDocument<Todo>;

@Schema({ timestamps: true, collection: 'todos' })
export class Todo {
  @Prop({ type: Types.ObjectId, ref: 'Company', index: true })
  companyId?: Types.ObjectId;

  @Prop({ required: true })
  description!: string;

  @Prop({
    type: String,
    required: true,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL',
  })
  priority!: TodoPriority;

  @Prop()
  deadline?: Date;

  @Prop({
    type: String,
    required: true,
    enum: ['OPEN', 'DONE', 'CANCELLED'],
    default: 'OPEN',
  })
  status!: TodoStatus;

  @Prop({ index: { sparse: true } })
  legacyId?: number;
}

export const TodoSchema = SchemaFactory.createForClass(Todo);
