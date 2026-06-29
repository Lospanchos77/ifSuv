import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Role } from '@ifsuv/shared';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({
    type: String,
    required: true,
    enum: [Role.Admin, Role.Technician, Role.ClientUser],
    default: Role.ClientUser,
  })
  role!: Role;

  @Prop({ type: Types.ObjectId, ref: 'Company', default: null, index: true })
  companyId!: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop()
  phone?: string;

  @Prop()
  teamviewerId?: string;

  @Prop()
  systemInfo?: string;

  @Prop()
  notes?: string;

  @Prop({ default: false })
  mustResetPassword!: boolean;

  @Prop({ index: { sparse: true } })
  legacyId?: number;

  @Prop({ index: { sparse: true } })
  deletedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', function preSave(next) {
  if (this.email) {
    this.email = this.email.trim().toLowerCase();
  }
  next();
});
