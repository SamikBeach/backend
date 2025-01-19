import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Book } from './Book';
import { Author } from './Author';

@Entity('genre', { schema: 'samik_beach_v3' })
export class Genre {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'genre', length: 200 })
  genre: string;

  @Column('varchar', { name: 'genre_in_kor', length: 200 })
  genreInKor: string;

  @OneToMany(() => Book, (book) => book.genre)
  books: Book[];

  @OneToMany(() => Author, (author) => author.genre)
  authors: Author[];
}
