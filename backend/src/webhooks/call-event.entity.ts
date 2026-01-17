import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Call } from './call.entity';

export type WebhookEventType =
  | 'call_initiated'
  | 'call_started'
  | 'call_ended'
  | 'interruption'
  | 'transcription'
  | 'dtmf_digit';

@Entity()
export class CallEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Call, (call) => call.events, { onDelete: 'CASCADE' })
  call: Call;

  @Column({ type: 'text' })
  type: WebhookEventType;

  @Column({ type: 'datetime' })
  timestamp: Date;

  @Column({ type: 'simple-json', nullable: true })
  payload?: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'datetime' })
  receivedAt: Date;
}
