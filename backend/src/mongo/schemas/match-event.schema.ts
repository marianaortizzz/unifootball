import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum MatchEventType {
  GOAL = 'goal',
  YELLOW_CARD = 'yellow_card',
  RED_CARD = 'red_card',
  SUBSTITUTION = 'substitution',
}

export type MatchEventDocument = HydratedDocument<MatchEvent>;

@Schema({ collection: 'match_events' })
export class MatchEvent {
  @Prop({ type: String, required: true, index: true })
  matchId!: string;

  @Prop({ type: String, enum: Object.values(MatchEventType), required: true })
  type!: MatchEventType;

  @Prop({ type: Number, required: true })
  minute!: number;

  @Prop({ type: String, required: true })
  playerId!: string;

  @Prop({ type: String, required: true })
  teamId!: string;

  @Prop({ type: String, default: null })
  description!: string | null;

  @Prop({ type: Date, default: () => new Date() })
  createdAt!: Date;
}

export const MatchEventSchema = SchemaFactory.createForClass(MatchEvent);
