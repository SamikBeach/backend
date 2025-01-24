import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('era', { schema: 'classicswalk' })
export class Era {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'era', length: 200 })
  era: string;

  @Column('varchar', { name: 'era_in_kor', length: 200 })
  eraInKor: string;
}
