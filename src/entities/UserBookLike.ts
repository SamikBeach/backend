import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Book } from './Book';
import { User } from './User';

@Index('user_book_user_id_fk', ['userId'], {})
@Index('user_book_book_id_fk', ['bookId'], {})
@Entity('user_book_like', { schema: 'classicswalk' })
export class UserBookLike {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'user_id' })
  userId: number;

  @Column('int', { name: 'book_id' })
  bookId: number;

  @ManyToOne(() => Book, (book) => book.userBookLikes, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'book_id', referencedColumnName: 'id' }])
  book: Book;

  @ManyToOne(() => User, (user) => user.userBookLikes, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'id' }])
  user: User;
}
