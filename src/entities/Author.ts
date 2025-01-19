import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuthorBook } from './AuthorBook';
import { UserAuthorLike } from './UserAuthorLike';
import { AuthorOriginalWork } from './AuthorOriginalWork';
import { Genre } from './Genre';

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

  @ManyToOne(() => Genre, (genre) => genre.authors)
  @JoinColumn({ name: 'genre_id' })
  genre: Genre;

  @OneToMany(() => AuthorBook, (authorBook) => authorBook.author)
  authorBooks: AuthorBook[];

  @OneToMany(() => UserAuthorLike, (userAuthorLike) => userAuthorLike.author)
  userAuthorLikes: UserAuthorLike[];

  @OneToMany(
    () => AuthorOriginalWork,
    (authorOriginalWork) => authorOriginalWork.author,
  )
  authorOriginalWorks: AuthorOriginalWork[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
