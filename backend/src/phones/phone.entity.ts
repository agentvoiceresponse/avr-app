import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Phone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', default: '' })
  fullName: string;

  @Column()
  password: string;
}
