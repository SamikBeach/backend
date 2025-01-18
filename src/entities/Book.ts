import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { AuthorBook } from './AuthorBook';
import { Review } from './Review';
import { UserBookLike } from './UserBookLike';
import { Author } from './Author';
import { BookOriginalWork } from './BookOriginalWork';

@Entity('book', { schema: 'samik_beach_v3' })
export class Book {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'title', length: 200 })
  title: string;

  @Column('text', { name: 'image_url', nullable: true })
  imageUrl: string | null;

  @Column('varchar', { name: 'publisher', nullable: true, length: 200 })
  publisher: string | null;

  @Column('text', { name: 'publication_date', nullable: true })
  publicationDate: string | null;

  @Column('varchar', { name: 'isbn', nullable: true, length: 100 })
  isbn: string | null;

  @Column('varchar', { name: 'isbn13', nullable: true, length: 100 })
  isbn13: string | null;

  @Column('int', { name: 'like_count', default: () => "'0'" })
  likeCount: number;

  @Column('int', { name: 'review_count', default: () => "'0'" })
  reviewCount: number;

  @OneToMany(() => AuthorBook, (authorBook) => authorBook.book)
  authorBooks: AuthorBook[];

  @OneToMany(() => Review, (review) => review.book)
  reviews: Review[];

  @OneToMany(() => UserBookLike, (userBookLike) => userBookLike.book)
  userBookLikes: UserBookLike[];

  @ManyToOne(() => Author, (author) => author.books)
  author: Author;

  @OneToMany(
    () => BookOriginalWork,
    (bookOriginalWork) => bookOriginalWork.book,
  )
  bookOriginalWorks: BookOriginalWork[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
