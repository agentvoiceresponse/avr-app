import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Provider } from '../providers/provider.entity';
import { PhoneNumber } from '../numbers/number.entity';

export enum AgentStatus {
  RUNNING = 'running',
  STOPPED = 'stopped',
}

export enum AgentMode {
  PIPELINE = 'pipeline',
  STS = 'sts',
}

@Entity()
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', default: AgentStatus.STOPPED })
  status: AgentStatus;

  @Column({ type: 'integer', nullable: true })
  port: number;

  @Column({ type: 'text', default: AgentMode.PIPELINE })
  mode: AgentMode;

  @ManyToOne(() => Provider, { nullable: true, eager: true })
  @JoinColumn({ name: 'provider_asr_id' })
  providerAsr?: Provider | null;

  @ManyToOne(() => Provider, { nullable: true, eager: true })
  @JoinColumn({ name: 'provider_llm_id' })
  providerLlm?: Provider | null;

  @ManyToOne(() => Provider, { nullable: true, eager: true })
  @JoinColumn({ name: 'provider_tts_id' })
  providerTts?: Provider | null;

  @ManyToOne(() => Provider, { nullable: true, eager: true })
  @JoinColumn({ name: 'provider_sts_id' })
  providerSts?: Provider | null;

  @OneToMany(() => PhoneNumber, (number) => number.agent)
  numbers?: PhoneNumber[];
}
