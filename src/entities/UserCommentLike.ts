import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './User';
import { Comment } from './Comment';

@Index('user_comment_user_id_fk', ['userId'], {})
@Index('user_comment_comment_id_fk', ['commentId'], {})
@Entity('user_comment_like', { schema: 'classicswalk' })
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

  @ManyToOne(() => Comment, (comment) => comment.userCommentLikes, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'comment_id', referencedColumnName: 'id' }])
  comment: Comment;
}
