import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Review } from './Review';
import { User } from './User';

@Index('user_review_user_id_fk', ['userId'], {})
@Index('user_review_review_id_fk', ['reviewId'], {})
@Entity('user_review_like', { schema: 'classicswalk' })
export class UserReviewLike {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'user_id' })
  userId: number;

  @Column('int', { name: 'review_id' })
  reviewId: number;

  @ManyToOne(() => Review, (review) => review.userReviewLikes, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'review_id', referencedColumnName: 'id' }])
  review: Review;

  @ManyToOne(() => User, (user) => user.userReviewLikes, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'id' }])
  user: User;
}
