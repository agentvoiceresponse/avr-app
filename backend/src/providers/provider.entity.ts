import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum ProviderType {
  ASR = 'ASR',
  LLM = 'LLM',
  TTS = 'TTS',
  STS = 'STS',
}

@Entity()
export class Provider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  type: ProviderType;

  @Column({ unique: true })
  name: string;

  @Column('simple-json', { nullable: true })
  config: Record<string, any> | null;
}
