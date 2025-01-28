import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Column,
  Index,
} from 'typeorm';
import { Book } from './Book';
import { OriginalWork } from './OriginalWork';

@Index('book_original_work_book_id_fk', ['bookId'], {})
@Index('book_original_work_original_work_id_fk', ['originalWorkId'], {})
@Index('book_original_work_composite_idx', ['bookId', 'originalWorkId'], {})
@Entity('book_original_work', { schema: 'classicswalk' })
export class BookOriginalWork {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'book_id', nullable: true })
  bookId: number;

  @Column('int', { name: 'original_work_id', nullable: true })
  originalWorkId: number;

  @ManyToOne(() => Book, (book) => book.bookOriginalWorks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @ManyToOne(
    () => OriginalWork,
    (originalWork) => originalWork.bookOriginalWorks,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'original_work_id' })
  originalWork: OriginalWork;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
