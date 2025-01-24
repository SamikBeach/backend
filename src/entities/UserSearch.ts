import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './User';
import { Book } from './Book';
import { Author } from './Author';

@Entity('user_search', { schema: 'classicswalk' })
export class UserSearch {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'book_id', nullable: true })
  bookId: number | null;

  @Column('int', { name: 'author_id', nullable: true })
  authorId: number | null;

  @Column('int', { name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Book, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @ManyToOne(() => Author, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'author_id' })
  author: Author;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
