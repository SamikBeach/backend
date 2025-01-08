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

@Index('user_comment_review_id_fk', ['reviewId'], {})
@Index('user_comment_user_id_fk', ['userId'], {})
@Entity('user_comment', { schema: 'samik_beach_v3' })
export class UserComment {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'user_id' })
  userId: number;

  @Column('int', { name: 'review_id' })
  reviewId: number;

  @ManyToOne(() => Review, (review) => review.userComments, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'review_id', referencedColumnName: 'id' }])
  review: Review;

  @ManyToOne(() => User, (user) => user.userComments, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'id' }])
  user: User;
}
