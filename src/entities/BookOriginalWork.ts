import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Book } from './Book';
import { OriginalWork } from './OriginalWork';

@Entity('book_original_work', { schema: 'samik_beach_v3' })
export class BookOriginalWork {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Book, (book) => book.bookOriginalWorks)
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @ManyToOne(
    () => OriginalWork,
    (originalWork) => originalWork.bookOriginalWorks,
  )
  @JoinColumn({ name: 'original_work_id' })
  originalWork: OriginalWork;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
