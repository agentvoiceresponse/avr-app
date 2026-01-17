import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Agent } from '../agents/agent.entity';
import { Phone } from '../phones/phone.entity';
import { Trunk } from '../trunks/trunk.entity';

@Entity()
export class PhoneNumber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  value: string;

  @Column({ type: 'text', default: 'agent' })
  application: 'agent' | 'internal' | 'transfer';

  @Column({ type: 'boolean', default: true })
  denoiseEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  recordingEnabled: boolean;

  @ManyToOne(() => Agent, (agent) => agent.numbers, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'agent_id' })
  agent?: Agent | null;

  @ManyToOne(() => Phone, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'phone_id' })
  phone?: Phone | null;

  @ManyToOne(() => Trunk, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'trunk_id' })
  trunk?: Trunk | null;
}
