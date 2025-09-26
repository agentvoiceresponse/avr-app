import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { CallEvent } from './call-event.entity';

@Entity()
export class Call {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  uuid: string;

  @Column({ nullable: true })
  agentId?: string | null;

  @Column({ type: 'datetime', nullable: true })
  startedAt?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  endedAt?: Date | null;

  @OneToMany(() => CallEvent, (event) => event.call, { cascade: true })
  events: CallEvent[];
}
