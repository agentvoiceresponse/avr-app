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
  ERROR = 'error',
  STARTING = 'starting',
  STOPPING = 'stopping',
}

export enum AgentFailureStatus {
  NONE = 'none',
  RETRYABLE = 'retryable',
  TERMINAL = 'terminal',
}

export enum AgentFailureReason {
  NONE = 'none',
  DEPENDENCY_UNAVAILABLE = 'dependency_unavailable',
  COMPENSATION_FAILED = 'compensation_failed',
  CONFIGURATION_INVALID = 'configuration_invalid',
  UNKNOWN = 'unknown',
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

  @Column({ type: 'integer', nullable: true })
  httpPort: number;

  @Column({ type: 'text', default: AgentMode.PIPELINE })
  mode: AgentMode;

  @Column({ type: 'text', nullable: true })
  lastError?: string | null;

  @Column({ type: 'text', default: AgentFailureStatus.NONE })
  failureStatus: AgentFailureStatus;

  @Column({ type: 'text', nullable: true })
  failureReason?: AgentFailureReason | null;

  @Column({ type: 'boolean', nullable: true })
  retryable?: boolean | null;

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
