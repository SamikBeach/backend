import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './User';
import { Review } from './Review';

@Index('user_comment_user_id_fk', ['userId'], {})
@Index('user_comment_review_id_fk', ['commentId'], {})
@Entity('user_comment_like', { schema: 'samik_beach_v3' })
export class UserCommentLike {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column('int', { name: 'user_id' })
  userId: number;

  @Column('int', { name: 'comment_id' })
  commentId: number;

  @ManyToOne(() => User, (user) => user.userCommentLikes, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'id' }])
  user: User;

  @ManyToOne(() => Review, (review) => review.userCommentLikes, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'comment_id', referencedColumnName: 'id' }])
  comment: Review;
}
