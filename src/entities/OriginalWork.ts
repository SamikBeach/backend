import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AuthorOriginalWork } from './AuthorOriginalWork';
import { BookOriginalWork } from './BookOriginalWork';

@Entity('original_work', { schema: 'samik_beach_v3' })
export class OriginalWork {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'title', length: 200 })
  title: string;

  @Column('varchar', { name: 'title_in_eng', length: 200, nullable: true })
  titleInEng: string;

  @Column('varchar', { name: 'title_in_kor', length: 200, nullable: true })
  titleInKor: string;

  @Column('text', { name: 'publication_date', nullable: true })
  publicationDate: string;

  @Column('tinyint', {
    name: 'publication_date_is_bc',
    width: 1,
    default: false,
  })
  publicationDateIsBc: boolean;

  @Column('tinyint', { name: 'posthumous', width: 1, default: false })
  posthumous: boolean;

  @Column('tinyint', { name: 'circa', width: 1, default: false })
  circa: boolean;

  @Column('tinyint', { name: 'century', width: 1, default: false })
  century: boolean;

  @Column('tinyint', { name: 's', width: 1, default: false })
  s: boolean;

  @OneToMany(
    () => AuthorOriginalWork,
    (authorOriginalWork) => authorOriginalWork.originalWork,
  )
  authorOriginalWorks: AuthorOriginalWork[];

  @OneToMany(
    () => BookOriginalWork,
    (bookOriginalWork) => bookOriginalWork.originalWork,
  )
  bookOriginalWorks: BookOriginalWork[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
