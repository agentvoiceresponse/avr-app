import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Recording {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  callUuid: string;

  @Column()
  filename: string;

  @Column({ type: 'integer' })
  sizeBytes: number;

  @Column({ type: 'datetime' })
  recordedAt: Date;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
