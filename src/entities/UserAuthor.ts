import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Author } from './Author';
import { User } from './User';

@Index('user_author_author_id_fk', ['authorId'], {})
@Index('user_author_user_id_fk', ['userId'], {})
@Entity('user_author', { schema: 'samik_beach_v3' })
export class UserAuthor {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'user_id' })
  userId: number;

  @Column('int', { name: 'author_id' })
  authorId: number;

  @ManyToOne(() => Author, (author) => author.userAuthors, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'author_id', referencedColumnName: 'id' }])
  author: Author;

  @ManyToOne(() => User, (user) => user.userAuthors, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'id' }])
  user: User;
}
