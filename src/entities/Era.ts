import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Author } from './Author';

@Entity('era', { schema: 'classicswalk' })
export class Era {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'era', length: 200 })
  era: string;

  @Column('varchar', { name: 'era_in_kor', length: 200 })
  eraInKor: string;

  @OneToMany(() => Author, (author) => author.era)
  authors: Author[];
}
