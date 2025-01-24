import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Review } from './Review';
import { User } from './User';
import { UserCommentLike } from './UserCommentLike';

@Index('comment_user_id_fk', ['userId'], {})
@Index('comment_review_id_fk', ['reviewId'], {})
@Entity('comment', { schema: 'classicswalk' })
export class Comment {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('text', { name: 'content' })
  content: string;

  @Column('int', { name: 'like_count', default: () => "'0'" })
  likeCount: number;

  @Column('int', { name: 'review_id' })
  reviewId: number;

  @Column('int', { name: 'user_id' })
  userId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date | null;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => Review, (review) => review.comments, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'review_id', referencedColumnName: 'id' }])
  review: Review;

  @ManyToOne(() => User, (user) => user.comments, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'id' }])
  user: User;

  @OneToMany(
    () => UserCommentLike,
    (userCommentLike) => userCommentLike.comment,
  )
  userCommentLikes: UserCommentLike[];
}
