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

@Entity()
export class OriginalWork {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 200 })
  title: string;

  @Column('varchar', { length: 200, nullable: true })
  titleInEng: string;

  @Column('varchar', { length: 200, nullable: true })
  titleInKor: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('text', { nullable: true })
  publicationDate: string;

  @Column('tinyint', { width: 1, nullable: true })
  publicationDateIsBc: boolean;

  @Column('tinyint', { width: 1, default: false })
  posthumous: boolean;

  @Column('tinyint', { width: 1, default: false })
  circa: boolean;

  @Column('tinyint', { width: 1, default: false })
  century: boolean;

  @Column('tinyint', { width: 1, default: false })
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
