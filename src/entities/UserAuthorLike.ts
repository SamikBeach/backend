import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './User';
import { Author } from './Author';

@Index('user_author_user_id_fk', ['userId'], {})
@Index('user_author_author_id_fk', ['authorId'], {})
@Entity('user_author_like', { schema: 'samik_beach_v3' })
export class UserAuthorLike {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'user_id' })
  userId: number;

  @Column('int', { name: 'author_id' })
  authorId: number;

  @ManyToOne(() => User, (user) => user.userAuthorLikes, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'id' }])
  user: User;

  @ManyToOne(() => Author, (author) => author.userAuthorLikes, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'author_id', referencedColumnName: 'id' }])
  author: Author;
}
