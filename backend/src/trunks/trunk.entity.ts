import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Trunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  password: string;
}
