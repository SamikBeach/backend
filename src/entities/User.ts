import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  DeleteDateColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude, Expose } from 'class-transformer';
import { Comment } from './Comment';
import { Review } from './Review';
import { UserAuthorLike } from './UserAuthorLike';
import { UserBookLike } from './UserBookLike';
import { UserCommentLike } from './UserCommentLike';
import { UserReviewLike } from './UserReviewLike';

@Entity('user', { schema: 'samik_beach_v3' })
export class User {
  @Expose()
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Expose()
  @Column('varchar', { name: 'email', length: 100 })
  email: string;

  @Expose()
  @Column('varchar', { name: 'nickname', length: 100 })
  nickname: string;

  @Exclude()
  @Column('varchar', { name: 'password', length: 200 })
  password: string;

  @Exclude()
  @Column('tinyint', {
    name: 'verified',
    width: 1,
    transformer: {
      to: (value: boolean) => (value ? 1 : 0),
      from: (value: number) => Boolean(value),
    },
  })
  verified: boolean;

  @Exclude()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Exclude()
  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date | null;

  @Exclude()
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @Exclude()
  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];

  @Exclude()
  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];

  @Exclude()
  @OneToMany(() => UserAuthorLike, (userAuthorLike) => userAuthorLike.user)
  userAuthorLikes: UserAuthorLike[];

  @Exclude()
  @OneToMany(() => UserBookLike, (userBookLike) => userBookLike.user)
  userBookLikes: UserBookLike[];

  @Exclude()
  @OneToMany(() => UserCommentLike, (userCommentLike) => userCommentLike.user)
  userCommentLikes: UserCommentLike[];

  @Exclude()
  @OneToMany(() => UserReviewLike, (userReviewLike) => userReviewLike.user)
  userReviewLikes: UserReviewLike[];
}
