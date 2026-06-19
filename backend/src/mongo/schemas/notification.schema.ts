import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ collection: 'notifications' })
export class Notification {
  @Prop({ type: String, required: true, index: true })
  userId!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: true })
  body!: string;

  @Prop({ type: Boolean, default: false })
  read!: boolean;

  @Prop({ type: Date, default: () => new Date() })
  createdAt!: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
