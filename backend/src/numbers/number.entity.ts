import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Agent } from '../agents/agent.entity';

@Entity()
export class PhoneNumber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  value: string;

  @ManyToOne(() => Agent, (agent) => agent.numbers, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;
}
