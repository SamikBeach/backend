import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  DeleteDateColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Comment } from './Comment';
import { Review } from './Review';
import { UserAuthorLike } from './UserAuthorLike';
import { UserBookLike } from './UserBookLike';
import { UserCommentLike } from './UserCommentLike';
import { UserReviewLike } from './UserReviewLike';

@Entity('user', { schema: 'samik_beach_v3' })
export class User {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('varchar', { name: 'email', length: 100 })
  email: string;

  @Column('varchar', { name: 'nickname', length: 100 })
  nickname: string;

  @Column('varchar', { name: 'password', length: 200 })
  password: string;

  @Column('tinyint', {
    name: 'verified',
    width: 1,
    transformer: {
      to: (value: boolean) => (value ? 1 : 0),
      from: (value: number) => Boolean(value),
    },
  })
  verified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date | null;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];

  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];

  @OneToMany(() => UserAuthorLike, (userAuthorLike) => userAuthorLike.user)
  userAuthorLikes: UserAuthorLike[];

  @OneToMany(() => UserBookLike, (userBookLike) => userBookLike.user)
  userBookLikes: UserBookLike[];

  @OneToMany(() => UserCommentLike, (userCommentLike) => userCommentLike.user)
  userCommentLikes: UserCommentLike[];

  @OneToMany(() => UserReviewLike, (userReviewLike) => userReviewLike.user)
  userReviewLikes: UserReviewLike[];
}
