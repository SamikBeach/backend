import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Comment } from './Comment';
import { Review } from './Review';
import { UserAuthor } from './UserAuthor';
import { UserBook } from './UserBook';

@Entity('user', { schema: 'samik_beach_v3' })
export class User {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'email', length: 100 })
  email: string;

  @Column('varchar', { name: 'nickname', length: 100 })
  nickname: string;

  @Column('int', { name: 'verification_code', nullable: true })
  verificationCode: number | null;

  @Column('varchar', { name: 'password', length: 200 })
  password: string;

  @Column('tinyint', { name: 'verified', width: 1 })
  verified: boolean;

  @Column('datetime', { name: 'created_at' })
  createdAt: Date;

  @Column('datetime', { name: 'updated_at', nullable: true })
  updatedAt: Date | null;

  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];

  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];

  @OneToMany(() => UserAuthor, (userAuthor) => userAuthor.user)
  userAuthors: UserAuthor[];

  @OneToMany(() => UserBook, (userBook) => userBook.user)
  userBooks: UserBook[];
}
