import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Book } from './Book';
import { Author } from './Author';

@Index('author_book_book_id_fk', ['bookId'], {})
@Index('author_book_author_id_fk', ['authorId'], {})
@Entity('author_book', { schema: 'classicswalk' })
export class AuthorBook {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'author_id' })
  authorId: number;

  @Column('int', { name: 'book_id' })
  bookId: number;

  @ManyToOne(() => Book, (book) => book.authorBooks, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'book_id', referencedColumnName: 'id' }])
  book: Book;

  @ManyToOne(() => Author, (author) => author.authorBooks, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'author_id', referencedColumnName: 'id' }])
  author: Author;
}
