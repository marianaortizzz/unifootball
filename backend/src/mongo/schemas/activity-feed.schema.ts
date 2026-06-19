import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ActivityFeedDocument = HydratedDocument<ActivityFeed>;

@Schema({ collection: 'activity_feed' })
export class ActivityFeed {
  @Prop({ type: String, required: true, index: true })
  tournamentId!: string;

  @Prop({ type: String, required: true })
  type!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: true })
  description!: string;

  @Prop({ type: Date, default: () => new Date() })
  createdAt!: Date;
}

export const ActivityFeedSchema = SchemaFactory.createForClass(ActivityFeed);
