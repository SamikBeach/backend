import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Author } from './Author';
import { OriginalWork } from './OriginalWork';

@Entity('author_original_work', { schema: 'classicswalk' })
export class AuthorOriginalWork {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @ManyToOne(() => Author, (author) => author.authorOriginalWorks)
  @JoinColumn({ name: 'author_id' })
  author: Author;

  @ManyToOne(
    () => OriginalWork,
    (originalWork) => originalWork.authorOriginalWorks,
  )
  @JoinColumn({ name: 'original_work_id' })
  originalWork: OriginalWork;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
