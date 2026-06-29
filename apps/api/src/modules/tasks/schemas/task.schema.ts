import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type TaskDocument = HydratedDocument<Task>;

@Schema({ _id: true })
class TaskComment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  text!: string;

  @Prop({ type: Date, default: Date.now })
  at!: Date;
}
const TaskCommentSchema = SchemaFactory.createForClass(TaskComment);

@Schema({ timestamps: true, collection: 'tasks' })
export class Task {
  @Prop({ type: Types.ObjectId, ref: 'Company', index: true })
  companyId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  assigneeUserId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop()
  description?: string;

  @Prop({
    type: String,
    required: true,
    enum: ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'],
    default: 'TODO',
  })
  status!: TaskStatus;

  @Prop({
    type: String,
    required: true,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL',
  })
  priority!: TaskPriority;

  @Prop({ type: [TaskCommentSchema], default: [] })
  comments!: TaskComment[];

  @Prop({ index: { sparse: true } })
  legacyId?: number;

  @Prop()
  dueAt?: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
TaskSchema.index({ assigneeUserId: 1, status: 1 });
