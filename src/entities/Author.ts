import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AuthorBook } from './AuthorBook';
import { UserAuthorLike } from './UserAuthorLike';
import { Book } from './Book';
import { AuthorOriginalWork } from './AuthorOriginalWork';

@Entity('author', { schema: 'samik_beach_v3' })
export class Author {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'name', length: 200 })
  name: string;

  @Column('varchar', { name: 'name_in_kor', length: 200 })
  nameInKor: string;

  @Column('text', { name: 'image_url', nullable: true })
  imageUrl: string | null;

  @Column('text', { name: 'born_date', nullable: true })
  bornDate: string | null;

  @Column('tinyint', { name: 'born_date_is_bc', width: 1, nullable: true })
  bornDateIsBc: boolean | null;

  @Column('text', { name: 'died_date', nullable: true })
  diedDate: string | null;

  @Column('tinyint', { name: 'died_date_is_bc', width: 1, nullable: true })
  diedDateIsBc: boolean | null;

  @Column('int', { name: 'era_id', nullable: true })
  eraId: number | null;

  @Column('int', { name: 'like_count', default: () => "'0'" })
  likeCount: number;

  @Column('int', { name: 'review_count', default: () => "'0'" })
  reviewCount: number;

  @OneToMany(() => AuthorBook, (authorBook) => authorBook.author)
  authorBooks: AuthorBook[];

  @OneToMany(() => UserAuthorLike, (userAuthorLike) => userAuthorLike.author)
  userAuthorLikes: UserAuthorLike[];

  @OneToMany(() => Book, (book) => book.author)
  books: Book[];

  @OneToMany(
    () => AuthorOriginalWork,
    (authorOriginalWork) => authorOriginalWork.author,
  )
  authorOriginalWorks: AuthorOriginalWork[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
