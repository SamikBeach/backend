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

@Entity('author_original_work', { schema: 'samik_beach_v3' })
export class AuthorOriginalWork {
  @PrimaryGeneratedColumn()
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
